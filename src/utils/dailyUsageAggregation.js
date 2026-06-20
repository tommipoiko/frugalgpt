import { normalizeProviderUsage } from './usageCost'

export const USAGE_WINDOW_DAYS = 30

const PROVIDER_IDS = ['openai', 'anthropic', 'google', 'mistral']

const emptyDayRecord = () => ({
    inputTokens: 0,
    outputTokens: 0,
    webSearches: 0,
    turns: 0
})

export function getUsageCutoffDate() {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - USAGE_WINDOW_DAYS)
    cutoff.setHours(0, 0, 0, 0)
    return cutoff
}

export function toLocalDateKey(isoString) {
    if (!isoString) return null
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function extractWebSearchCount(provider, usage) {
    if (!usage) return 0
    switch (provider) {
    case 'openai':
        return usage.webSearchCalls || 0
    case 'google':
        return usage.webSearchQueries || 0
    case 'anthropic':
    case 'mistral':
        return usage.webSearchRequests || 0
    default:
        return usage.webSearchCalls
            || usage.webSearchQueries
            || usage.webSearchRequests
            || 0
    }
}

const resolveMessageProvider = (message, chatContext = {}) => {
    if (PROVIDER_IDS.includes(message.provider)) return message.provider
    if (PROVIDER_IDS.includes(chatContext.provider)) return chatContext.provider
    return null
}

const isMessageInUsageWindow = (message, cutoffDate) => {
    if (!cutoffDate) return true
    if (message.costRecordedAt) {
        const recordedAt = new Date(message.costRecordedAt)
        return !Number.isNaN(recordedAt.getTime()) && recordedAt >= cutoffDate
    }
    return true
}

export function aggregateDailyUsageFromMessages(messages, cutoffDate, chatContext = {}) {
    const byDate = {}

    if (!Array.isArray(messages)) return byDate

    messages.forEach((message) => {
        if (message?.role !== 'system') return
        if (!isMessageInUsageWindow(message, cutoffDate)) return

        const provider = resolveMessageProvider(message, chatContext)
        if (!provider) return

        const dateKey = toLocalDateKey(message.costRecordedAt)
        if (!dateKey) return

        const usage = normalizeProviderUsage(provider, message.usage)
        if (!usage) return

        if (!byDate[dateKey]) byDate[dateKey] = emptyDayRecord()

        byDate[dateKey].inputTokens += usage.inputTokens || 0
        byDate[dateKey].outputTokens += usage.outputTokens || 0
        byDate[dateKey].webSearches += extractWebSearchCount(provider, usage)
        byDate[dateKey].turns += 1
    })

    return byDate
}

export function mergeDailyUsageMaps(...maps) {
    const merged = {}

    maps.forEach((map) => {
        if (!map || typeof map !== 'object') return
        Object.entries(map).forEach(([dateKey, record]) => {
            if (!merged[dateKey]) merged[dateKey] = emptyDayRecord()
            merged[dateKey].inputTokens += record.inputTokens || 0
            merged[dateKey].outputTokens += record.outputTokens || 0
            merged[dateKey].webSearches += record.webSearches || 0
            merged[dateKey].turns += record.turns || 0
        })
    })

    return merged
}

export function computeAverageDailyUsage(byDate) {
    const activeDays = Object.values(byDate || {}).filter((record) => record.turns > 0)
    if (activeDays.length === 0) return null

    const totals = activeDays.reduce((sum, record) => ({
        inputTokens: sum.inputTokens + (record.inputTokens || 0),
        outputTokens: sum.outputTokens + (record.outputTokens || 0),
        webSearches: sum.webSearches + (record.webSearches || 0),
        turns: sum.turns + (record.turns || 0)
    }), emptyDayRecord())

    const count = activeDays.length
    return {
        inputTokens: Math.round(totals.inputTokens / count),
        outputTokens: Math.round(totals.outputTokens / count),
        webSearches: Math.round(totals.webSearches / count),
        turns: Math.round(totals.turns / count),
        activeDays: count
    }
}

export function formatCompactCount(value) {
    const n = typeof value === 'number' ? value : 0
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    if (n >= 10_000) return `${Math.round(n / 1000)}K`
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
    return String(n)
}
