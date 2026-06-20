const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const { inferCapabilities } = require('./providerConfig')
const {
    DEFAULT_MODEL_BY_PROVIDER,
    PROVIDERS,
    sanitizeModelId,
    isAllowedModel,
    listRequiredModelsForProvider
} = require('./modelCatalog')
const openaiProvider = require('./providers/openaiProvider')
const anthropicProvider = require('./providers/anthropicProvider')
const geminiProvider = require('./providers/geminiProvider')
const mistralProvider = require('./providers/mistralProvider')
const { generateChatTitle } = require('./providers/chatTitle')
const { computeTurnCost } = require('./usageCost')

admin.initializeApp()

const FUNCTION_REGION = 'europe-north1'

const providerAdapters = {
    openai: openaiProvider,
    anthropic: anthropicProvider,
    google: geminiProvider,
    mistral: mistralProvider
}

const validateMessagesWithAttachments = (messages, attachmentParts) => {
    if (!Array.isArray(messages)) return false
    if (!messages.every(
        (message) => typeof message?.content === 'string'
            && ['user', 'system', 'assistant'].includes(message?.role)
    )) return false
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser) return false
    if (!lastUser.content.trim() && !(attachmentParts?.length)) return false
    if (attachmentParts?.length > 5) return false
    return true
}

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
        model: sanitizeModelId('openai', legacy.model)
    }
}

const getProviderRow = (userData, providerId) => {
    const row = userData?.providers?.[providerId]
    if (row?.apiKey?.trim()) {
        return {
            apiKey: row.apiKey.trim(),
            model: sanitizeModelId(providerId, row.model)
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
        model: sanitizeModelId(providerId, requestedModel || row.model)
    }
}

const applyCors = (req, res) => {
    const origin = req.headers.origin || '*'
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Vary', 'Origin')
    res.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, X-Firebase-AppCheck, x-client-version'
    )
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Max-Age', '3600')
}

const streamResponseToNdjson = async ({
    res,
    adapter,
    provider,
    selectedModel,
    messages,
    attachmentParts,
    apiKey,
    reasoningEnabled,
    webSearchEnabled,
    userId,
    userData
}) => adapter.streamReply({
    messages,
    attachmentParts,
    apiKey,
    modelId: selectedModel,
    reasoningEnabled,
    webSearchEnabled,
    userId,
    db: admin.firestore(),
    userData,
    onDelta: (delta) => {
        res.write(`${JSON.stringify({ type: 'delta', delta })}\n`)
    },
    onReasoningDelta: (delta) => {
        res.write(`${JSON.stringify({ type: 'reasoning', delta })}\n`)
    },
    onSource: (source) => {
        res.write(`${JSON.stringify({ type: 'source', source })}\n`)
    },
    onStatus: (status) => {
        res.write(`${JSON.stringify({ type: 'status', ...status })}\n`)
    },
    provider
})

exports.generateChatResponseStreamHttp = onRequest(
    { region: FUNCTION_REGION, timeoutSeconds: 300 },
    async (req, res) => {
        applyCors(req, res)
        if (req.method === 'OPTIONS') {
            res.status(204).send('')
            return
        }
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' })
            return
        }

        try {
            const authHeader = req.headers.authorization || ''
            if (!authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Missing bearer token' })
                return
            }

            const idToken = authHeader.replace('Bearer ', '')
            const decodedToken = await admin.auth().verifyIdToken(idToken)
            const userId = decodedToken.uid
            const body = req.body || {}
            const { messages } = body
            const attachmentParts = Array.isArray(body.attachmentParts) ? body.attachmentParts : []
            const providerRaw = typeof body.provider === 'string'
                ? body.provider.toLowerCase().trim()
                : 'openai'
            const provider = PROVIDERS.has(providerRaw) ? providerRaw : 'openai'
            const bodyModel = typeof body.model === 'string' ? body.model.trim() : ''
            const adapter = providerAdapters[provider]

            if (bodyModel && !isAllowedModel(provider, bodyModel)) {
                res.status(400).json({
                    error: `Unsupported model "${bodyModel}" for provider "${provider}".`
                })
                return
            }
            if (!validateMessagesWithAttachments(messages, attachmentParts)) {
                res.status(400).json({ error: 'Invalid messages payload.' })
                return
            }

            const userDoc = await admin.firestore().collection('users').doc(userId).get()
            const { apiKey, model: selectedModel } = resolveProviderCredentials(
                userDoc.data(),
                provider,
                bodyModel || undefined
            )

            if (!apiKey) {
                res.status(412).json({
                    error: `API key for provider "${provider}" is missing. Add it in settings.`
                })
                return
            }

            const modelCapabilities = inferCapabilities(provider, selectedModel)
            const effectiveReasoning = body.reasoningEnabled !== false && modelCapabilities.reasoning
            const effectiveWebSearch = body.webSearchEnabled !== false && modelCapabilities.webSearch
            const pipelineMessages = provider === 'openai'
                ? messages
                : mergeAttachmentsNonOpenAI(messages, attachmentParts)

            res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache, no-transform')
            res.setHeader('Connection', 'keep-alive')
            res.write(`${JSON.stringify({ type: 'status', state: 'started' })}\n`)

            const result = await streamResponseToNdjson({
                res,
                adapter,
                provider,
                selectedModel,
                messages: pipelineMessages,
                attachmentParts: provider === 'openai' ? attachmentParts : [],
                apiKey,
                reasoningEnabled: effectiveReasoning,
                webSearchEnabled: effectiveWebSearch,
                userId,
                userData: userDoc.data() || {}
            })

            let title = result.title || null
            if (!title) {
                title = await generateChatTitle({
                    provider,
                    apiKey,
                    modelId: selectedModel,
                    messages: pipelineMessages,
                    assistantResponse: result.assistantResponse
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
                result.assistantResponse
            )

            res.write(`${JSON.stringify({
                type: 'done',
                ...result,
                title,
                usage,
                costUsd,
                costSource,
                costBreakdown,
                provider,
                model: selectedModel
            })}\n`)
            res.end()
        } catch (error) {
            console.error('generateChatResponseStreamHttp failed:', error)
            const message = error?.error?.message || error?.message || 'Failed generating response.'
            if (!res.headersSent) {
                res.status(500).json({ error: message })
                return
            }
            res.write(`${JSON.stringify({ type: 'error', error: message })}\n`)
            res.end()
        }
    }
)

exports.listAvailableModelsHttp = onRequest(
    { region: FUNCTION_REGION },
    async (req, res) => {
        applyCors(req, res)
        if (req.method === 'OPTIONS') {
            res.status(204).send('')
            return
        }
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' })
            return
        }

        try {
            const authHeader = req.headers.authorization || ''
            if (!authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Missing bearer token' })
                return
            }
            const idToken = authHeader.replace('Bearer ', '')
            const decodedToken = await admin.auth().verifyIdToken(idToken)
            const userId = decodedToken.uid
            const body = req.body || {}
            const providerRaw = typeof body.provider === 'string'
                ? body.provider.toLowerCase().trim()
                : 'openai'
            const provider = PROVIDERS.has(providerRaw) ? providerRaw : 'openai'
            const adapter = providerAdapters[provider]

            const userDoc = await admin.firestore().collection('users').doc(userId).get()
            const { apiKey } = resolveProviderCredentials(userDoc.data(), provider, null)
            if (!apiKey) {
                res.status(412).json({
                    error: `API key for provider "${provider}" is missing.`
                })
                return
            }

            const models = await adapter.listModels({ apiKey, inferCapabilities })
            res.status(200).json({
                models,
                defaultModel: DEFAULT_MODEL_BY_PROVIDER[provider]
            })
        } catch (error) {
            console.error('listAvailableModelsHttp failed:', error)
            const message = error?.error?.message || error?.message || 'Failed fetching available models.'
            res.status(500).json({ error: message })
        }
    }
)

exports.curateModelsHttp = onRequest(
    { region: FUNCTION_REGION, timeoutSeconds: 120 },
    async (req, res) => {
        applyCors(req, res)
        if (req.method === 'OPTIONS') {
            res.status(204).send('')
            return
        }
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' })
            return
        }

        try {
            const authHeader = req.headers.authorization || ''
            if (!authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Missing bearer token' })
                return
            }
            const idToken = authHeader.replace('Bearer ', '')
            const decodedToken = await admin.auth().verifyIdToken(idToken)
            const userId = decodedToken.uid

            const userDoc = await admin.firestore().collection('users').doc(userId).get()
            const userData = userDoc.data() || {}
            const modelCuration = {}

            for (const provider of PROVIDERS) {
                const { apiKey } = resolveProviderCredentials(userData, provider, null)
                const adapter = providerAdapters[provider]
                let modelIds = listRequiredModelsForProvider(provider)
                if (apiKey && adapter?.listModelIdsForCuration) {
                    try {
                        // eslint-disable-next-line no-await-in-loop
                        modelIds = await adapter.listModelIdsForCuration({ apiKey })
                    } catch (error) {
                        console.warn(`curation ${provider} fallback:`, error?.message || error)
                    }
                }
                modelCuration[provider] = {
                    modelIds,
                    checkedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            }

            await admin.firestore().collection('users').doc(userId).set(
                { modelCuration },
                { merge: true }
            )

            res.status(200).json({ ok: true, providers: [...PROVIDERS] })
        } catch (error) {
            console.error('curateModelsHttp failed:', error)
            res.status(500).json({ error: error?.message || 'Curation failed.' })
        }
    }
)
