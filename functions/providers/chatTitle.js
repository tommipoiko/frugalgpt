const OpenAI = require('openai')
const Anthropic = require('@anthropic-ai/sdk')
const { GoogleGenAI } = require('@google/genai')
const {
    isAllowedModel,
    sanitizeModelId
} = require('../modelCatalog')

const MISTRAL_API_BASE = 'https://api.mistral.ai/v1'

const TITLE_SYSTEM = [
    'You label chat threads in a sidebar.',
    'Write a short title (2-5 words) that names the topic, not the user\'s question verbatim.',
    'Use a concise noun phrase in Title Case.',
    'Drop filler such as "tell me", "please", "help", "how do I", and "what is".',
    'Prefer the most specific useful subject (product, place, task, or technique).',
    'Reply with only the title: no quotes, trailing punctuation, or explanation.'
].join(' ')

const TITLE_EXAMPLES = [
    { user: 'Tell me about apples for sale in Finland', title: 'Apples in Finland' },
    {
        user: 'How do I stream games to my Steam Deck using Moonlight and Apollo?',
        title: 'Steam Deck Streaming'
    },
    { user: 'What is the difference between OAuth2 and JWT for my API?', title: 'OAuth vs JWT' }
]

const TITLE_MODEL_BY_PROVIDER = {
    openai: 'gpt-5.4',
    google: 'gemini-3.5-flash',
    anthropic: 'claude-sonnet-4-6',
    mistral: 'magistral-small-latest'
}

const QUESTION_LEAD_INS = [
    /^tell me about\s+/i,
    /^can you (?:please )?(?:help me )?(?:to )?/i,
    /^could you (?:please )?/i,
    /^how (?:do|can|would|should) i\s+/i,
    /^what(?:'s| is| are) (?:the )?/i,
    /^why (?:is|are|do|does)\s+/i,
    /^please (?:help me )?(?:with )?/i,
    /^help me (?:with )?/i,
    /^i (?:want|need|would like) to (?:know (?:about )?)?/i,
    /^i'm (?:trying|looking) to\s+/i
]

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

const stripQuestionLead = (text) => {
    let trimmed = String(text || '').trim()
    for (let pass = 0; pass < 8; pass += 1) {
        const next = QUESTION_LEAD_INS.reduce(
            (current, pattern) => current.replace(pattern, '').trim(),
            trimmed
        )
        if (next === trimmed) break
        trimmed = next
    }
    return trimmed.replace(/\?+$/, '').trim()
}

const SMALL_TITLE_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs'
])

const toTitleCase = (text) => (
    text.split(/\s+/).filter(Boolean).map((word, index) => {
        if (/^[A-Z0-9]{2,}$/.test(word)) return word
        const lower = word.toLowerCase()
        if (index > 0 && SMALL_TITLE_WORDS.has(lower)) return lower
        return lower.charAt(0).toUpperCase() + lower.slice(1)
    }).join(' ')
)

const truncateTitleWords = (text, maxWords = 5) => {
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length <= maxWords) return words.join(' ')
    return words.slice(0, maxWords).join(' ')
}

const deriveHeuristicTitle = (userMessage) => {
    const raw = String(userMessage || '').trim()
    if (!raw) return null

    let text = stripQuestionLead(raw)
    if (!text) return null

    text = text.split(/[.!?;,]/)[0].trim()
    text = text
        .replace(/\b(for sale|please|thanks|thank you)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    text = truncateTitleWords(text, 5)
    text = toTitleCase(text)

    if (!text || text.length < 2) return null
    if (text.length > 48) return `${text.slice(0, 45)}…`
    return text
}

const normalizeTitleText = (text) => String(text || '').toLowerCase().replace(/\s+/g, ' ').trim()

const isPoorChatTitle = (title, userMessage) => {
    if (!title) return true

    const normalizedTitle = normalizeTitleText(title)
    const normalizedUser = normalizeTitleText(userMessage)
    if (!normalizedTitle) return true

    if (title.split(/\s+/).length > 8) return true
    if (/^(how|what|why|when|where|can you|tell me|please|help)\b/i.test(title)) return true
    if (title.includes('?')) return true

    if (normalizedUser) {
        if (normalizedUser.startsWith(normalizedTitle)) return true
        if (normalizedTitle.length >= 24 && normalizedUser.includes(normalizedTitle.slice(0, 24))) {
            return true
        }
    }

    return false
}

const resolveTitleModelId = (provider, chatModelId) => {
    const preferred = TITLE_MODEL_BY_PROVIDER[provider]
    if (preferred && isAllowedModel(provider, preferred)) return preferred
    if (chatModelId && isAllowedModel(provider, chatModelId)) return chatModelId
    return sanitizeModelId(provider, undefined)
}

const sanitizeChatTitle = (raw) => {
    if (!raw || typeof raw !== 'string') return null

    let title = raw.trim().split('\n')[0].trim()
    title = title.replace(/^(?:title:\s*)/i, '')
    title = title.replace(/^["'`]+|["'`]+$/g, '')
    title = title.replace(/[.!?:;]+$/, '').trim()
    title = title.replace(/\s+/g, ' ')
    if (!title) return null
    if (title.length > 80) {
        return `${title.slice(0, 77)}…`
    }
    return title
}

const buildTitlePrompt = (userMessage, assistantResponse) => {
    const examples = TITLE_EXAMPLES
        .map(({ user, title }) => `User: ${user}\nTitle: ${title}`)
        .join('\n\n')

    return [
        TITLE_SYSTEM,
        '',
        'Examples:',
        examples,
        '',
        `User: ${excerpt(userMessage, 500) || '(attachment)'}`,
        `Assistant: ${excerpt(assistantResponse, 400) || '(no reply yet)'}`,
        '',
        'Title:'
    ].join('\n')
}

/** Title calls should stay cheap: no tools, web search, or reasoning/thinking. */
const buildOpenAiTitleCreateParams = (modelId, prompt) => ({
    model: modelId,
    input: prompt,
    max_output_tokens: 48
})

const buildGeminiTitleConfig = () => ({
    maxOutputTokens: 48,
    temperature: 0.2,
    thinkingConfig: {
        thinkingBudget: 0
    }
})

const buildMistralTitleBody = (modelId, prompt) => ({
    model: modelId,
    messages: [{
        role: 'user',
        content: prompt
    }],
    max_tokens: 48,
    temperature: 0.2
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

const extractMistralMessageText = (content) => {
    if (!content) return ''
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return ''

    return content
        .filter((chunk) => chunk?.type === 'text' && typeof chunk.text === 'string')
        .map((chunk) => chunk.text)
        .join('')
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
        max_tokens: 48,
        system: TITLE_SYSTEM,
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
    const content = payload.choices?.[0]?.message?.content
    return sanitizeChatTitle(extractMistralMessageText(content) || content)
}

const finalizeChatTitle = (title, userMessage) => {
    const sanitized = sanitizeChatTitle(title)
    if (sanitized && !isPoorChatTitle(sanitized, userMessage)) {
        return sanitized
    }
    return deriveHeuristicTitle(userMessage)
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

    const titleModelId = resolveTitleModelId(provider, modelId)
    const args = {
        apiKey,
        modelId: titleModelId,
        userMessage,
        assistantResponse
    }

    try {
        let title = null
        switch (provider) {
        case 'openai':
            title = await generateOpenAiTitle(args)
            break
        case 'anthropic':
            title = await generateAnthropicTitle(args)
            break
        case 'google':
            title = await generateGeminiTitle(args)
            break
        case 'mistral':
            title = await generateMistralTitle(args)
            break
        default:
            title = null
        }
        return finalizeChatTitle(title, userMessage)
    } catch (error) {
        console.error(`generateChatTitle failed for ${provider}:`, error)
        return deriveHeuristicTitle(userMessage)
    }
}

module.exports = {
    buildTitlePrompt,
    buildOpenAiTitleCreateParams,
    buildGeminiTitleConfig,
    buildMistralTitleBody,
    deriveHeuristicTitle,
    generateChatTitle,
    isFirstExchange,
    isPoorChatTitle,
    resolveTitleModelId,
    sanitizeChatTitle
}
