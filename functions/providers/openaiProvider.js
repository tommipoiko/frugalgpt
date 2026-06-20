const OpenAI = require('openai')
const { listRequiredModelsForProvider } = require('../modelCatalog')
const { enrichModelRow, normalizeMessagesForOpenAiInput, createSourceRecorder } = require('./shared')

const providerId = 'openai'

const buildOpenAiOptions = (reasoningEnabled, webSearchEnabled) => {
    const opts = {}
    if (reasoningEnabled) {
        opts.reasoning = { effort: 'high' }
    }
    if (webSearchEnabled) {
        opts.tools = [{ type: 'web_search' }]
    }
    return opts
}

const streamReply = async ({
    messages,
    attachmentParts,
    apiKey,
    modelId,
    reasoningEnabled,
    webSearchEnabled,
    onDelta,
    onReasoningDelta,
    onSource,
    onStatus
}) => {
    const client = new OpenAI({ apiKey })
    const { collectedSources, recordSource } = createSourceRecorder(onSource)
    if (onStatus) onStatus({ state: 'thinking', message: 'Analyzing your request...' })

    const stream = await client.responses.create({
        model: modelId,
        input: normalizeMessagesForOpenAiInput(messages, attachmentParts),
        ...buildOpenAiOptions(reasoningEnabled, webSearchEnabled),
        stream: true
    })

    let fullText = ''
    let usage = null
    for await (const event of stream) {
        if (event.type === 'response.output_text.delta' && event.delta) {
            fullText += event.delta
            onDelta(event.delta)
            if (onStatus) onStatus({ state: 'responding', message: 'Generating answer...' })
        } else if (
            (event.type === 'response.reasoning_summary_text.delta'
                || event.type === 'response.reasoning.delta')
            && event.delta
        ) {
            if (onReasoningDelta) onReasoningDelta(event.delta)
            if (onStatus) onStatus({ state: 'reasoning', message: 'Reasoning...' })
        } else if (event.type?.includes('web_search')) {
            if (onStatus) onStatus({ state: 'searching', message: 'Searching the web...' })
        } else if (
            event.type === 'response.output_text.annotation.added'
            && event.annotation?.type === 'url_citation'
        ) {
            recordSource(event.annotation)
        } else if (event.type === 'response.completed' && event.response) {
            if (event.response.usage) {
                let webSearchCalls = 0
                event.response.output?.forEach?.((item) => {
                    if (item?.type === 'web_search_call') {
                        webSearchCalls += 1
                    }
                })
                usage = {
                    ...event.response.usage,
                    web_search_calls: webSearchCalls,
                    estimated: false
                }
            }
            event.response.output?.forEach?.((item) => {
                item?.content?.forEach?.((part) => {
                    part?.annotations?.forEach?.((annotation) => {
                        if (annotation?.type === 'url_citation') {
                            recordSource(annotation)
                        }
                    })
                })
            })
        }
    }

    if (!fullText.trim()) throw new Error('No response received from OpenAI.')
    return {
        assistantResponse: fullText,
        title: null,
        sources: collectedSources,
        usage
    }
}

const listModels = async ({ inferCapabilities }) => listRequiredModelsForProvider(providerId)
    .map((id) => enrichModelRow(providerId, id, inferCapabilities))

const listModelIdsForCuration = async () => listRequiredModelsForProvider(providerId)

module.exports = {
    streamReply,
    listModels,
    listModelIdsForCuration
}
