import axios from 'axios'

const sendMessage = async (message, apiKey, assistantId) => {
    try {
        const url = `https://api.openai.com/v1/assistants/${assistantId}/threads`

        const threadResponse = await axios.post(url, {}, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'OpenAI-Beta': 'assistants=v2'
            }
        })

        const threadId = threadResponse.data.id

        await axios.post(`${url}/${threadId}/messages`, {
            role: 'user',
            content: message.text
        }, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'OpenAI-Beta': 'assistants=v2'
            }
        })

        const responseStream = await axios({
            method: 'post',
            url: `${url}/${threadId}/runs/stream`,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'OpenAI-Beta': 'assistants=v2'
            },
            data: {
                assistant_id: assistantId
            },
            responseType: 'stream'
        })

        return responseStream.data
    } catch (error) {
        console.error('Error sending message to OpenAI:', error)
        return null
    }
}

export default {
    sendMessage
}
