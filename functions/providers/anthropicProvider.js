const Anthropic = require('@anthropic-ai/sdk')
const { listRequiredModelsForProvider } = require('../modelCatalog')
const {
    toAnthropicMessages,
    createSourceRecorder,
    collectSourcesFromUnknown,
    enrichModelRow
} = require('./shared')

const providerId = 'anthropic'

const getThinkingConfigForModel = (modelId, reasoningEnabled) => {
    if (!reasoningEnabled) return undefined
    if (modelId === 'claude-opus-4-7') {
        return {
            type: 'adaptive',
            display: 'summarized'
        }
    }
    if (modelId === 'claude-sonnet-4-6') {
        return {
            type: 'enabled',
            budget_tokens: 10000
        }
    }
    return undefined
}

const streamReply = async ({
    messages,
    apiKey,
    modelId,
    reasoningEnabled,
    webSearchEnabled,
    onDelta,
    onReasoningDelta,
    onSource,
    onStatus
}) => {
    const client = new Anthropic({ apiKey })
    const { collectedSources, recordSource } = createSourceRecorder(onSource)
    if (onStatus) onStatus({ state: 'thinking', message: 'Analyzing your request...' })

    const stream = client.messages.stream({
        model: modelId,
        max_tokens: 16000,
        thinking: getThinkingConfigForModel(modelId, reasoningEnabled),
        tools: webSearchEnabled ? [{ type: 'web_search_20260209', name: 'web_search' }] : undefined,
        messages: toAnthropicMessages(messages)
    })

    let fullText = ''
    for await (const event of stream) {
        if (event.type === 'content_block_start') {
            const block = event.content_block
            if (
                webSearchEnabled
                && block?.type === 'server_tool_use'
                && block?.name === 'web_search'
            ) {
                if (onStatus) onStatus({ state: 'searching', message: 'Searching the web...' })
            }
        }
        if (event.type === 'content_block_delta') {
            if (event.delta?.type === 'thinking_delta' && event.delta.thinking) {
                if (onReasoningDelta) onReasoningDelta(event.delta.thinking)
                if (onStatus) onStatus({ state: 'reasoning', message: 'Reasoning...' })
            } else if (event.delta?.type === 'text_delta' && event.delta.text) {
                fullText += event.delta.text
                onDelta(event.delta.text)
                if (onStatus) onStatus({ state: 'responding', message: 'Generating answer...' })
            }
        }
        if (webSearchEnabled) {
            collectSourcesFromUnknown(event, recordSource)
        }
    }

    if (!fullText.trim()) throw new Error('No response received from Anthropic.')
    return { assistantResponse: fullText, title: null, sources: collectedSources }
}

const listModels = async ({ inferCapabilities }) => listRequiredModelsForProvider(providerId)
    .map((id) => enrichModelRow(providerId, id, inferCapabilities))

const listModelIdsForCuration = async () => listRequiredModelsForProvider(providerId)

module.exports = {
    streamReply,
    listModels,
    listModelIdsForCuration
}
