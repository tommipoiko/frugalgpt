const { getModelPricing, getProviderPricingExtras } = require('./loadModels')

const perM = (tokens, rateUsd) => ((tokens || 0) / 1_000_000) * (rateUsd || 0)

const roundUsd = (value) => Math.round((value || 0) * 1_000_000) / 1_000_000

const estimateTokens = (text) => {
    if (!text || typeof text !== 'string') return 0
    return Math.ceil(text.length / 4)
}

const estimateUsage = (messages, assistantResponse) => ({
    inputTokens: estimateTokens(
        (Array.isArray(messages) ? messages : [])
            .map((m) => (typeof m?.content === 'string' ? m.content : ''))
            .join('\n')
    ),
    outputTokens: estimateTokens(assistantResponse),
    estimated: true
})

const readAnthropicCacheWrites = (raw) => {
    const creation = raw.cache_creation
    if (creation && typeof creation === 'object') {
        return {
            cacheWrite5mInputTokens: creation.ephemeral_5m_input_tokens || 0,
            cacheWrite1hInputTokens: creation.ephemeral_1h_input_tokens || 0
        }
    }
    const total = raw.cache_creation_input_tokens || 0
    return {
        cacheWrite5mInputTokens: total,
        cacheWrite1hInputTokens: 0
    }
}

const normalizeAnthropicUsage = (raw) => {
    if (!raw || typeof raw !== 'object') return null
    if (typeof raw.input_tokens !== 'number') return null
    const serverTool = raw.server_tool_use || {}
    const cacheWrites = readAnthropicCacheWrites(raw)
    const inputTokens = raw.input_tokens || 0
    const cacheReadInputTokens = raw.cache_read_input_tokens || 0
    const cacheCreationInputTokens = raw.cache_creation_input_tokens || 0
    return {
        inputTokens,
        outputTokens: raw.output_tokens || 0,
        cacheReadInputTokens,
        cacheCreationInputTokens,
        cacheWrite5mInputTokens: cacheWrites.cacheWrite5mInputTokens,
        cacheWrite1hInputTokens: cacheWrites.cacheWrite1hInputTokens,
        totalInputTokens: inputTokens + cacheReadInputTokens + cacheCreationInputTokens,
        thinkingTokens: raw.output_tokens_details?.thinking_tokens || 0,
        webSearchRequests: serverTool.web_search_requests || 0,
        serviceTier: raw.service_tier || 'standard',
        inferenceGeo: raw.inference_geo || null,
        estimated: false
    }
}

const normalizeOpenAiUsage = (raw) => {
    if (!raw || typeof raw !== 'object') return null
    if (typeof raw.input_tokens !== 'number') return null
    const cachedInputTokens = raw.input_tokens_details?.cached_tokens || 0
    const inputTokens = raw.input_tokens || 0
    return {
        inputTokens: Math.max(0, inputTokens - cachedInputTokens),
        cachedInputTokens,
        totalInputTokens: inputTokens,
        outputTokens: raw.output_tokens || 0,
        reasoningTokens: raw.output_tokens_details?.reasoning_tokens || 0,
        webSearchCalls: raw.web_search_calls || 0,
        serviceTier: raw.service_tier || 'standard',
        estimated: false
    }
}

const normalizeGeminiUsage = (raw) => {
    if (!raw || typeof raw !== 'object') return null
    if (typeof raw.promptTokenCount !== 'number') return null
    const cachedInputTokens = raw.cachedContentTokenCount || 0
    const promptTokens = raw.promptTokenCount || 0
    const thoughtsTokens = raw.thoughtsTokenCount || 0
    const outputTokens = (raw.candidatesTokenCount || 0) + thoughtsTokens
    return {
        inputTokens: Math.max(0, promptTokens - cachedInputTokens),
        cachedInputTokens,
        totalInputTokens: promptTokens,
        outputTokens,
        thoughtsTokens,
        webSearchQueries: raw.webSearchQueries || 0,
        estimated: false
    }
}

const normalizeMistralUsage = (raw) => {
    if (!raw || typeof raw !== 'object') return null
    if (typeof raw.prompt_tokens === 'number') {
        return {
            inputTokens: raw.prompt_tokens || 0,
            outputTokens: raw.completion_tokens || 0,
            webSearchRequests: raw.web_search_requests || raw.agent_tool_calls || 0,
            estimated: false
        }
    }
    return null
}

const normalizeLegacyUsage = (raw) => {
    if (!raw || typeof raw !== 'object') return null
    if (typeof raw.inputTokens === 'number') {
        return {
            inputTokens: raw.inputTokens,
            outputTokens: typeof raw.outputTokens === 'number' ? raw.outputTokens : 0,
            cacheReadInputTokens: raw.cacheReadInputTokens || 0,
            cacheCreationInputTokens: raw.cacheCreationInputTokens || 0,
            cacheWrite5mInputTokens: raw.cacheWrite5mInputTokens || 0,
            cacheWrite1hInputTokens: raw.cacheWrite1hInputTokens || 0,
            cachedInputTokens: raw.cachedInputTokens || 0,
            totalInputTokens: raw.totalInputTokens || raw.inputTokens,
            webSearchRequests: raw.webSearchRequests || 0,
            webSearchCalls: raw.webSearchCalls || 0,
            webSearchQueries: raw.webSearchQueries || 0,
            serviceTier: raw.serviceTier || 'standard',
            inferenceGeo: raw.inferenceGeo || null,
            estimated: raw.estimated === true
        }
    }
    if (typeof raw.input_tokens === 'number') {
        return normalizeAnthropicUsage(raw)
    }
    if (typeof raw.promptTokenCount === 'number') {
        return normalizeGeminiUsage(raw)
    }
    return null
}

const normalizeProviderUsage = (provider, rawUsage) => {
    if (!rawUsage) return null
    if (rawUsage.estimated === true && typeof rawUsage.inputTokens === 'number') {
        return { ...rawUsage, estimated: true }
    }
    switch (provider) {
    case 'anthropic':
        return normalizeAnthropicUsage(rawUsage) || normalizeLegacyUsage(rawUsage)
    case 'openai':
        return normalizeOpenAiUsage(rawUsage) || normalizeLegacyUsage(rawUsage)
    case 'google':
        return normalizeGeminiUsage(rawUsage) || normalizeLegacyUsage(rawUsage)
    case 'mistral':
        return normalizeMistralUsage(rawUsage) || normalizeLegacyUsage(rawUsage)
    default:
        return normalizeLegacyUsage(rawUsage)
    }
}

const applyBatchDiscount = (amount, serviceTier, extras) => {
    if (serviceTier === 'batch' && typeof extras.batchDiscountMultiplier === 'number') {
        return amount * extras.batchDiscountMultiplier
    }
    return amount
}

const applyInferenceGeoMultiplier = (amount, inferenceGeo, pricing, extras) => {
    if (
        inferenceGeo === 'us'
        && pricing.supportsInferenceGeoMultiplier
        && typeof extras.inferenceGeoUsMultiplier === 'number'
    ) {
        return amount * extras.inferenceGeoUsMultiplier
    }
    return amount
}

const resolveLongContextRates = (pricing, totalInputTokens) => {
    const threshold = pricing.longContextInputTokenThreshold
    if (
        !pricing.supportsLongContextPremium
        || !threshold
        || (totalInputTokens || 0) <= threshold
    ) {
        return {
            inputRate: pricing.inputPer1MUsd,
            outputRate: pricing.outputPer1MUsd,
            longContextApplied: false
        }
    }
    const inputMult = pricing.longContextInputMultiplier ?? 2
    const outputMult = pricing.longContextOutputMultiplier ?? 1.5
    return {
        inputRate: pricing.inputPer1MUsd * inputMult,
        outputRate: pricing.outputPer1MUsd * outputMult,
        longContextApplied: true
    }
}

const resolveOpenAiLongContextRates = (pricing, usage) => {
    const threshold = pricing.longContextInputTokenThreshold
    const modelIds = pricing.longContextModelIds || []
    const appliesToModel = modelIds.includes(pricing.modelId)
    if (
        !appliesToModel
        || !threshold
        || (usage.totalInputTokens || 0) <= threshold
    ) {
        return {
            inputRate: pricing.inputPer1MUsd,
            outputRate: pricing.outputPer1MUsd,
            longContextApplied: false
        }
    }
    const inputMult = pricing.longContextInputMultiplier ?? 2
    const outputMult = pricing.longContextOutputMultiplier ?? 1.5
    return {
        inputRate: pricing.inputPer1MUsd * inputMult,
        outputRate: pricing.outputPer1MUsd * outputMult,
        longContextApplied: true
    }
}

const computeAnthropicCost = (pricing, extras, usage) => {
    const { inputRate, outputRate, longContextApplied } = resolveLongContextRates(
        pricing,
        usage.totalInputTokens
    )
    let inputUsd = perM(usage.inputTokens, inputRate)
    let outputUsd = perM(usage.outputTokens, outputRate)
    let cacheReadUsd = perM(
        usage.cacheReadInputTokens,
        inputRate * (extras.cacheReadInputMultiplier ?? 0.1)
    )
    const cacheWrite5mTokens = typeof usage.cacheWrite5mInputTokens === 'number'
        ? usage.cacheWrite5mInputTokens
        : (usage.cacheCreationInputTokens || 0)
    const cacheWrite5mUsd = perM(
        cacheWrite5mTokens,
        inputRate * (extras.cacheWrite5mInputMultiplier ?? 1.25)
    )
    const cacheWrite1hUsd = perM(
        usage.cacheWrite1hInputTokens,
        inputRate * (extras.cacheWrite1hInputMultiplier ?? 2)
    )
    let cacheWriteUsd = cacheWrite5mUsd + cacheWrite1hUsd
    const webSearchUsd = (usage.webSearchRequests || 0) * (extras.webSearchUsdPerRequest ?? 0.01)

    inputUsd = applyBatchDiscount(inputUsd, usage.serviceTier, extras)
    outputUsd = applyBatchDiscount(outputUsd, usage.serviceTier, extras)
    cacheReadUsd = applyBatchDiscount(cacheReadUsd, usage.serviceTier, extras)
    const discountedCacheWrite = applyBatchDiscount(cacheWriteUsd, usage.serviceTier, extras)
    cacheWriteUsd = discountedCacheWrite

    inputUsd = applyInferenceGeoMultiplier(inputUsd, usage.inferenceGeo, pricing, extras)
    outputUsd = applyInferenceGeoMultiplier(outputUsd, usage.inferenceGeo, pricing, extras)
    cacheReadUsd = applyInferenceGeoMultiplier(cacheReadUsd, usage.inferenceGeo, pricing, extras)
    cacheWriteUsd = applyInferenceGeoMultiplier(cacheWriteUsd, usage.inferenceGeo, pricing, extras)

    const costUsd = inputUsd + outputUsd + cacheReadUsd + cacheWriteUsd + webSearchUsd
    return {
        inputUsd: roundUsd(inputUsd),
        outputUsd: roundUsd(outputUsd),
        cacheReadUsd: roundUsd(cacheReadUsd),
        cacheWriteUsd: roundUsd(cacheWriteUsd),
        webSearchUsd: roundUsd(webSearchUsd),
        longContextApplied,
        batchApplied: usage.serviceTier === 'batch',
        inferenceGeoApplied: usage.inferenceGeo === 'us' && pricing.supportsInferenceGeoMultiplier,
        costUsd: roundUsd(costUsd)
    }
}

const computeOpenAiCost = (pricing, extras, usage) => {
    const { inputRate, outputRate, longContextApplied } = resolveOpenAiLongContextRates(pricing, usage)
    const cachedRate = pricing.cachedInputPer1MUsd
        ?? pricing.inputPer1MUsd * (extras.cachedInputMultiplier ?? 0.1)
    let inputUsd = perM(usage.inputTokens, inputRate)
    let cachedInputUsd = perM(usage.cachedInputTokens, cachedRate)
    let outputUsd = perM(usage.outputTokens, outputRate)
    const webSearchRate = pricing.isReasoningModel
        ? (extras.webSearchUsdPerCall ?? 0.01)
        : (extras.webSearchNonReasoningUsdPerCall ?? 0.025)
    const webSearchUsd = (usage.webSearchCalls || 0) * webSearchRate

    inputUsd = applyBatchDiscount(inputUsd, usage.serviceTier, extras)
    cachedInputUsd = applyBatchDiscount(cachedInputUsd, usage.serviceTier, extras)
    outputUsd = applyBatchDiscount(outputUsd, usage.serviceTier, extras)

    const costUsd = inputUsd + cachedInputUsd + outputUsd + webSearchUsd
    return {
        inputUsd: roundUsd(inputUsd),
        cachedInputUsd: roundUsd(cachedInputUsd),
        outputUsd: roundUsd(outputUsd),
        webSearchUsd: roundUsd(webSearchUsd),
        longContextApplied,
        batchApplied: usage.serviceTier === 'batch',
        costUsd: roundUsd(costUsd)
    }
}

const computeGeminiCost = (pricing, extras, usage) => {
    const cachedRate = pricing.cachedInputPer1MUsd
        ?? pricing.inputPer1MUsd * (extras.cachedInputMultiplier ?? 0.25)
    const inputUsd = perM(usage.inputTokens, pricing.inputPer1MUsd)
    const cachedInputUsd = perM(usage.cachedInputTokens, cachedRate)
    const outputUsd = perM(usage.outputTokens, pricing.outputPer1MUsd)
    const webSearchUsd = (usage.webSearchQueries || 0) * (extras.webSearchUsdPerQuery ?? 0.014)
    const costUsd = inputUsd + cachedInputUsd + outputUsd + webSearchUsd
    return {
        inputUsd: roundUsd(inputUsd),
        cachedInputUsd: roundUsd(cachedInputUsd),
        outputUsd: roundUsd(outputUsd),
        webSearchUsd: roundUsd(webSearchUsd),
        costUsd: roundUsd(costUsd)
    }
}

const computeMistralCost = (pricing, extras, usage) => {
    const inputUsd = perM(usage.inputTokens, pricing.inputPer1MUsd)
    const outputUsd = perM(usage.outputTokens, pricing.outputPer1MUsd)
    const toolRequests = usage.webSearchRequests || 0
    const webSearchUsd = toolRequests * (extras.webSearchUsdPerRequest ?? extras.agentToolUsdPerRequest ?? 0.01)
    const costUsd = inputUsd + outputUsd + webSearchUsd
    return {
        inputUsd: roundUsd(inputUsd),
        outputUsd: roundUsd(outputUsd),
        webSearchUsd: roundUsd(webSearchUsd),
        costUsd: roundUsd(costUsd)
    }
}

const computeProviderCost = (provider, pricing, extras, usage) => {
    switch (provider) {
    case 'anthropic':
        return computeAnthropicCost(pricing, extras, usage)
    case 'openai':
        return computeOpenAiCost(pricing, extras, usage)
    case 'google':
        return computeGeminiCost(pricing, extras, usage)
    case 'mistral':
        return computeMistralCost(pricing, extras, usage)
    default: {
        const inputUsd = perM(usage.inputTokens, pricing.inputPer1MUsd)
        const outputUsd = perM(usage.outputTokens, pricing.outputPer1MUsd)
        return { inputUsd, outputUsd, costUsd: roundUsd(inputUsd + outputUsd) }
    }
    }
}

const computeTurnCost = (provider, modelId, rawUsage, messages, assistantResponse) => {
    const pricing = getModelPricing(provider, modelId)
    const extras = getProviderPricingExtras(provider)
    let usage = normalizeProviderUsage(provider, rawUsage)
    let costSource = 'usage'

    if (!usage) {
        usage = estimateUsage(messages, assistantResponse)
        costSource = 'estimated'
    } else if (usage.estimated) {
        costSource = 'estimated'
    }

    if (!pricing) {
        return { usage, costUsd: 0, costSource, costBreakdown: null }
    }

    if (costSource === 'estimated') {
        const inputUsd = perM(usage.inputTokens, pricing.inputPer1MUsd)
        const outputUsd = perM(usage.outputTokens, pricing.outputPer1MUsd)
        const breakdown = {
            inputUsd: roundUsd(inputUsd),
            outputUsd: roundUsd(outputUsd),
            costUsd: roundUsd(inputUsd + outputUsd)
        }
        return {
            usage,
            costUsd: breakdown.costUsd,
            costSource,
            costBreakdown: breakdown
        }
    }

    const breakdown = computeProviderCost(provider, pricing, extras, usage)
    return {
        usage,
        costUsd: breakdown.costUsd,
        costSource,
        costBreakdown: breakdown
    }
}

module.exports = {
    estimateTokens,
    estimateUsage,
    normalizeProviderUsage,
    normalizeUsage: normalizeLegacyUsage,
    computeTurnCost
}
