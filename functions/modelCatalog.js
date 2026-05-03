const REQUIRED_MODELS_BY_PROVIDER = {
    openai: ['gpt-5.5', 'gpt-5.4'],
    google: ['gemini-3.1-pro-preview'],
    anthropic: ['claude-opus-4-7', 'claude-sonnet-4-6'],
    mistral: ['magistral-medium-latest', 'magistral-small-latest']
}

const DEFAULT_MODEL_BY_PROVIDER = {
    openai: 'gpt-5.4',
    google: 'gemini-3.1-pro-preview',
    anthropic: 'claude-sonnet-4-6',
    mistral: 'magistral-medium-latest'
}

const PROVIDERS = new Set(Object.keys(REQUIRED_MODELS_BY_PROVIDER))

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

module.exports = {
    REQUIRED_MODELS_BY_PROVIDER,
    DEFAULT_MODEL_BY_PROVIDER,
    PROVIDERS,
    listRequiredModelsForProvider,
    isAllowedModel,
    sanitizeModelId
}
