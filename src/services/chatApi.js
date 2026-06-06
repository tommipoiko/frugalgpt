import {
    addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { buildAttachmentParts } from '../utils/attachmentParts'

const createNameForChat = async (titleSeed) => {
    if (!titleSeed || typeof titleSeed !== 'string' || !titleSeed.trim()) return 'New chat'
    const trimmed = titleSeed.trim().replace(/\s+/g, ' ')
    if (trimmed.length <= 48) return trimmed
    return `${trimmed.slice(0, 45)}…`
}

const toOpenAiMessages = (messages) => messages
    .filter((message) => {
        if (!message || !['user', 'system'].includes(message.role)) return false
        const text = typeof message.content === 'string' ? message.content.trim() : ''
        if (message.role === 'system') return text.length > 0
        const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0
        return text.length > 0 || hasAttachments
    })
    .map((message) => ({
        role: message.role,
        content: typeof message.content === 'string' ? message.content : ''
    }))

const CHAT_RESPONSE_STREAM_HTTP_URL = process.env.REACT_APP_CHAT_RESPONSE_STREAM_HTTP_URL
    || 'https://europe-north1-frugalgpt.cloudfunctions.net/'
    + 'generateChatResponseStreamHttp'
const LIST_AVAILABLE_MODELS_HTTP_URL = process.env.REACT_APP_LIST_AVAILABLE_MODELS_HTTP_URL
    || 'https://europe-north1-frugalgpt.cloudfunctions.net/'
    + 'listAvailableModelsHttp'
const CURATE_MODELS_HTTP_URL = process.env.REACT_APP_CURATE_MODELS_HTTP_URL
    || 'https://europe-north1-frugalgpt.cloudfunctions.net/'
    + 'curateModelsHttp'

/** Firestore rejects `undefined` anywhere under `messages`. */
const omitUndefinedKeys = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

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
    onStatusUpdate = null,
    options = {}
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

    const {
        provider = 'openai',
        model,
        modelKey = null,
        reasoningEnabled = true,
        webSearchEnabled = true,
        inferenceForDoc = null,
        attachmentFiles = []
    } = options

    const docReasoning = inferenceForDoc?.reasoningEnabled
    const docWeb = inferenceForDoc?.webSearchEnabled
    const persistReasoning = typeof docReasoning === 'boolean' ? docReasoning : reasoningEnabled
    const persistWeb = typeof docWeb === 'boolean' ? docWeb : webSearchEnabled

    const conversation = toOpenAiMessages([...existingMessages, message])
    const attachmentParts = attachmentFiles.length
        ? await buildAttachmentParts(attachmentFiles)
        : []
    const idToken = await user.getIdToken()
    const response = await fetch(CHAT_RESPONSE_STREAM_HTTP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
            messages: conversation,
            attachmentParts,
            provider,
            model: model || undefined,
            reasoningEnabled,
            webSearchEnabled
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
    let streamErrorMessage = ''
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
        if (event.type === 'error') {
            streamErrorMessage = event.error || 'Failed generating response.'
            if (onStatusUpdate) {
                onStatusUpdate({ state: 'error', message: streamErrorMessage })
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

    if (streamErrorMessage) {
        throw new Error(streamErrorMessage)
    }

    if (!assistantResponse) {
        throw new Error('No response received from the model.')
    }

    const assistantMessage = {
        id: Date.now() + 1,
        role: 'system',
        content: assistantResponse,
        sources: collectedSources
    }
    const finalMessages = [...existingMessages, message, assistantMessage].map((m) => {
        const cleaned = omitUndefinedKeys(m)
        if (Array.isArray(cleaned.sources)) {
            cleaned.sources = cleaned.sources.map((s) => omitUndefinedKeys(s))
        }
        return cleaned
    })

    const inferenceFields = {
        provider,
        model: model || null,
        ...(typeof modelKey === 'string' && modelKey.trim() ? { modelKey: modelKey.trim() } : {}),
        reasoningEnabled: persistReasoning,
        webSearchEnabled: persistWeb
    }

    if (!chatId) {
        const titleSeed = message.content?.trim()
            || (Array.isArray(message.attachments) && message.attachments.length
                ? message.attachments.map((a) => a.name).filter(Boolean).join(', ')
                : '')
        const fallbackTitle = await createNameForChat(titleSeed)
        const createdChat = await addDoc(collection(db, 'chats'), {
            name: generatedTitle || fallbackTitle,
            userId: user.uid,
            messages: finalMessages,
            lastUpdated: serverTimestamp(),
            ...inferenceFields
        })
        return { chatId: createdChat.id, finalMessages }
    }

    await updateDoc(doc(db, 'chats', chatId), {
        messages: finalMessages,
        lastUpdated: serverTimestamp(),
        userId: user.uid,
        ...inferenceFields
    })

    return { chatId, finalMessages }
}

const fetchAvailableModels = async (provider = 'openai') => {
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
            body: JSON.stringify({ provider })
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
    const defaults = {
        openai: 'gpt-5.4',
        anthropic: 'claude-sonnet-4-6',
        google: 'gemini-3.1-pro-preview',
        mistral: 'magistral-medium-latest'
    }
    return {
        models: Array.isArray(payload.models) ? payload.models : [],
        defaultModel: payload.defaultModel || defaults[provider] || 'gpt-5'
    }
}

const updateChatInferenceDoc = async (chatId, inferenceFields) => {
    const user = auth.currentUser
    if (!user || !chatId) return
    await updateDoc(doc(db, 'chats', chatId), {
        ...inferenceFields,
        lastUpdated: serverTimestamp(),
        userId: user.uid
    })
}

const saveUserChatDefaults = async (defaults) => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    await setDoc(doc(db, 'users', user.uid), {
        chatDefaults: defaults,
        lastUpdated: serverTimestamp()
    }, { merge: true })
}

const runModelCuration = async () => {
    const user = auth.currentUser
    if (!user) {
        throw new Error('User not authenticated')
    }
    const idToken = await user.getIdToken()
    const response = await fetch(CURATE_MODELS_HTTP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({})
    })
    if (!response.ok) {
        let errorMessage = 'Model refresh failed'
        try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
        } catch (e) {
            // ignore
        }
        throw new Error(errorMessage)
    }
    return response.json()
}

export default {
    sendMessage,
    fetchAvailableModels,
    updateChatInferenceDoc,
    saveUserChatDefaults,
    runModelCuration
}
