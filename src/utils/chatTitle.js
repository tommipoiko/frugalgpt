const QUESTION_LEAD_INS = [
    /^tell me about\s+/i,
    /^can you (?:please )?(?:help me )?(?:to )?/i,
    /^could you (?:please )?/i,
    /^how (?:do|can|would|should) i\s+/i,
    /^what(?:'s| is| are) (?:the )?/i,
    /^why (?:is|are|do|does)\s+/i,
    /^please (?:help me )?(?:with )?/i,
    /^help me (?:with )?/i,
    /^i (?:want|need|would like) to (?:know (?:about )?)?/i,
    /^i'm (?:trying|looking) to\s+/i
]

const stripQuestionLead = (text) => {
    let trimmed = String(text || '').trim()
    for (let pass = 0; pass < 8; pass += 1) {
        const next = QUESTION_LEAD_INS.reduce(
            (current, pattern) => current.replace(pattern, '').trim(),
            trimmed
        )
        if (next === trimmed) break
        trimmed = next
    }
    return trimmed.replace(/\?+$/, '').trim()
}

const SMALL_TITLE_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs'
])

const toTitleCase = (text) => (
    text.split(/\s+/).filter(Boolean).map((word, index) => {
        if (/^[A-Z0-9]{2,}$/.test(word)) return word
        const lower = word.toLowerCase()
        if (index > 0 && SMALL_TITLE_WORDS.has(lower)) return lower
        return lower.charAt(0).toUpperCase() + lower.slice(1)
    }).join(' ')
)

const truncateTitleWords = (text, maxWords = 5) => {
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length <= maxWords) return words.join(' ')
    return words.slice(0, maxWords).join(' ')
}

export const deriveHeuristicTitle = (userMessage) => {
    const raw = String(userMessage || '').trim()
    if (!raw) return null

    let text = stripQuestionLead(raw)
    if (!text) return null

    text = text.split(/[.!?;,]/)[0].trim()
    text = text
        .replace(/\b(for sale|please|thanks|thank you)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    text = truncateTitleWords(text, 5)
    text = toTitleCase(text)

    if (!text || text.length < 2) return null
    if (text.length > 48) return `${text.slice(0, 45)}…`
    return text
}

export const createNameForChat = (titleSeed) => {
    const heuristic = deriveHeuristicTitle(titleSeed)
    if (heuristic) return heuristic
    if (!titleSeed || typeof titleSeed !== 'string' || !titleSeed.trim()) return 'New chat'
    const trimmed = titleSeed.trim().replace(/\s+/g, ' ')
    if (trimmed.length <= 48) return trimmed
    return `${trimmed.slice(0, 45)}…`
}
