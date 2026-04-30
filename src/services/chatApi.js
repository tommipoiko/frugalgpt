import {
    addDoc, collection, doc, getDoc, serverTimestamp, updateDoc
} from 'firebase/firestore'
import { auth, db } from './firebase'

const createNameForChat = async (message) => {
    if (!message) return null
    return `Chat-${Date.now()}`
}

const toOpenAiMessages = (messages) => messages
    .filter((message) => message?.content && ['user', 'system'].includes(message.role))
    .map((message) => ({
        role: message.role,
        content: message.content
    }))

const CHAT_RESPONSE_STREAM_HTTP_URL = process.env.REACT_APP_CHAT_RESPONSE_STREAM_HTTP_URL
    || 'https://europe-north1-frugalgpt.cloudfunctions.net/'
    + 'generateChatResponseStreamHttp'
const LIST_AVAILABLE_MODELS_HTTP_URL = process.env.REACT_APP_LIST_AVAILABLE_MODELS_HTTP_URL
    || 'https://europe-north1-frugalgpt.cloudfunctions.net/'
    + 'listAvailableModelsHttp'

const parseStreamEventLines = (rawChunk) => rawChunk
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
        try {
            return JSON.parse(line)
        } catch (e) {
            return null
        }
    })
    .filter(Boolean)

const sendMessage = async (
    message,
    existingMessages = [],
    chatId = null,
    onAssistantDelta = null,
    onReasoningDelta = null,
    onSourcesUpdate = null,
    onStatusUpdate = null
) => {
    const user = auth.currentUser
    if (!user) {
        throw new Error('User not authenticated')
    }

    const docRef = doc(db, 'users', user.uid)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
        throw new Error('User settings not found')
    }

    const data = docSnap.data()
    const apiKey = data?.openAi?.openaiKey

    if (!apiKey) {
        throw new Error('OpenAI API key is missing')
    }

    const conversation = toOpenAiMessages([...existingMessages, message])
    const idToken = await user.getIdToken()
    const response = await fetch(CHAT_RESPONSE_STREAM_HTTP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
            messages: conversation
        })
    })

    if (!response.ok) {
        let errorMessage = 'Failed to generate response'
        try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
        } catch (e) {
            // Keep generic message if no JSON body is available.
        }
        throw new Error(errorMessage)
    }

    if (!response.body) {
        throw new Error('Streaming response is not supported in this browser.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let chunkRemainder = ''
    let assistantResponse = ''
    let generatedTitle = null
    const collectedSources = []
    const seenSourceUrls = new Set()
    const addSource = (source) => {
        if (!source?.url || seenSourceUrls.has(source.url)) return
        seenSourceUrls.add(source.url)
        collectedSources.push(source)
        if (onSourcesUpdate) {
            onSourcesUpdate([...collectedSources])
        }
    }
    const processStreamEvent = (event) => {
        if (event.type === 'delta') {
            assistantResponse += event.delta || ''
            if (onAssistantDelta) {
                onAssistantDelta(assistantResponse)
            }
            if (onReasoningDelta) {
                onReasoningDelta('')
            }
        }

        if (event.type === 'reasoning' && onReasoningDelta) {
            onReasoningDelta(event.delta || '')
        }

        if (event.type === 'status' && onStatusUpdate) {
            onStatusUpdate({
                state: event.state || 'thinking',
                message: event.message || ''
            })
        }

        if (event.type === 'source' && event.source) {
            addSource(event.source)
        }

        if (event.type === 'done') {
            generatedTitle = event.title || null
            assistantResponse = event.assistantResponse || assistantResponse
            if (Array.isArray(event.sources)) {
                event.sources.forEach(addSource)
            }
            if (onAssistantDelta) {
                onAssistantDelta(assistantResponse)
            }
            if (onReasoningDelta) {
                onReasoningDelta('')
            }
            if (onStatusUpdate) {
                onStatusUpdate({ state: 'done', message: '' })
            }
        }
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
        // Streaming requires sequential reads from the same reader.
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await reader.read()
        if (done) break

        chunkRemainder += decoder.decode(value, { stream: true })
        const lines = chunkRemainder.split('\n')
        chunkRemainder = lines.pop() || ''

        const parsedEvents = parseStreamEventLines(lines.join('\n'))
        parsedEvents.forEach(processStreamEvent)
    }

    const finalEvents = parseStreamEventLines(chunkRemainder)
    finalEvents.forEach(processStreamEvent)

    if (!assistantResponse) {
        throw new Error('No response received from OpenAI')
    }

    const assistantMessage = {
        id: Date.now() + 1,
        role: 'system',
        content: assistantResponse,
        sources: collectedSources
    }
    const finalMessages = [...existingMessages, message, assistantMessage]

    if (!chatId) {
        const fallbackTitle = await createNameForChat(message.content)
        const createdChat = await addDoc(collection(db, 'chats'), {
            name: generatedTitle || fallbackTitle,
            userId: user.uid,
            messages: finalMessages,
            lastUpdated: serverTimestamp()
        })
        return { chatId: createdChat.id, finalMessages }
    }

    await updateDoc(doc(db, 'chats', chatId), {
        messages: finalMessages,
        lastUpdated: serverTimestamp(),
        userId: user.uid
    })

    return { chatId, finalMessages }
}

const fetchAvailableModels = async () => {
    const user = auth.currentUser
    if (!user) {
        throw new Error('User not authenticated')
    }
    const idToken = await user.getIdToken()
    let response
    try {
        response = await fetch(LIST_AVAILABLE_MODELS_HTTP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({})
        })
    } catch (error) {
        throw new Error(
            'Could not reach listAvailableModelsHttp. '
            + 'Deploy latest functions, then reload settings.'
        )
    }

    if (!response.ok) {
        let errorMessage = 'Failed to fetch available models'
        try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
        } catch (e) {
            // Keep generic message if no JSON body is available.
        }
        throw new Error(errorMessage)
    }

    const payload = await response.json()
    return {
        models: Array.isArray(payload.models) ? payload.models : [],
        defaultModel: payload.defaultModel || 'gpt-5'
    }
}

export default {
    sendMessage,
    fetchAvailableModels
}
