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

        if (!chatId) {
            const newChat = {
                name: `Chat-${threadId}`,
                threadId,
                messages: [{ role: 'user', content: message.text }]
            }
            await setDoc(doc(db, 'chats', threadId), newChat)
        } else {
            await setDoc(doc(db, 'chats', chatId), {
                messages: [{ role: 'user', content: message.text }]
            }, { merge: true })
        }

        return responseStream
    }

    return null
}

export default {
    sendMessage
}
