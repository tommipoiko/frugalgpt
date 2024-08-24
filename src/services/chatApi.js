import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion
} from 'firebase/firestore'
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

        if (!chatId) {
            const newChat = {
                name: `Chat-${threadId}`,
                threadId,
                messages: [{ id: Date.now(), role: 'user', content: message.content }],
                lastUpdated: serverTimestamp()
            }
            await setDoc(doc(db, 'chats', threadId), newChat)
        } else {
            await updateDoc(doc(db, 'chats', chatId), {
                messages: arrayUnion({ id: Date.now(), role: 'user', content: message.content }),
                lastUpdated: serverTimestamp()
            })
        }

        return responseStream
    }

    return null
}

const saveCompletedMessage = async (chatId, messages) => {
    console.log(chatId, messages)
    await updateDoc(doc(db, 'chats', chatId), {
        messages,
        lastUpdated: serverTimestamp()
    })
}

export default {
    sendMessage,
    saveCompletedMessage
}
