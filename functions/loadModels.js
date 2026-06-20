const fs = require('fs')
const path = require('path')

const resolveCatalogPath = () => {
    const bundled = path.join(__dirname, 'models.json')
    if (fs.existsSync(bundled)) return bundled
    const repoRoot = path.join(__dirname, '..', 'models.json')
    if (fs.existsSync(repoRoot)) return repoRoot
    throw new Error(
        'models.json not found. Expected functions/models.json (deploy bundle) '
        + 'or repo-root models.json.'
    )
}

const catalog = require(resolveCatalogPath())

const flattenChatModels = () => {
    const models = []
    Object.entries(catalog.providers || {}).forEach(([providerId, provider]) => {
        ;(provider.models || []).forEach((model) => {
            models.push({
                key: model.id,
                provider: providerId,
                apiModelId: model.apiModelId || model.id,
                label: model.label,
                reasoningMode: model.reasoningMode,
                webSearch: model.webSearch === true,
                pricing: {
                    inputPer1MUsd: model.inputPricingUsd,
                    outputPer1MUsd: model.outputPricingUsd
                }
            })
        })
    })
    return models
}

const REQUIRED_MODELS_BY_PROVIDER = Object.fromEntries(
    Object.entries(catalog.providers || {}).map(([providerId, provider]) => [
        providerId,
        (provider.models || []).map((model) => model.id)
    ])
)

const DEFAULT_MODEL_BY_PROVIDER = Object.fromEntries(
    Object.entries(catalog.providers || {}).map(([providerId, provider]) => [
        providerId,
        provider.defaultModelId
    ])
)

const PROVIDERS = new Set(Object.keys(catalog.providers || {}))

const listRequiredModelsForProvider = (provider) => (
    REQUIRED_MODELS_BY_PROVIDER[provider] || []
)

const isAllowedModel = (provider, modelId) => listRequiredModelsForProvider(provider).includes(modelId)

const sanitizeModelId = (provider, requestedModel) => {
    if (typeof requestedModel !== 'string' || !requestedModel.trim()) {
        return DEFAULT_MODEL_BY_PROVIDER[provider]
    }
    const normalized = requestedModel.trim()
    if (isAllowedModel(provider, normalized)) {
        return normalized
    }
    return DEFAULT_MODEL_BY_PROVIDER[provider]
}

const getProviderPricingExtras = (provider) => (
    catalog.providers?.[provider]?.pricingExtras || {}
)

const getModelPricing = (provider, modelId) => {
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

module.exports = {
    catalog,
    flattenChatModels,
    REQUIRED_MODELS_BY_PROVIDER,
    DEFAULT_MODEL_BY_PROVIDER,
    PROVIDERS,
    listRequiredModelsForProvider,
    isAllowedModel,
    sanitizeModelId,
    getProviderPricingExtras,
    getModelPricing
}
