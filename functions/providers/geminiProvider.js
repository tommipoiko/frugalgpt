const { GoogleGenAI } = require('@google/genai')
const { listRequiredModelsForProvider } = require('../modelCatalog')
const { toGeminiPrompt, createSourceRecorder, collectSourcesFromUnknown, enrichModelRow } = require('./shared')

const providerId = 'google'

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
    const ai = new GoogleGenAI({ apiKey })
    const { collectedSources, recordSource } = createSourceRecorder(onSource)
    if (onStatus) onStatus({ state: 'thinking', message: 'Analyzing your request...' })

    const stream = await ai.models.generateContentStream({
        model: modelId,
        contents: toGeminiPrompt(messages),
        config: {
            tools: webSearchEnabled ? [{ googleSearch: {} }] : undefined,
            thinkingConfig: reasoningEnabled
                ? {
                    includeThoughts: true,
                    thinkingLevel: 'medium'
                }
                : undefined
        }
    })

    let fullText = ''
    let searchStatusSent = false
    let usageMetadata = null
    let webSearchQueries = 0
    for await (const chunk of stream) {
        if (chunk.usageMetadata) {
            usageMetadata = chunk.usageMetadata
        }
        const candidate = chunk.candidates?.[0]
        const parts = candidate?.content?.parts ?? []
        if (
            webSearchEnabled
            && candidate?.groundingMetadata?.webSearchQueries?.length
        ) {
            webSearchQueries = candidate.groundingMetadata.webSearchQueries.length
            if (!searchStatusSent) {
                searchStatusSent = true
                if (onStatus) onStatus({ state: 'searching', message: 'Searching the web...' })
            }
        }
        for (const part of parts) {
            if (!part?.text) continue
            if (part.thought) {
                if (onReasoningDelta) onReasoningDelta(part.text)
                if (onStatus) onStatus({ state: 'reasoning', message: 'Reasoning...' })
            } else {
                fullText += part.text
                onDelta(part.text)
                if (onStatus) onStatus({ state: 'responding', message: 'Generating answer...' })
            }
        }
        if (webSearchEnabled) {
            collectSourcesFromUnknown(chunk, recordSource)
        }
    }

    if (!fullText.trim()) throw new Error('No response received from Gemini.')

    const usage = usageMetadata
        ? {
            ...usageMetadata,
            webSearchQueries,
            estimated: false
        }
        : null

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
