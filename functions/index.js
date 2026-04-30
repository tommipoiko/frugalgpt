const {
    onCall, onRequest, HttpsError
} = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const OpenAI = require('openai')

admin.initializeApp()

const DEFAULT_MODEL = 'gpt-5'
const FUNCTION_REGION = 'europe-north1'
const RESPONSE_OPTIONS = {
    reasoning: { effort: 'medium' },
    tools: [{ type: 'web_search' }]
}
const MODEL_BLOCKLIST_SUBSTRINGS = [
    'audio',
    'realtime',
    'transcribe',
    'tts',
    'embedding',
    'image',
    'moderation',
    'whisper'
]
const sanitizeModelId = (modelId) => {
    if (typeof modelId !== 'string' || !modelId.trim()) return DEFAULT_MODEL
    return modelId.trim()
}

const normalizeMessagesForInput = (messages) => messages
    .filter((message) => message?.content)
    .map((message) => {
        const normalizedRole = message.role === 'system' ? 'assistant' : message.role
        const contentType = normalizedRole === 'assistant' ? 'output_text' : 'input_text'
        return {
            role: normalizedRole,
            content: [{ type: contentType, text: message.content }]
        }
    })

const ensureStringContentMessages = (messages) => {
    if (!Array.isArray(messages)) return false
    return messages.every(
        (message) => typeof message?.content === 'string'
            && ['user', 'system', 'assistant'].includes(message?.role)
    )
}

exports.generateChatResponse = onCall(
    {
        region: FUNCTION_REGION,
        cors: true
    },
    async (request) => {
        if (!request.auth?.uid) {
            throw new HttpsError('unauthenticated', 'You must be signed in.')
        }

        const { messages } = request.data || {}
        if (!ensureStringContentMessages(messages)) {
            throw new HttpsError('invalid-argument', 'Invalid messages payload.')
        }

        const userId = request.auth.uid
        const userDoc = await admin.firestore().collection('users').doc(userId).get()
        const apiKey = userDoc.data()?.openAi?.openaiKey

        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'OpenAI API key is missing.')
        }

        const openai = new OpenAI({ apiKey })

        const response = await openai.responses.create({
            model: DEFAULT_MODEL,
            input: normalizeMessagesForInput(messages)
        })

        const assistantResponse = response.output_text?.trim()
        if (!assistantResponse) {
            throw new HttpsError('internal', 'No response received from OpenAI.')
        }

        const firstUserMessage = messages.find((message) => message.role === 'user')?.content
        let title = null

        if (firstUserMessage) {
            const titleResponse = await openai.responses.create({
                model: DEFAULT_MODEL,
                input: [
                    {
                        role: 'system',
                        content: [{
                            type: 'input_text',
                            text: 'Create a short and clear chat title from the user prompt. '
                                + 'Return title text only.'
                        }]
                    },
                    {
                        role: 'user',
                        content: [{ type: 'input_text', text: firstUserMessage }]
                    }
                ]
            })
            title = titleResponse.output_text?.trim() || null
        }

        return {
            assistantResponse,
            title
        }
    }
)

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

const resolveUserApiSettings = async (userId) => {
    const userDoc = await admin.firestore().collection('users').doc(userId).get()
    const apiKey = userDoc.data()?.openAi?.openaiKey
    const selectedModel = sanitizeModelId(userDoc.data()?.openAi?.model || DEFAULT_MODEL)
    return { apiKey, selectedModel }
}

const buildAssistantReply = async (messages, apiKey, modelId = DEFAULT_MODEL) => {
    const openai = new OpenAI({ apiKey })
    const response = await openai.responses.create({
        model: modelId,
        input: normalizeMessagesForInput(messages),
        ...RESPONSE_OPTIONS
    })

    const assistantResponse = response.output_text?.trim()
    if (!assistantResponse) {
        throw new Error('No response received from OpenAI.')
    }

    const firstUserMessage = messages.find((message) => message.role === 'user')?.content
    let title = null

    if (firstUserMessage) {
        const titleResponse = await openai.responses.create({
            model: DEFAULT_MODEL,
            input: [
                {
                    role: 'system',
                    content: [{
                        type: 'input_text',
                        text: 'Create a short and clear chat title from the user prompt. '
                            + 'Return title text only.'
                    }]
                },
                {
                    role: 'user',
                    content: [{ type: 'input_text', text: firstUserMessage }]
                }
            ]
        })
        title = titleResponse.output_text?.trim() || null
    }

    return { assistantResponse, title }
}

const streamAssistantReply = async (
    messages,
    apiKey,
    onDelta,
    onReasoningDelta,
    onSource,
    onStatus,
    modelId = DEFAULT_MODEL
) => {
    const openai = new OpenAI({ apiKey })
    const responseStream = await openai.responses.create({
        model: modelId,
        input: normalizeMessagesForInput(messages),
        ...RESPONSE_OPTIONS,
        stream: true
    })

    let fullText = ''
    const collectedSources = []
    const seenSourceUrls = new Set()

    const recordSource = (annotation) => {
        if (!annotation?.url || seenSourceUrls.has(annotation.url)) return
        seenSourceUrls.add(annotation.url)
        const source = {
            url: annotation.url,
            title: annotation.title || ''
        }
        collectedSources.push(source)
        if (onSource) onSource(source)
    }
    const emitStatus = (state, message) => {
        if (onStatus) {
            onStatus({ state, message })
        }
    }
    emitStatus('thinking', 'Analyzing your request...')

    for await (const event of responseStream) {
        if (event.type === 'response.output_text.delta' && event.delta) {
            emitStatus('responding', 'Generating answer...')
            fullText += event.delta
            onDelta(event.delta)
        }

        if (
            (
                event.type === 'response.reasoning_summary_text.delta'
                || event.type === 'response.reasoning.delta'
            )
            && event.delta
        ) {
            emitStatus('thinking', 'Reasoning...')
            onReasoningDelta(event.delta)
        }

        if (
            event.type.includes('web_search')
            || event.type.includes('file_search')
            || event.type.includes('tool_call')
        ) {
            emitStatus('searching', 'Searching the web...')
        }

        if (
            event.type === 'response.output_text.annotation.added'
            && event.annotation?.type === 'url_citation'
        ) {
            recordSource(event.annotation)
        }

        if (event.type === 'response.completed' && event.response?.output) {
            event.response.output.forEach((outputItem) => {
                outputItem?.content?.forEach?.((contentPart) => {
                    contentPart?.annotations?.forEach?.((annotation) => {
                        if (annotation?.type === 'url_citation') {
                            recordSource(annotation)
                        }
                    })
                })
            })
        }
    }

    if (!fullText.trim()) {
        throw new Error('No response received from OpenAI.')
    }

    const firstUserMessage = messages.find((message) => message.role === 'user')?.content
    let title = null

    if (firstUserMessage) {
        const titleResponse = await openai.responses.create({
            model: DEFAULT_MODEL,
            input: [
                {
                    role: 'system',
                    content: [{
                        type: 'input_text',
                        text: 'Create a short and clear chat title from the user prompt. '
                            + 'Return title text only.'
                    }]
                },
                {
                    role: 'user',
                    content: [{ type: 'input_text', text: firstUserMessage }]
                }
            ]
        })
        title = titleResponse.output_text?.trim() || null
    }

    return { assistantResponse: fullText, title, sources: collectedSources }
}

exports.generateChatResponseHttp = onRequest(
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
            const { messages } = req.body || {}

            if (!ensureStringContentMessages(messages)) {
                res.status(400).json({ error: 'Invalid messages payload.' })
                return
            }

            const { apiKey, selectedModel } = await resolveUserApiSettings(userId)

            if (!apiKey) {
                res.status(412).json({ error: 'OpenAI API key is missing.' })
                return
            }

            const result = await buildAssistantReply(messages, apiKey, selectedModel)
            res.status(200).json(result)
        } catch (error) {
            console.error('generateChatResponseHttp failed:', error)
            const openAiMessage = error?.error?.message || error?.message || ''
            const openAiCode = error?.code || error?.error?.code || ''
            const openAiStatus = Number(error?.status)

            if (openAiCode === 'insufficient_quota' || openAiStatus === 429) {
                res.status(429).json({
                    error: 'OpenAI quota exceeded for this API key. '
                        + 'Check billing/usage in your OpenAI account.',
                    code: openAiCode || 'insufficient_quota'
                })
                return
            }

            if (openAiStatus === 401) {
                res.status(401).json({
                    error: 'OpenAI rejected this API key. Please update your key in settings.',
                    code: openAiCode || 'invalid_api_key'
                })
                return
            }

            res.status(500).json({
                error: openAiMessage || 'Failed generating response.'
            })
        }
    }
)

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
            const { messages } = req.body || {}

            if (!ensureStringContentMessages(messages)) {
                res.status(400).json({ error: 'Invalid messages payload.' })
                return
            }

            const { apiKey, selectedModel } = await resolveUserApiSettings(userId)

            if (!apiKey) {
                res.status(412).json({ error: 'OpenAI API key is missing.' })
                return
            }

            res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache, no-transform')
            res.setHeader('Connection', 'keep-alive')
            // Flush an immediate event so proxies/browsers don't time out
            // waiting for the first streamed token on complex prompts.
            res.write(`${JSON.stringify({ type: 'status', state: 'started' })}\n`)

            const result = await streamAssistantReply(
                messages,
                apiKey,
                (delta) => {
                    res.write(`${JSON.stringify({ type: 'delta', delta })}\n`)
                },
                (reasoningDelta) => {
                    res.write(`${JSON.stringify({ type: 'reasoning', delta: reasoningDelta })}\n`)
                },
                (source) => {
                    res.write(`${JSON.stringify({ type: 'source', source })}\n`)
                },
                (status) => {
                    res.write(`${JSON.stringify({ type: 'status', ...status })}\n`)
                },
                selectedModel
            )

            res.write(`${JSON.stringify({ type: 'done', ...result })}\n`)
            res.end()
        } catch (error) {
            console.error('generateChatResponseStreamHttp failed:', error)
            const openAiMessage = error?.error?.message || error?.message || ''
            const openAiCode = error?.code || error?.error?.code || ''
            const openAiStatus = Number(error?.status)

            if (openAiCode === 'insufficient_quota' || openAiStatus === 429) {
                res.status(429).json({
                    error: 'OpenAI quota exceeded for this API key. '
                        + 'Check billing/usage in your OpenAI account.',
                    code: openAiCode || 'insufficient_quota'
                })
                return
            }

            if (openAiStatus === 401) {
                res.status(401).json({
                    error: 'OpenAI rejected this API key. Please update your key in settings.',
                    code: openAiCode || 'invalid_api_key'
                })
                return
            }

            res.status(500).json({
                error: openAiMessage || 'Failed generating response.'
            })
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
            const { apiKey } = await resolveUserApiSettings(userId)

            if (!apiKey) {
                res.status(412).json({ error: 'OpenAI API key is missing.' })
                return
            }

            const openai = new OpenAI({ apiKey })
            const modelsResponse = await openai.models.list()
            const models = (modelsResponse.data || [])
                .map((model) => model?.id)
                .filter(Boolean)
                .filter((modelId) => !MODEL_BLOCKLIST_SUBSTRINGS.some(
                    (blocked) => modelId.includes(blocked)
                ))
                .sort((a, b) => a.localeCompare(b))
                .map((id) => ({ id }))

            res.status(200).json({ models, defaultModel: DEFAULT_MODEL })
        } catch (error) {
            console.error('listAvailableModelsHttp failed:', error)
            const openAiMessage = error?.error?.message || error?.message || ''
            const openAiStatus = Number(error?.status)
            if (openAiStatus === 401) {
                res.status(401).json({
                    error: 'OpenAI rejected this API key. Please update your key in settings.'
                })
                return
            }
            res.status(500).json({
                error: openAiMessage || 'Failed fetching available models.'
            })
        }
    }
)
