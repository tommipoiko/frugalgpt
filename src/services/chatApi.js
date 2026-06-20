import {
    addDoc,
    collection,
    deleteField,
    doc,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { buildAttachmentParts } from '../utils/attachmentParts'
import { sumChatCostUsd } from '../utils/chatCost'
import { createNameForChat } from '../utils/chatTitle'

const LIST_AVAILABLE_MODELS_HTTP_URL = process.env.REACT_APP_LIST_AVAILABLE_MODELS_HTTP_URL
    || 'https://europe-north1-frugalgpt.cloudfunctions.net/'
    + 'listAvailableModelsHttp'
const CURATE_MODELS_HTTP_URL = process.env.REACT_APP_CURATE_MODELS_HTTP_URL
    || 'https://europe-north1-frugalgpt.cloudfunctions.net/'
    + 'curateModelsHttp'

const buildTitleSeed = (message) => {
    const text = message.content?.trim()
    if (text) return text
    if (Array.isArray(message.attachments) && message.attachments.length) {
        return message.attachments.map((a) => a.name).filter(Boolean).join(', ')
    }
    return ''
}

const queueChatGeneration = async (
    message,
    existingMessages = [],
    chatId = null,
    options = {}
) => {
    const user = auth.currentUser
    if (!user) {
        throw new Error('User not authenticated')
    }

    const {
        provider = 'openai',
        model,
        modelKey = null,
        modelLabel = null,
        providerLabel = null,
        reasoningEnabled = true,
        webSearchEnabled = true,
        inferenceForDoc = null,
        attachmentFiles = []
    } = options

    const docReasoning = inferenceForDoc?.reasoningEnabled
    const docWeb = inferenceForDoc?.webSearchEnabled
    const persistReasoning = typeof docReasoning === 'boolean' ? docReasoning : reasoningEnabled
    const persistWeb = typeof docWeb === 'boolean' ? docWeb : webSearchEnabled

    const attachmentParts = attachmentFiles.length
        ? await buildAttachmentParts(attachmentFiles)
        : []
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const messages = [...existingMessages, message]
    const titleSeed = buildTitleSeed(message)
    const fallbackTitle = createNameForChat(titleSeed)

    const inferenceFields = {
        provider,
        model: model || null,
        ...(typeof modelKey === 'string' && modelKey.trim()
            ? { modelKey: modelKey.trim() }
            : {}),
        ...(typeof modelLabel === 'string' && modelLabel.trim()
            ? { modelLabel: modelLabel.trim() }
            : {}),
        ...(typeof providerLabel === 'string' && providerLabel.trim()
            ? { providerLabel: providerLabel.trim() }
            : {}),
        reasoningEnabled: persistReasoning,
        webSearchEnabled: persistWeb
    }

    const generationFields = {
        generationStatus: 'queued',
        generationActivity: 'thinking',
        generationError: null,
        pendingGeneration: {
            requestId,
            attachmentParts,
            reasoningEnabled,
            webSearchEnabled
        }
    }

    if (!chatId) {
        const createdChat = await addDoc(collection(db, 'chats'), {
            name: fallbackTitle,
            userId: user.uid,
            messages,
            totalCostUsd: sumChatCostUsd(messages),
            lastUpdated: serverTimestamp(),
            ...inferenceFields,
            ...generationFields
        })
        return { chatId: createdChat.id }
    }

    await updateDoc(doc(db, 'chats', chatId), {
        messages,
        totalCostUsd: sumChatCostUsd(messages),
        lastUpdated: serverTimestamp(),
        userId: user.uid,
        ...inferenceFields,
        ...generationFields
    })

    return { chatId }
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

const clearChatGenerationError = async (chatId) => {
    const user = auth.currentUser
    if (!user || !chatId) return
    await updateDoc(doc(db, 'chats', chatId), {
        generationError: deleteField()
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
    queueChatGeneration,
    fetchAvailableModels,
    updateChatInferenceDoc,
    clearChatGenerationError,
    saveUserChatDefaults,
    runModelCuration
}
