const normalizeMessagesForOpenAiInput = (messages, attachmentParts = []) => {
    const wired = [...messages]
    if (attachmentParts.length) {
        for (let i = wired.length - 1; i >= 0; i -= 1) {
            if (wired[i].role === 'user') {
                wired[i] = { ...wired[i], _attachmentParts: attachmentParts }
                break
            }
        }
    }

    return wired
        .filter((message) => message?.content || message?._attachmentParts?.length)
        .map((message) => {
            const normalizedRole = message.role === 'system' ? 'assistant' : message.role
            const parts = []
            if (message.content) {
                parts.push({
                    type: normalizedRole === 'assistant' ? 'output_text' : 'input_text',
                    text: message.content
                })
            }
            if (message._attachmentParts) {
                message._attachmentParts.forEach((part) => {
                    if (part.kind === 'image') {
                        parts.push({
                            type: 'input_image',
                            image_url: `data:${part.mimeType};base64,${part.base64}`
                        })
                    } else if (part.kind === 'text' && part.text) {
                        parts.push({
                            type: 'input_text',
                            text: `\n\n--- ${part.name} ---\n${part.text}`
                        })
                    } else if (part.note) {
                        parts.push({ type: 'input_text', text: `\n${part.note}` })
                    }
                })
            }
            return {
                role: normalizedRole,
                content: parts.length ? parts : [{ type: 'input_text', text: '' }]
            }
        })
}

const toAnthropicMessages = (messages) => messages
    .filter((m) => m?.content && ['user', 'system'].includes(m.role))
    .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
    }))

const toMistralMessages = (messages) => messages
    .filter((m) => m?.content && ['user', 'system', 'assistant'].includes(m.role))
    .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
    }))

const toGeminiPrompt = (messages) => messages
    .filter((m) => m?.content && ['user', 'system', 'assistant'].includes(m.role))
    .map((m) => `${m.role === 'system' ? 'assistant' : m.role}: ${m.content}`)
    .join('\n\n')

const createSourceRecorder = (onSource) => {
    const collectedSources = []
    const seenSourceUrls = new Set()

    const recordSource = (rawSource) => {
        const sourceUrl = String(rawSource?.url || rawSource?.uri || '').trim()
        if (!sourceUrl || seenSourceUrls.has(sourceUrl)) return
        seenSourceUrls.add(sourceUrl)
        const source = {
            url: sourceUrl,
            title: String(rawSource?.title || rawSource?.name || '').trim()
        }
        collectedSources.push(source)
        if (onSource) onSource(source)
    }

    return { collectedSources, recordSource }
}

const collectSourcesFromUnknown = (value, recordSource) => {
    if (!value) return
    if (Array.isArray(value)) {
        value.forEach((item) => collectSourcesFromUnknown(item, recordSource))
        return
    }
    if (typeof value !== 'object') return
    const maybeUrl = typeof value.url === 'string'
        ? value.url
        : (typeof value.uri === 'string' ? value.uri : '')
    if (maybeUrl) {
        recordSource({
            url: maybeUrl,
            title: value.title || value.name || ''
        })
    }
    Object.values(value).forEach((child) => collectSourcesFromUnknown(child, recordSource))
}

const parseSseDataLines = async (responseBody, onJson) => {
    const reader = responseBody.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
            parseSseLine(line, onJson)
        }
    }

    if (buffer.trim()) {
        parseSseLine(buffer, onJson)
    }
}

const parseSseLine = (line, onJson) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const data = trimmed.slice(5).trim()
    if (data === '[DONE]' || !data) return
    try {
        const json = JSON.parse(data)
        onJson(json)
    } catch {
        // ignore partial JSON chunks
    }
}

const enrichModelRow = (provider, id, inferCapabilities) => ({
    id,
    capabilities: inferCapabilities(provider, id),
    shortLabel: id,
    relativeCost: 1
})

module.exports = {
    normalizeMessagesForOpenAiInput,
    toAnthropicMessages,
    toMistralMessages,
    toGeminiPrompt,
    createSourceRecorder,
    collectSourcesFromUnknown,
    parseSseDataLines,
    enrichModelRow
}
