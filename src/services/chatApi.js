import { doc, getDoc } from 'firebase/firestore'
import openAi from './openAi'
import { auth, db } from './firebase'

const sendMessage = async (message) => {
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

        const responseStream = await openAi.sendMessage(message, apiKey, assistantId)
        return responseStream
    }

    return null
}

export default {
    sendMessage
}
