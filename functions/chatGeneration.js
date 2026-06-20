const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { inferCapabilities } = require('./providerConfig')
const {
    PROVIDERS,
    isAllowedModel,
    isPlausibleModelId,
    sanitizeModelId,
    resolveRequestModel
} = require('./modelCatalog')
const openaiProvider = require('./providers/openaiProvider')
const anthropicProvider = require('./providers/anthropicProvider')
const geminiProvider = require('./providers/geminiProvider')
const mistralProvider = require('./providers/mistralProvider')
const { generateChatTitle, deriveHeuristicTitle } = require('./providers/chatTitle')
const { computeTurnCost } = require('./usageCost')

const providerAdapters = {
    openai: openaiProvider,
    anthropic: anthropicProvider,
    google: geminiProvider,
    mistral: mistralProvider
}

const FLUSH_INTERVAL_MS = 400

const omitUndefinedKeys = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

const sumChatCostUsd = (messages) => {
    if (!Array.isArray(messages)) return 0
    return messages.reduce((sum, message) => {
        if (message?.role !== 'system') return sum
        const cost = typeof message.costUsd === 'number' ? message.costUsd : 0
        return sum + cost
    }, 0)
}

const createFallbackTitle = (messages) => {
    const lastUser = [...(messages || [])].reverse().find((m) => m?.role === 'user')
    const seed = typeof lastUser?.content === 'string' ? lastUser.content.trim() : ''
    if (!seed && Array.isArray(lastUser?.attachments) && lastUser.attachments.length) {
        const names = lastUser.attachments.map((a) => a.name).filter(Boolean).join(', ')
        if (names) return names.length <= 48 ? names : `${names.slice(0, 45)}…`
    }
    const heuristic = deriveHeuristicTitle(seed)
    if (heuristic) return heuristic
    if (!seed) return 'New chat'
    const trimmed = seed.replace(/\s+/g, ' ')
    if (trimmed.length <= 48) return trimmed
    return `${trimmed.slice(0, 45)}…`
}

const toPipelineMessages = (messages) => (Array.isArray(messages) ? messages : [])
    .filter((message) => {
        if (!message || !['user', 'system'].includes(message.role)) return false
        const text = typeof message.content === 'string' ? message.content.trim() : ''
        if (message.role === 'system') return text.length > 0
        const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0
        return text.length > 0 || hasAttachments
    })
    .map((message) => ({
        role: message.role,
        content: typeof message.content === 'string' ? message.content : ''
    }))

const mergeAttachmentsNonOpenAI = (messages, attachmentParts) => {
    if (!attachmentParts?.length) return messages
    let suffix = ''
    attachmentParts.forEach((ap) => {
        if (ap.kind === 'image') {
            suffix += `\n[Image: ${ap.name} — describe it based on the provided context.]`
        } else if (ap.kind === 'text' && ap.text) {
            suffix += `\n\n--- ${ap.name} ---\n${ap.text}`
        } else if (ap.note) {
            suffix += `\n${ap.note}`
        }
    })
    const out = [...messages]
    for (let i = out.length - 1; i >= 0; i -= 1) {
        if (out[i].role === 'user') {
            out[i] = {
                ...out[i],
                content: `${out[i].content || ''}${suffix}`
            }
            break
        }
    }
    return out
}

const getLegacyOpenAi = (userData) => {
    const legacy = userData?.openAi
    if (!legacy?.openaiKey?.trim()) return null
    return {
        apiKey: legacy.openaiKey.trim(),
        model: legacy.model
    }
}

const getProviderRow = (userData, providerId) => {
    const row = userData?.providers?.[providerId]
    if (row?.apiKey?.trim()) {
        return {
            apiKey: row.apiKey.trim(),
            model: row.model
        }
    }
    if (providerId === 'openai') {
        return getLegacyOpenAi(userData)
    }
    return null
}

const resolveProviderCredentials = (userData, providerId, requestedModel) => {
    const row = getProviderRow(userData, providerId)
    if (!row) {
        return {
            apiKey: '',
            model: sanitizeModelId(providerId, requestedModel)
        }
    }
    return {
        apiKey: row.apiKey,
        model: resolveRequestModel(providerId, requestedModel || row.model)
    }
}

const createThrottledWriter = (chatRef) => {
    let lastFlushAt = 0
    let flushTimer = null
    let pendingPayload = null

    const flushNow = async () => {
        if (!pendingPayload) return
        const payload = pendingPayload
        pendingPayload = null
        lastFlushAt = Date.now()
        await chatRef.update({
            ...payload,
            lastUpdated: FieldValue.serverTimestamp()
        })
    }

    const schedule = (payload) => {
        pendingPayload = { ...pendingPayload, ...payload }
        const elapsed = Date.now() - lastFlushAt
        if (elapsed >= FLUSH_INTERVAL_MS) {
            if (flushTimer) {
                clearTimeout(flushTimer)
                flushTimer = null
            }
            return flushNow()
        }
        if (flushTimer) return Promise.resolve()
        return new Promise((resolve) => {
            flushTimer = setTimeout(() => {
                flushTimer = null
                flushNow().then(resolve).catch(resolve)
            }, FLUSH_INTERVAL_MS - elapsed)
        })
    }

    const flushFinal = async (payload) => {
        if (flushTimer) {
            clearTimeout(flushTimer)
            flushTimer = null
        }
        pendingPayload = { ...pendingPayload, ...payload }
        await flushNow()
    }

    return { schedule, flushFinal }
}

const runChatGeneration = async (chatId) => {
    const db = admin.firestore()
    const chatRef = db.collection('chats').doc(chatId)

    let chatData
    let requestId
    let priorMessages
    let userMessage
    let pendingGeneration

    try {
        await db.runTransaction(async (transaction) => {
            const snap = await transaction.get(chatRef)
            if (!snap.exists) {
                throw new Error('CHAT_MISSING')
            }
            chatData = snap.data() || {}
            if (chatData.generationStatus !== 'queued') {
                throw new Error('NOT_QUEUED')
            }
            pendingGeneration = chatData.pendingGeneration
            if (!pendingGeneration?.requestId) {
                throw new Error('MISSING_REQUEST')
            }
            requestId = pendingGeneration.requestId
            const messages = Array.isArray(chatData.messages) ? chatData.messages : []
            if (!messages.length || messages[messages.length - 1]?.role !== 'user') {
                throw new Error('INVALID_MESSAGES')
            }
            userMessage = messages[messages.length - 1]
            priorMessages = messages.slice(0, -1)
            transaction.update(chatRef, {
                generationStatus: 'running',
                generationActivity: 'thinking',
                generationError: null
            })
        })
    } catch (error) {
        if (['NOT_QUEUED', 'CHAT_MISSING', 'MISSING_REQUEST'].includes(error.message)) {
            return
        }
        throw error
    }

    const providerRaw = typeof chatData.provider === 'string'
        ? chatData.provider.toLowerCase().trim()
        : 'openai'
    const provider = PROVIDERS.has(providerRaw) ? providerRaw : 'openai'
    const bodyModel = typeof chatData.model === 'string' ? chatData.model.trim() : ''
    const adapter = providerAdapters[provider]

    if (bodyModel && !isPlausibleModelId(bodyModel)) {
        await failGeneration(chatRef, priorMessages, chatId, 'Invalid model id.')
        return
    }

    const userDoc = await db.collection('users').doc(chatData.userId).get()
    const userData = userDoc.data() || {}
    const { apiKey, model: selectedModel } = resolveProviderCredentials(
        userData,
        provider,
        bodyModel || undefined
    )

    if (!apiKey) {
        await failGeneration(
            chatRef,
            priorMessages,
            chatId,
            `API key for provider "${provider}" is missing. Add it in settings.`
        )
        return
    }

    const attachmentParts = Array.isArray(pendingGeneration.attachmentParts)
        ? pendingGeneration.attachmentParts
        : []
    const reasoningEnabled = pendingGeneration.reasoningEnabled !== false
    const webSearchEnabled = pendingGeneration.webSearchEnabled !== false

    const modelCapabilities = isAllowedModel(provider, selectedModel)
        ? inferCapabilities(provider, selectedModel)
        : { reasoning: true, webSearch: true }
    const effectiveReasoning = reasoningEnabled && modelCapabilities.reasoning
    const effectiveWebSearch = webSearchEnabled && modelCapabilities.webSearch

    const conversation = toPipelineMessages([...priorMessages, userMessage])
    const pipelineMessages = provider === 'openai'
        ? conversation
        : mergeAttachmentsNonOpenAI(conversation, attachmentParts)

    const assistantMessageId = `asst-${requestId}`
    const assistantShell = {
        id: assistantMessageId,
        role: 'system',
        content: '',
        sources: []
    }
    const streamingMessages = [...priorMessages, userMessage, assistantShell]
    const writer = createThrottledWriter(chatRef)

    await chatRef.update({
        messages: streamingMessages,
        generationActivity: 'thinking',
        lastUpdated: FieldValue.serverTimestamp()
    })

    let assistantResponse = ''
    const collectedSources = []
    const seenSourceUrls = new Set()

    const addSource = (source) => {
        if (!source?.url || seenSourceUrls.has(source.url)) return
        seenSourceUrls.add(source.url)
        collectedSources.push(source)
    }

    const pushStreamingUpdate = async (activity) => {
        const nextAssistant = {
            ...assistantShell,
            content: assistantResponse,
            sources: collectedSources.map((s) => omitUndefinedKeys(s))
        }
        const nextMessages = [...priorMessages, userMessage, nextAssistant].map((m) => {
            const cleaned = omitUndefinedKeys(m)
            if (Array.isArray(cleaned.sources)) {
                cleaned.sources = cleaned.sources.map((s) => omitUndefinedKeys(s))
            }
            return cleaned
        })
        await writer.schedule({
            messages: nextMessages,
            generationActivity: activity || null
        })
    }

    try {
        const result = await adapter.streamReply({
            messages: pipelineMessages,
            attachmentParts: provider === 'openai' ? attachmentParts : [],
            apiKey,
            modelId: selectedModel,
            reasoningEnabled: effectiveReasoning,
            webSearchEnabled: effectiveWebSearch,
            onDelta: (delta) => {
                assistantResponse += delta || ''
                pushStreamingUpdate('responding').catch((err) => {
                    console.error('chatGeneration stream update failed:', err)
                })
            },
            onReasoningDelta: () => {
                pushStreamingUpdate('reasoning').catch((err) => {
                    console.error('chatGeneration reasoning update failed:', err)
                })
            },
            onSource: (source) => {
                addSource(source)
                pushStreamingUpdate('responding').catch((err) => {
                    console.error('chatGeneration source update failed:', err)
                })
            },
            onStatus: (status) => {
                const state = status?.state || 'thinking'
                pushStreamingUpdate(
                    state === 'done' ? null : state
                ).catch((err) => {
                    console.error('chatGeneration status update failed:', err)
                })
            }
        })

        assistantResponse = result.assistantResponse || assistantResponse
        if (Array.isArray(result.sources)) {
            result.sources.forEach(addSource)
        }

        if (!assistantResponse.trim()) {
            throw new Error('No response received from the model.')
        }

        let title = result.title || null
        if (!title) {
            title = await generateChatTitle({
                provider,
                apiKey,
                modelId: selectedModel,
                messages: pipelineMessages,
                assistantResponse
            })
        }

        const {
            usage,
            costUsd,
            costSource,
            costBreakdown
        } = computeTurnCost(
            provider,
            selectedModel,
            result.usage,
            pipelineMessages,
            assistantResponse
        )

        const modelKey = typeof chatData.modelKey === 'string' ? chatData.modelKey.trim() : ''
        const assistantMessage = omitUndefinedKeys({
            id: assistantMessageId,
            role: 'system',
            content: assistantResponse,
            sources: collectedSources.map((s) => omitUndefinedKeys(s)),
            ...(usage ? { usage } : {}),
            ...(typeof costUsd === 'number' ? { costUsd } : {}),
            ...(costSource ? { costSource } : {}),
            ...(costBreakdown ? { costBreakdown: omitUndefinedKeys(costBreakdown) } : {}),
            ...(modelKey ? { modelKey } : {}),
            provider,
            ...(selectedModel ? { model: selectedModel } : {}),
            costRecordedAt: new Date().toISOString()
        })

        const finalMessages = [...priorMessages, userMessage, assistantMessage].map((m) => {
            const cleaned = omitUndefinedKeys(m)
            if (Array.isArray(cleaned.sources)) {
                cleaned.sources = cleaned.sources.map((s) => omitUndefinedKeys(s))
            }
            return cleaned
        })

        const chatName = title
            || (typeof chatData.name === 'string' && chatData.name.trim()
                ? chatData.name
                : createFallbackTitle(finalMessages))

        await writer.flushFinal({
            name: chatName,
            messages: finalMessages,
            totalCostUsd: sumChatCostUsd(finalMessages),
            generationStatus: 'idle',
            generationActivity: null,
            generationError: null,
            pendingGeneration: FieldValue.delete()
        })
    } catch (error) {
        console.error(`runChatGeneration failed for ${chatId}:`, error)
        const message = error?.error?.message || error?.message || 'Failed generating response.'
        await failGeneration(chatRef, priorMessages, chatId, message)
    }
}

const failGeneration = async (chatRef, priorMessages, chatId, errorMessage) => {
    try {
        if (!priorMessages.length) {
            await chatRef.update({
                messages: [],
                name: 'New chat',
                totalCostUsd: 0,
                generationStatus: 'idle',
                generationActivity: null,
                generationError: errorMessage,
                pendingGeneration: FieldValue.delete(),
                lastUpdated: FieldValue.serverTimestamp()
            })
            return
        }

        await chatRef.update({
            messages: priorMessages,
            totalCostUsd: sumChatCostUsd(priorMessages),
            generationStatus: 'idle',
            generationActivity: null,
            generationError: errorMessage,
            pendingGeneration: FieldValue.delete(),
            lastUpdated: FieldValue.serverTimestamp()
        })
    } catch (error) {
        console.error(`Failed reverting chat ${chatId}:`, error)
    }
}

module.exports = {
    runChatGeneration,
    createFallbackTitle,
    sumChatCostUsd,
    toPipelineMessages
}
