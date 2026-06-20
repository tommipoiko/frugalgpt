const { listRequiredModelsForProvider } = require('../modelCatalog')
const {
    toMistralMessages,
    createSourceRecorder,
    collectSourcesFromUnknown,
    parseSseDataLines,
    enrichModelRow
} = require('./shared')

const providerId = 'mistral'
const MISTRAL_API_BASE = 'https://api.mistral.ai/v1'

const WEB_SEARCH_AGENT_INSTRUCTIONS = [
    'You have access to the web_search tool.',
    'Use it when the user needs current or recent information (news, weather, prices,',
    'events, "latest", "today", live stats) or when factual accuracy depends on up-to-date data.',
    'Do not search for stable general knowledge you already know well.',
    'When you search, synthesize findings into a clear answer and cite sources.'
].join(' ')

const webSearchAgentCache = new Map()

const isMagistralModel = (modelId) => /^magistral-/i.test(String(modelId || ''))

const webSearchAgentName = (modelId) => `frugalgpt-websearch-${modelId}`

const webSearchAgentCacheKey = (apiKey, modelId, reasoningEnabled) => (
    `${apiKey.length}:${apiKey.slice(-8)}:${modelId}:${reasoningEnabled ? 'reasoning' : 'default'}`
)

const buildWebSearchAgentBody = (modelId) => ({
    model: modelId,
    name: webSearchAgentName(modelId),
    description: 'FrugalGPT agent that searches the web when fresh information is needed.',
    instructions: WEB_SEARCH_AGENT_INSTRUCTIONS,
    tools: [{ type: 'web_search' }],
    completion_args: {
        temperature: 0.3,
        top_p: 0.95
    }
})

const mistralJsonFetch = async (path, apiKey, { method = 'GET', body } = {}) => {
    const response = await fetch(`${MISTRAL_API_BASE}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Mistral request failed')
    }

    return response.json()
}

const readStoredWebSearchAgentId = (userData, modelId, reasoningEnabled) => {
    const agents = userData?.providers?.mistral?.webSearchAgents
    if (!agents || typeof agents !== 'object') return null
    const key = webSearchAgentStorageKey(modelId, reasoningEnabled)
    const agentId = agents[key]
    return typeof agentId === 'string' && agentId.trim() ? agentId.trim() : null
}

const webSearchAgentStorageKey = (modelId, reasoningEnabled) => (
    reasoningEnabled ? modelId : `${modelId}:no-reasoning`
)

const persistWebSearchAgentId = async (db, userId, modelId, reasoningEnabled, agentId) => {
    if (!db || !userId || !agentId) return
    const key = webSearchAgentStorageKey(modelId, reasoningEnabled)
    await db.collection('users').doc(userId).set({
        providers: {
            mistral: {
                webSearchAgents: {
                    [key]: agentId
                }
            }
        }
    }, { merge: true })
}

const resolveWebSearchAgentId = async ({
    apiKey,
    modelId,
    reasoningEnabled,
    userId,
    db,
    userData
}) => {
    const cacheKey = webSearchAgentCacheKey(apiKey, modelId, reasoningEnabled)
    const cached = webSearchAgentCache.get(cacheKey)
    if (cached) return cached

    const stored = readStoredWebSearchAgentId(userData, modelId, reasoningEnabled)
    if (stored) {
        webSearchAgentCache.set(cacheKey, stored)
        return stored
    }

    const agent = await mistralJsonFetch('/agents', apiKey, {
        method: 'POST',
        body: buildWebSearchAgentBody(modelId)
    })

    if (!agent?.id) {
        throw new Error('Failed to create Mistral web search agent')
    }

    webSearchAgentCache.set(cacheKey, agent.id)
    await persistWebSearchAgentId(db, userId, modelId, reasoningEnabled, agent.id)
    return agent.id
}

const appendFromContent = (content, recordSource) => {
    if (!content) return { text: '', reasoning: '' }
    if (typeof content === 'string') return { text: content, reasoning: '' }
    if (typeof content === 'object' && !Array.isArray(content)) {
        return appendFromContent([content], recordSource)
    }
    if (!Array.isArray(content)) return { text: '', reasoning: '' }

    let text = ''
    let reasoning = ''
    content.forEach((chunk) => {
        if (!chunk || typeof chunk !== 'object') return
        if (chunk.type === 'text' && typeof chunk.text === 'string') {
            text += chunk.text
            return
        }
        if (chunk.type === 'thinking' && Array.isArray(chunk.thinking)) {
            chunk.thinking.forEach((inner) => {
                if (inner?.type === 'text' && typeof inner.text === 'string') {
                    reasoning += inner.text
                }
            })
            return
        }
        if (chunk.type === 'tool_reference') {
            recordSource({
                url: chunk.url,
                title: chunk.title || chunk.name || ''
            })
            return
        }
        if (chunk.type === 'reference') {
            recordSource(chunk.reference || chunk)
            return
        }
        collectSourcesFromUnknown(chunk, recordSource)
    })
    return { text, reasoning }
}

const extractFromChatCompletionEvent = (eventJson, recordSource) => {
    if (!eventJson || typeof eventJson !== 'object') return { text: '', reasoning: '' }
    const delta = eventJson.choices?.[0]?.delta?.content
        ?? eventJson.data?.choices?.[0]?.delta?.content
    return appendFromContent(delta, recordSource)
}

const extractFromConversationOutputs = (outputs, recordSource) => {
    if (!Array.isArray(outputs)) return { text: '', reasoning: '' }

    let text = ''
    let reasoning = ''
    outputs.forEach((output) => {
        if (output?.type !== 'message.output') return
        const parsed = appendFromContent(output.content, recordSource)
        text += parsed.text
        reasoning += parsed.reasoning
    })
    return { text, reasoning }
}

const extractFromConversationEvent = (eventJson, recordSource) => {
    if (!eventJson || typeof eventJson !== 'object') return { text: '', reasoning: '' }

    if (eventJson.type === 'message.output.delta' || eventJson.type === 'message.output') {
        return appendFromContent(eventJson.content, recordSource)
    }

    if (eventJson.type === 'conversation.response.done') {
        return extractFromConversationOutputs(eventJson.outputs, recordSource)
    }

    return { text: '', reasoning: '' }
}

const getConversationErrorMessage = (eventJson) => {
    if (!eventJson || eventJson.type !== 'conversation.response.error') return null
    return eventJson.message
        || eventJson.error
        || eventJson.detail
        || 'Mistral conversation failed'
}

const emitParsedDelta = ({
    text,
    reasoning,
    fullTextRef,
    onDelta,
    onReasoningDelta,
    onStatus
}) => {
    if (reasoning) {
        if (onStatus) onStatus({ state: 'reasoning', message: 'Reasoning...' })
    }
    if (text) {
        fullTextRef.value += text
        onDelta(text)
        if (onStatus) onStatus({ state: 'responding', message: 'Generating answer...' })
    }
}

const handleConversationStatus = (eventJson, onStatus) => {
    if (!onStatus || !eventJson?.type) return
    if (eventJson.type === 'tool.execution.started' && eventJson.name === 'web_search') {
        onStatus({ state: 'searching', message: 'Searching the web...' })
    } else if (eventJson.type === 'tool.execution.done' && eventJson.name === 'web_search') {
        onStatus({ state: 'thinking', message: 'Thinking...' })
    }
}

const mistralFetch = async (path, apiKey, body) => {
    const response = await fetch(`${MISTRAL_API_BASE}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream'
        },
        body: JSON.stringify(body)
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Mistral request failed')
    }

    return response
}

const streamChatCompletion = async ({
    messages,
    apiKey,
    modelId,
    reasoningEnabled,
    onDelta,
    onReasoningDelta,
    onSource,
    onStatus
}) => {
    const { collectedSources, recordSource } = createSourceRecorder(onSource)
    const fullTextRef = { value: '' }
    let usage = null

    const requestBody = {
        model: modelId,
        messages: toMistralMessages(messages),
        stream: true
    }
    if (reasoningEnabled && isMagistralModel(modelId)) {
        requestBody.prompt_mode = 'reasoning'
    }

    const response = await mistralFetch('/chat/completions', apiKey, requestBody)

    await parseSseDataLines(response.body, (json) => {
        if (json?.usage) {
            usage = { ...json.usage, estimated: false }
        }
        const { text, reasoning } = extractFromChatCompletionEvent(json, recordSource)
        emitParsedDelta({
            text,
            reasoning,
            fullTextRef,
            onDelta,
            onReasoningDelta,
            onStatus
        })
    })

    return {
        assistantResponse: fullTextRef.value,
        title: null,
        sources: collectedSources,
        usage
    }
}

const streamConversation = async ({
    messages,
    apiKey,
    modelId,
    reasoningEnabled,
    webSearchEnabled,
    userId,
    db,
    userData,
    onDelta,
    onReasoningDelta,
    onSource,
    onStatus
}) => {
    const { collectedSources, recordSource } = createSourceRecorder(onSource)
    const fullTextRef = { value: '' }
    let usage = null
    let webSearchRequests = 0

    const requestBody = {
        agent_id: await resolveWebSearchAgentId({
            apiKey,
            modelId,
            reasoningEnabled,
            userId,
            db,
            userData
        }),
        inputs: toMistralMessages(messages),
        stream: true
    }

    const response = await mistralFetch('/conversations', apiKey, requestBody)

    await parseSseDataLines(response.body, (json) => {
        const streamError = getConversationErrorMessage(json)
        if (streamError) throw new Error(streamError)

        if (json?.usage) {
            usage = {
                ...json.usage,
                web_search_requests: webSearchRequests,
                estimated: false
            }
        }

        if (json.type === 'tool.execution.done' && json.name === 'web_search') {
            webSearchRequests += 1
        }

        handleConversationStatus(json, onStatus)
        if (webSearchEnabled) {
            collectSourcesFromUnknown(json, recordSource)
        }

        const isFullMessage = json.type === 'message.output'
        const isDoneEvent = json.type === 'conversation.response.done'
        const { text, reasoning } = extractFromConversationEvent(json, recordSource)

        if (isFullMessage && fullTextRef.value.trim()) {
            if (reasoning) {
                emitParsedDelta({
                    text: '',
                    reasoning,
                    fullTextRef,
                    onDelta,
                    onReasoningDelta,
                    onStatus
                })
            }
            return
        }

        if (isDoneEvent && fullTextRef.value.trim()) {
            if (reasoning) {
                emitParsedDelta({
                    text: '',
                    reasoning,
                    fullTextRef,
                    onDelta,
                    onReasoningDelta,
                    onStatus
                })
            }
            return
        }

        emitParsedDelta({
            text,
            reasoning,
            fullTextRef,
            onDelta,
            onReasoningDelta,
            onStatus
        })
    })

    return {
        assistantResponse: fullTextRef.value,
        title: null,
        sources: collectedSources,
        usage: usage
            ? { ...usage, web_search_requests: webSearchRequests, estimated: false }
            : (webSearchRequests
                ? { prompt_tokens: 0, completion_tokens: 0, web_search_requests: webSearchRequests, estimated: false }
                : null)
    }
}

const streamReply = async ({
    messages,
    apiKey,
    modelId,
    reasoningEnabled,
    webSearchEnabled,
    userId,
    db,
    userData,
    onDelta,
    onReasoningDelta,
    onSource,
    onStatus
}) => {
    if (onStatus) onStatus({ state: 'thinking', message: 'Analyzing your request...' })

    const result = webSearchEnabled
        ? await streamConversation({
            messages,
            apiKey,
            modelId,
            reasoningEnabled,
            webSearchEnabled,
            userId,
            db,
            userData,
            onDelta,
            onReasoningDelta,
            onSource,
            onStatus
        })
        : await streamChatCompletion({
            messages,
            apiKey,
            modelId,
            reasoningEnabled,
            onDelta,
            onReasoningDelta,
            onSource,
            onStatus
        })

    if (!result.assistantResponse.trim()) {
        throw new Error('No response received from Mistral.')
    }

    return result
}

const listModels = async ({ inferCapabilities }) => listRequiredModelsForProvider(providerId)
    .map((id) => enrichModelRow(providerId, id, inferCapabilities))

const listModelIdsForCuration = async () => listRequiredModelsForProvider(providerId)

module.exports = {
    streamReply,
    listModels,
    listModelIdsForCuration,
    appendFromContent,
    extractFromChatCompletionEvent,
    extractFromConversationEvent,
    extractFromConversationOutputs,
    isMagistralModel,
    buildWebSearchAgentBody,
    webSearchAgentName,
    webSearchAgentCacheKey,
    webSearchAgentStorageKey,
    readStoredWebSearchAgentId
}
