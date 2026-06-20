import catalog from '../../models.json'

export const getProviderPricingExtras = (provider) => (
    catalog.providers?.[provider]?.pricingExtras || {}
)

export const getModelPricing = (provider, modelId) => {
    const providerEntry = catalog.providers?.[provider]
    if (!providerEntry) return null
    const model = (providerEntry.models || []).find(
        (entry) => entry.id === modelId || entry.apiModelId === modelId
    )
    if (!model) return null
    if (
        typeof model.inputPricingUsd !== 'number'
        || typeof model.outputPricingUsd !== 'number'
    ) {
        return null
    }
    const extras = getProviderPricingExtras(provider)
    const cachedInputMultiplier = extras.cachedInputMultiplier ?? 0.1
    return {
        modelId: model.id,
        inputPer1MUsd: model.inputPricingUsd,
        outputPer1MUsd: model.outputPricingUsd,
        isReasoningModel: model.isReasoningModel === true,
        geminiMajorVersion: model.geminiMajorVersion,
        supportsLongContextPremium: model.supportsLongContextPremium === true,
        supportsInferenceGeoMultiplier: model.supportsInferenceGeoMultiplier === true,
        longContextInputTokenThreshold:
            model.longContextInputTokenThreshold ?? extras.longContextInputTokenThreshold,
        longContextInputMultiplier:
            model.longContextInputMultiplier ?? extras.longContextInputMultiplier,
        longContextOutputMultiplier:
            model.longContextOutputMultiplier ?? extras.longContextOutputMultiplier,
        longContextModelIds: extras.longContextModelIds,
        ...(typeof model.cachedInputPricingUsd === 'number'
            ? { cachedInputPer1MUsd: model.cachedInputPricingUsd }
            : { cachedInputPer1MUsd: model.inputPricingUsd * cachedInputMultiplier })
    }
}

export const resolveMessageModelId = (message, chat = {}) => {
    if (typeof message?.modelKey === 'string' && message.modelKey.trim()) {
        return message.modelKey.trim()
    }
    if (typeof message?.model === 'string' && message.model.trim()) {
        return message.model.trim()
    }
    if (typeof chat?.modelKey === 'string' && chat.modelKey.trim()) {
        return chat.modelKey.trim()
    }
    if (typeof chat?.model === 'string' && chat.model.trim()) {
        return chat.model.trim()
    }
    const provider = message?.provider || chat?.provider
    return catalog.providers?.[provider]?.defaultModelId || null
}
