import OpenAI from 'openai'

const createOpenAiClient = (apiKey) => new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
})

const sendMessageToCompletions = async (message, apiKey) => {
    try {
        const openai = createOpenAiClient(apiKey)
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You create short, concise headers from prompts given to you. '
                    + 'For example from: "Can I utilize Django views in HTML templates?" '
                    + 'you would create the header: "Using Django Views in HTML". '
                    + 'Never do or reply anything but a fitting header!'
                },
                {
                    role: 'user',
                    content: message.content
                }
            ]
        })

        return response.choices[0].message.content
    } catch (error) {
        console.error('Error sending message to OpenAI:', error)
        return null
    }
}

const sendMessageToAssistant = async (message, apiKey, assistantId, chatId = null) => {
    try {
        const openai = createOpenAiClient(apiKey)
        let threadId = chatId

        if (!threadId) {
            const threadResponse = await openai.beta.threads.create()
            threadId = threadResponse.id
        }

        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message.content
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
    sendMessageToAssistant,
    sendMessageToCompletions
}
