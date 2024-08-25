import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion
} from 'firebase/firestore'
import openAi from './openAi'
import { auth, db } from './firebase'

const createNameForChat = async (message, threadId) => {
    const user = auth.currentUser
    if (!user) return null

    const docRef = doc(db, 'users', user.uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
        const data = docSnap.data()
        const apiKey = data?.openAi?.openaiKey

        if (!apiKey) {
            return null
        }

        let response = await openAi.sendMessageToCompletions(message, apiKey)

        if (!response) {
            response = `Chat-${threadId}`
        }

        return response
    }

    return null
}

const sendMessage = async (message, chatId = null) => {
    const user = auth.currentUser
    if (!user) return null

    const docRef = doc(db, 'users', user.uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
        const data = docSnap.data()
        const apiKey = data?.openAi?.openaiKey
        const assistantId = data?.openAi?.assistantId

        if (!apiKey || !assistantId) {
            return null
        }

        const {
            responseStream,
            threadId
        } = await openAi.sendMessageToAssistant(message.content, apiKey, assistantId, chatId)

        if (!chatId) {
            const newName = await createNameForChat(message.content, threadId)
            const newChat = {
                name: newName,
                threadId,
                userId: user.uid,
                messages: [{ id: Date.now(), role: 'user', content: message.content }],
                lastUpdated: serverTimestamp()
            }
            await setDoc(doc(db, 'chats', threadId), newChat)
        } else {
            await updateDoc(doc(db, 'chats', chatId), {
                messages: arrayUnion({ id: Date.now(), role: 'user', content: message.content }),
                lastUpdated: serverTimestamp(),
                userId: user.uid
            })
        }

        return { responseStream, threadId }
    }

    return null
}

const saveCompletedMessage = async (chatId, messages) => {
    const user = auth.currentUser
    if (!user) return

    await updateDoc(doc(db, 'chats', chatId), {
        messages,
        lastUpdated: serverTimestamp(),
        userId: user.uid
    })
}

export default {
    sendMessage,
    saveCompletedMessage
}
