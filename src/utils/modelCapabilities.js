/** Fallback when model list API omits capability flags (same rules as Cloud Functions). */
export default function inferModelCapabilities(provider, modelId) {
    const id = String(modelId || '').toLowerCase()
    if (provider === 'openai') {
        return {
            reasoning: /^gpt-5\.(4|5)$/i.test(id),
            webSearch: /^gpt-5\.(4|5)$/i.test(id)
        }
    }
    if (provider === 'anthropic') {
        return {
            reasoning: /^claude-(opus-4-7|sonnet-4-6)$/i.test(id),
            webSearch: true
        }
    }
    if (provider === 'google') {
        return {
            reasoning: /^gemini-3\.1-pro-preview$/i.test(id),
            webSearch: true
        }
    }
    if (provider === 'mistral') {
        return {
            reasoning: /^magistral-(medium|small)-latest$/i.test(id),
            webSearch: true
        }
    }
    return { reasoning: false, webSearch: false }
}
