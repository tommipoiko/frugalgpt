/* eslint-disable import/prefer-default-export */
import { getModelPricing, getProviderPricingExtras } from './modelPricing'
import { computeProviderCost } from './usageCost'

function buildSyntheticUsage(provider, averageUsage, webSearches) {
    const base = {
        inputTokens: averageUsage.inputTokens || 0,
        outputTokens: averageUsage.outputTokens || 0,
        estimated: false
    }

    switch (provider) {
    case 'openai':
        return {
            ...base,
            cachedInputTokens: 0,
            totalInputTokens: base.inputTokens,
            webSearchCalls: webSearches
        }
    case 'google':
        return {
            ...base,
            cachedInputTokens: 0,
            totalInputTokens: base.inputTokens,
            webSearchQueries: webSearches
        }
    case 'anthropic':
        return {
            ...base,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
            cacheWrite5mInputTokens: 0,
            cacheWrite1hInputTokens: 0,
            totalInputTokens: base.inputTokens,
            webSearchRequests: webSearches
        }
    case 'mistral':
        return {
            ...base,
            webSearchRequests: webSearches
        }
    default:
        return base
    }
}

export function estimateDailyModelCost(
    modelEntry,
    averageUsage,
    { webSearchEnabled = false } = {}
) {
    if (!modelEntry || !averageUsage) return null

    const pricing = getModelPricing(modelEntry.provider, modelEntry.apiModelId)
    if (!pricing) return null

    const includeWebSearch = !!modelEntry.webSearch && webSearchEnabled
    const webSearches = includeWebSearch ? (averageUsage.webSearches || 0) : 0
    const usage = buildSyntheticUsage(modelEntry.provider, averageUsage, webSearches)
    const extras = getProviderPricingExtras(modelEntry.provider)
    const breakdown = computeProviderCost(modelEntry.provider, pricing, extras, usage)

    return {
        costUsd: breakdown.costUsd,
        inputTokens: averageUsage.inputTokens,
        outputTokens: averageUsage.outputTokens,
        webSearches,
        activeDays: averageUsage.activeDays
    }
}
