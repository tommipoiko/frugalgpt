import { resolveStoredMessageCostUsd } from './spendingAggregation'

const readStoredCost = (message) => {
    if (typeof message.costUsd === 'number') return message.costUsd
    if (typeof message.costEur === 'number') return message.costEur
    return null
}

export function sumChatCostUsd(messages, chatContext = {}) {
    if (!Array.isArray(messages)) return 0
    const priorMessages = []
    return messages.reduce((sum, message) => {
        if (message?.role !== 'system') {
            priorMessages.push(message)
            return sum
        }
        const costUsd = resolveStoredMessageCostUsd(message, chatContext, priorMessages)
        priorMessages.push(message)
        return sum + costUsd
    }, 0)
}

/** Slight overestimate on aggregate spend so totals stay closer to real billing. */
export const SPENDING_DISPLAY_CUSHION = 1.01

export function formatChatCostUsd(usd) {
    if (typeof usd !== 'number' || !Number.isFinite(usd)) return '0.00'
    if (usd > 0 && usd < 0.01) return '<0.01'
    return usd.toFixed(2)
}

export function applySpendingDisplayCushion(usd) {
    if (typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0) return 0
    return usd * SPENDING_DISPLAY_CUSHION
}

export function formatDisplayedSpendingUsd(usd) {
    return formatChatCostUsd(applySpendingDisplayCushion(usd))
}

export function summarizeChatCost(messages, chatContext = {}) {
    let measuredTurns = 0
    let estimatedTurns = 0
    const priorMessages = []

    if (Array.isArray(messages)) {
        messages.forEach((message) => {
            if (message?.role !== 'system') {
                priorMessages.push(message)
                return
            }
            const storedCost = readStoredCost(message)
            const costUsd = resolveStoredMessageCostUsd(message, chatContext, priorMessages)
            priorMessages.push(message)
            if (!costUsd) return
            const estimated = message.costSource === 'estimated'
                || message.usage?.estimated
                || (storedCost === null && !message.usage)
            if (estimated) {
                estimatedTurns += 1
            } else {
                measuredTurns += 1
            }
        })
    }

    const totalUsd = sumChatCostUsd(messages, chatContext)
    return {
        totalUsd,
        measuredTurns,
        estimatedTurns,
        hasEstimate: estimatedTurns > 0
    }
}

export function buildChatCostTooltip({ measuredTurns, estimatedTurns, hasEstimate }) {
    if (measuredTurns === 0 && estimatedTurns > 0) {
        return 'Estimated from text length and model pricing. Actual billing may differ.'
    }
    if (hasEstimate) {
        return `${measuredTurns} turn(s) priced from API usage (tokens, cache, web search). `
            + `${estimatedTurns} turn(s) estimated. Actual billing may differ slightly.`
    }
    if (measuredTurns > 0) {
        return (
            'Based on API usage: input/output tokens, prompt cache, '
            + 'and web search fees where reported.'
        )
    }
    return 'Send a message to track chat cost.'
}
