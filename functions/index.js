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
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
}

const buildAssistantReply = async (messages, apiKey) => {
    const openai = new OpenAI({ apiKey })
    const response = await openai.responses.create({
        model: DEFAULT_MODEL,
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

const streamAssistantReply = async (messages, apiKey, onDelta, onReasoningDelta) => {
    const openai = new OpenAI({ apiKey })
    const responseStream = await openai.responses.create({
        model: DEFAULT_MODEL,
        input: normalizeMessagesForInput(messages),
        ...RESPONSE_OPTIONS,
        stream: true
    })

    let fullText = ''
    for await (const event of responseStream) {
        if (event.type === 'response.output_text.delta' && event.delta) {
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
            onReasoningDelta(event.delta)
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

    return { assistantResponse: fullText, title }
}

exports.generateChatResponseHttp = onRequest(
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
            const { messages } = req.body || {}

            if (!ensureStringContentMessages(messages)) {
                res.status(400).json({ error: 'Invalid messages payload.' })
                return
            }

            const userDoc = await admin.firestore().collection('users').doc(userId).get()
            const apiKey = userDoc.data()?.openAi?.openaiKey

            if (!apiKey) {
                res.status(412).json({ error: 'OpenAI API key is missing.' })
                return
            }

            const result = await buildAssistantReply(messages, apiKey)
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
            const { messages } = req.body || {}

            if (!ensureStringContentMessages(messages)) {
                res.status(400).json({ error: 'Invalid messages payload.' })
                return
            }

            const userDoc = await admin.firestore().collection('users').doc(userId).get()
            const apiKey = userDoc.data()?.openAi?.openaiKey

            if (!apiKey) {
                res.status(412).json({ error: 'OpenAI API key is missing.' })
                return
            }

            res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache, no-transform')
            res.setHeader('Connection', 'keep-alive')

            const result = await streamAssistantReply(
                messages,
                apiKey,
                (delta) => {
                    res.write(`${JSON.stringify({ type: 'delta', delta })}\n`)
                },
                (reasoningDelta) => {
                    res.write(`${JSON.stringify({ type: 'reasoning', delta: reasoningDelta })}\n`)
                }
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
