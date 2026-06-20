/* eslint-disable import/prefer-default-export */
import { computeTurnCost } from './usageCost'
import { resolveMessageModelId } from './modelPricing'

const PROVIDER_IDS = ['openai', 'anthropic', 'google', 'mistral']

const emptyByProvider = () => Object.fromEntries(PROVIDER_IDS.map((id) => [id, 0]))

const readMessageCostUsd = (message) => {
    if (typeof message.costUsd === 'number') return message.costUsd
    if (typeof message.costEur === 'number') return message.costEur
    return null
}

const resolveMessageProvider = (message, chatContext = {}) => {
    if (PROVIDER_IDS.includes(message.provider)) return message.provider
    if (PROVIDER_IDS.includes(chatContext.provider)) return chatContext.provider
    return null
}

export const resolveStoredMessageCostUsd = (message, chatContext = {}, priorMessages = []) => {
    const storedCost = readMessageCostUsd(message)
    if (typeof storedCost === 'number') return storedCost

    const provider = resolveMessageProvider(message, chatContext)
    const modelId = resolveMessageModelId(message, chatContext)
    if (!provider || !modelId) return 0

    if (message?.usage) {
        const { costUsd } = computeTurnCost(
            provider,
            modelId,
            message.usage,
            priorMessages,
            typeof message.content === 'string' ? message.content : ''
        )
        return typeof costUsd === 'number' ? costUsd : 0
    }

    const { costUsd } = computeTurnCost(
        provider,
        modelId,
        null,
        priorMessages,
        typeof message.content === 'string' ? message.content : ''
    )
    return typeof costUsd === 'number' ? costUsd : 0
}

const isMessageInSpendingWindow = (message, cutoffDate) => {
    if (!cutoffDate) return true
    if (message.costRecordedAt) {
        const recordedAt = new Date(message.costRecordedAt)
        return !Number.isNaN(recordedAt.getTime()) && recordedAt >= cutoffDate
    }
    return true
}

const isEstimatedTurn = (message, storedCost) => {
    if (message.costSource === 'estimated' || message.usage?.estimated === true) return true
    if (storedCost !== null) return false
    return !message?.usage
}

export function aggregateMessageCosts(messages, cutoffDate, chatContext = {}) {
    const byProvider = emptyByProvider()
    let totalUsd = 0
    let measuredTurns = 0
    let estimatedTurns = 0

    if (!Array.isArray(messages)) {
        return {
            totalUsd, byProvider, measuredTurns, estimatedTurns
        }
    }

    const priorMessages = []

    messages.forEach((message) => {
        if (message?.role !== 'system') {
            priorMessages.push(message)
            return
        }

        if (!isMessageInSpendingWindow(message, cutoffDate)) return

        const storedCost = readMessageCostUsd(message)
        const costUsd = resolveStoredMessageCostUsd(message, chatContext, priorMessages)
        if (!costUsd) {
            priorMessages.push(message)
            return
        }

        const provider = resolveMessageProvider(message, chatContext)
        if (provider) {
            byProvider[provider] += costUsd
        }
        totalUsd += costUsd

        if (isEstimatedTurn(message, storedCost)) {
            estimatedTurns += 1
        } else {
            measuredTurns += 1
        }

        priorMessages.push(message)
    })

    return {
        totalUsd,
        byProvider,
        measuredTurns,
        estimatedTurns
    }
}
