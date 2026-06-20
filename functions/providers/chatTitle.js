const OpenAI = require('openai')
const Anthropic = require('@anthropic-ai/sdk')
const { GoogleGenAI } = require('@google/genai')

const MISTRAL_API_BASE = 'https://api.mistral.ai/v1'

const TITLE_INSTRUCTION = [
    'Generate a short, descriptive title for this chat (3-6 words).',
    'Reply with only the title text: no quotes, trailing punctuation, or explanation.'
].join(' ')

const excerpt = (text, max = 280) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) return ''
    return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`
}

const extractUserMessage = (messages) => {
    const userMessages = messages.filter((message) => message?.role === 'user')
    if (!userMessages.length) return ''
    return String(userMessages[userMessages.length - 1].content || '').trim()
}

const isFirstExchange = (messages) => {
    const userMessages = messages.filter(
        (message) => message?.role === 'user' && String(message?.content || '').trim()
    )
    const assistantMessages = messages.filter(
        (message) => message?.role === 'system' && String(message?.content || '').trim()
    )
    return userMessages.length === 1 && assistantMessages.length === 0
}

const sanitizeChatTitle = (raw) => {
    if (!raw || typeof raw !== 'string') return null

    let title = raw.trim().split('\n')[0].trim()
    title = title.replace(/^["'`]+|["'`]+$/g, '')
    title = title.replace(/[.!?:;]+$/, '').trim()
    title = title.replace(/\s+/g, ' ')
    if (!title) return null
    if (title.length > 80) {
        return `${title.slice(0, 77)}…`
    }
    return title
}

const buildTitlePrompt = (userMessage, assistantResponse) => (
    `${TITLE_INSTRUCTION}\n\nUser: ${excerpt(userMessage, 500) || '(attachment)'}\n\nAssistant: ${excerpt(assistantResponse, 400)}`
)

/** Title calls should stay cheap: no tools/web search and minimal reasoning only. */
const buildOpenAiTitleCreateParams = (modelId, prompt) => ({
    model: modelId,
    input: prompt,
    max_output_tokens: 32,
    reasoning: { effort: 'minimal' }
})

const buildGeminiTitleConfig = () => ({
    maxOutputTokens: 32,
    temperature: 0.3
})

const buildMistralTitleBody = (modelId, prompt) => ({
    model: modelId,
    messages: [{
        role: 'user',
        content: prompt
    }],
    max_tokens: 32,
    temperature: 0.3
})

const extractOpenAiResponseText = (response) => {
    if (typeof response?.output_text === 'string' && response.output_text.trim()) {
        return response.output_text
    }
    const parts = []
    response?.output?.forEach((item) => {
        item?.content?.forEach?.((part) => {
            if (part?.type === 'output_text' && part.text) {
                parts.push(part.text)
            }
        })
    })
    return parts.join('')
}

const generateOpenAiTitle = async ({ apiKey, modelId, userMessage, assistantResponse }) => {
    const client = new OpenAI({ apiKey })
    const prompt = buildTitlePrompt(userMessage, assistantResponse)
    const response = await client.responses.create(
        buildOpenAiTitleCreateParams(modelId, prompt)
    )
    return sanitizeChatTitle(extractOpenAiResponseText(response))
}

const generateAnthropicTitle = async ({ apiKey, modelId, userMessage, assistantResponse }) => {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
        model: modelId,
        max_tokens: 40,
        messages: [{
            role: 'user',
            content: buildTitlePrompt(userMessage, assistantResponse)
        }]
    })
    const text = response.content
        ?.filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
    return sanitizeChatTitle(text)
}

const generateGeminiTitle = async ({ apiKey, modelId, userMessage, assistantResponse }) => {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
        model: modelId,
        contents: buildTitlePrompt(userMessage, assistantResponse),
        config: buildGeminiTitleConfig()
    })
    return sanitizeChatTitle(response.text)
}

const generateMistralTitle = async ({ apiKey, modelId, userMessage, assistantResponse }) => {
    const prompt = buildTitlePrompt(userMessage, assistantResponse)
    const response = await fetch(`${MISTRAL_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(buildMistralTitleBody(modelId, prompt))
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Mistral title request failed')
    }

    const payload = await response.json()
    return sanitizeChatTitle(payload.choices?.[0]?.message?.content)
}

const generateChatTitle = async ({
    provider,
    apiKey,
    modelId,
    messages,
    assistantResponse
}) => {
    if (!isFirstExchange(messages)) return null

    const userMessage = extractUserMessage(messages)
    if (!userMessage && !String(assistantResponse || '').trim()) return null

    const args = { apiKey, modelId, userMessage, assistantResponse }

    try {
        switch (provider) {
        case 'openai':
            return await generateOpenAiTitle(args)
        case 'anthropic':
            return await generateAnthropicTitle(args)
        case 'google':
            return await generateGeminiTitle(args)
        case 'mistral':
            return await generateMistralTitle(args)
        default:
            return null
        }
    } catch (error) {
        console.error(`generateChatTitle failed for ${provider}:`, error)
        return null
    }
}

module.exports = {
    buildTitlePrompt,
    buildOpenAiTitleCreateParams,
    buildGeminiTitleConfig,
    buildMistralTitleBody,
    generateChatTitle,
    isFirstExchange,
    sanitizeChatTitle
}
