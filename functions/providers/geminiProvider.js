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
    for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts ?? []
        for (const part of parts) {
            if (!part?.text) continue
            if (part.thought) {
                if (onReasoningDelta) onReasoningDelta(part.text)
                if (onStatus) onStatus({ state: 'thinking', message: 'Reasoning...' })
            } else {
                fullText += part.text
                onDelta(part.text)
                if (onStatus) onStatus({ state: 'responding', message: 'Generating answer...' })
            }
        }
        if (webSearchEnabled) {
            collectSourcesFromUnknown(chunk, recordSource)
            if (onStatus) onStatus({ state: 'searching', message: 'Searching the web...' })
        }
    }

    if (!fullText.trim()) throw new Error('No response received from Gemini.')
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
