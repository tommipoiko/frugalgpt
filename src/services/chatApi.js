import { doc, getDoc, setDoc } from 'firebase/firestore'
import openAi from './openAi'
import { auth, db } from './firebase'

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
        } = await openAi.sendMessage(message, apiKey, assistantId, chatId)

        const chatDocId = chatId || threadId

        const chatDocRef = doc(db, 'chats', chatDocId)
        const chatSnap = await getDoc(chatDocRef)

        if (chatSnap.exists()) {
            await setDoc(chatDocRef, {
                messages: [...chatSnap.data().messages, { role: 'user', content: message.text }]
            }, { merge: true })
        } else {
            const newChat = {
                name: `Chat-${chatDocId}`,
                threadId,
                messages: [{ role: 'user', content: message.text }]
            }
            await setDoc(chatDocRef, newChat)
        }

        return { responseStream, threadId }
    }

    return null
}

const saveCompletedMessage = async (chatId, completeMessage) => {
    const chatDocRef = doc(db, 'chats', chatId)
    const chatSnap = await getDoc(chatDocRef)

    if (chatSnap.exists()) {
        await setDoc(chatDocRef, {
            messages: [...chatSnap.data().messages, { role: 'system', content: completeMessage }]
        }, { merge: true })
    }
}

const getChatMessages = async (chatId) => {
    const chatDocRef = doc(db, 'chats', chatId)
    const chatSnap = await getDoc(chatDocRef)
    return chatSnap.exists() ? chatSnap.data().messages : []
}

export default {
    sendMessage,
    saveCompletedMessage,
    getChatMessages
}
