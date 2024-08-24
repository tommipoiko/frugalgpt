import OpenAI from 'openai'

const createOpenAiClient = (apiKey) => new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
})

const sendMessage = async (message, apiKey, assistantId, chatId = null) => {
    try {
        const openai = createOpenAiClient(apiKey)
        let threadId = chatId

        if (!threadId) {
            const threadResponse = await openai.beta.threads.create()
            threadId = threadResponse.id
        }

        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message.text
        })

        const responseStream = openai.beta.threads.runs.stream(threadId, {
            assistant_id: assistantId
        })

        return { responseStream, threadId }
    } catch (error) {
        console.error('Error sending message to OpenAI:', error)
        return null
    }
}

export default {
    sendMessage
}
