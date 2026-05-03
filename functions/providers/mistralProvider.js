const { listRequiredModelsForProvider } = require('../modelCatalog')
const {
    toMistralMessages,
    createSourceRecorder,
    collectSourcesFromUnknown,
    parseSseDataLines,
    enrichModelRow
} = require('./shared')

const providerId = 'mistral'

const extractDeltaText = (eventJson) => {
    if (!eventJson || typeof eventJson !== 'object') return ''
    const directDelta = eventJson.choices?.[0]?.delta?.content
    if (typeof directDelta === 'string') return directDelta
    const nestedDelta = eventJson.data?.choices?.[0]?.delta?.content
    if (typeof nestedDelta === 'string') return nestedDelta
    return ''
}

const streamReply = async ({
    messages,
    apiKey,
    modelId,
    webSearchEnabled,
    onDelta,
    onSource,
    onStatus
}) => {
    const { collectedSources, recordSource } = createSourceRecorder(onSource)
    if (onStatus) onStatus({ state: 'thinking', message: 'Analyzing your request...' })

    const response = await fetch('https://api.mistral.ai/v1/conversations', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: modelId,
            inputs: toMistralMessages(messages),
            stream: true,
            tools: webSearchEnabled ? [{ type: 'web_search' }] : undefined
        })
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Mistral request failed')
    }

    let fullText = ''
    await parseSseDataLines(response.body, (json) => {
        const delta = extractDeltaText(json)
        if (typeof delta === 'string') {
            fullText += delta
            onDelta(delta)
            if (onStatus) onStatus({ state: 'responding', message: 'Generating answer...' })
        }
        if (webSearchEnabled) {
            collectSourcesFromUnknown(json, recordSource)
            if (onStatus) onStatus({ state: 'searching', message: 'Searching the web...' })
        }
    })

    if (!fullText.trim()) throw new Error('No response received from Mistral.')
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
