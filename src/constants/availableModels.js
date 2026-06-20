import catalog from '../../models.json'

/**
 * reasoningMode:
 * - `toggle` — user can enable/disable extended reasoning (when supported server-side).
 * - `fixed-on` — always request reasoning for this SKU (no toggle).
 * - `none` — no reasoning path / hide toggle.
 *
 * webSearch: show “Web browsing” toggle only when true for this model.
 */

export const PROVIDER_ORDER = ['anthropic', 'google', 'mistral', 'openai']

const providerRank = (providerId) => {
    const index = PROVIDER_ORDER.indexOf(providerId)
    return index === -1 ? PROVIDER_ORDER.length : index
}

export const AVAILABLE_CHAT_MODELS = Object.entries(catalog.providers || {})
    .flatMap(([providerId, provider]) => (provider.models || []).map((model, modelIndex) => ({
        key: model.id,
        provider: providerId,
        providerLabel: provider.name || providerId,
        apiModelId: model.apiModelId || model.id,
        label: model.label,
        reasoningMode: model.reasoningMode,
        webSearch: model.webSearch === true,
        isLegacy: false,
        catalogOrder: modelIndex,
        pricing: {
            inputPer1MUsd: model.inputPricingUsd,
            outputPer1MUsd: model.outputPricingUsd
        }
    })))
    .sort((a, b) => {
        const providerDiff = providerRank(a.provider) - providerRank(b.provider)
        if (providerDiff !== 0) return providerDiff
        return a.catalogOrder - b.catalogOrder
    })
    .map(({ catalogOrder, ...entry }) => entry)

export function getProviderLabel(providerId) {
    return catalog.providers?.[providerId]?.name || providerId
}

export function findCatalogModel({ modelKey, provider, model }) {
    if (typeof modelKey === 'string' && modelKey.trim()) {
        const byKey = AVAILABLE_CHAT_MODELS.find((entry) => entry.key === modelKey.trim())
        if (byKey) return byKey
    }
    if (typeof provider === 'string' && typeof model === 'string' && model.trim()) {
        const normalizedModel = model.trim()
        return AVAILABLE_CHAT_MODELS.find((entry) => (
            entry.provider === provider
            && (entry.apiModelId === normalizedModel || entry.key === normalizedModel)
        )) || null
    }
    return null
}

export function buildLegacyModelEntry({
    modelKey,
    provider,
    model,
    modelLabel,
    providerLabel,
    webSearchEnabled
}) {
    let apiModelId = ''
    if (typeof model === 'string' && model.trim()) {
        apiModelId = model.trim()
    } else if (typeof modelKey === 'string') {
        apiModelId = modelKey.trim()
    }

    const key = (typeof modelKey === 'string' && modelKey.trim())
        ? modelKey.trim()
        : apiModelId

    return {
        key,
        provider,
        providerLabel: providerLabel || getProviderLabel(provider),
        apiModelId,
        label: modelLabel || apiModelId,
        reasoningMode: 'toggle',
        webSearch: webSearchEnabled !== false,
        isLegacy: true,
        pricing: null
    }
}

export function resolveChatInferenceFromFirestore(chatData = {}) {
    const catalogEntry = findCatalogModel({
        modelKey: chatData.modelKey,
        provider: chatData.provider,
        model: chatData.model
    })

    if (catalogEntry) {
        return {
            modelKey: catalogEntry.key,
            entry: catalogEntry,
            isLegacy: false,
            provider: catalogEntry.provider,
            model: catalogEntry.apiModelId,
            modelLabel: chatData.modelLabel || catalogEntry.label,
            providerLabel: chatData.providerLabel || catalogEntry.providerLabel,
            reasoningEnabled: chatData.reasoningEnabled,
            webSearchEnabled: chatData.webSearchEnabled
        }
    }

    if (typeof chatData.provider === 'string' && (chatData.model || chatData.modelKey)) {
        const entry = buildLegacyModelEntry({
            modelKey: chatData.modelKey,
            provider: chatData.provider,
            model: chatData.model,
            modelLabel: chatData.modelLabel,
            providerLabel: chatData.providerLabel,
            reasoningEnabled: chatData.reasoningEnabled,
            webSearchEnabled: chatData.webSearchEnabled
        })
        return {
            modelKey: entry.key,
            entry,
            isLegacy: true,
            provider: entry.provider,
            model: entry.apiModelId,
            modelLabel: entry.label,
            providerLabel: entry.providerLabel,
            reasoningEnabled: chatData.reasoningEnabled,
            webSearchEnabled: chatData.webSearchEnabled
        }
    }

    return null
}

export function getChatModelEntry(key, fallbackEntry = null) {
    const catalogEntry = AVAILABLE_CHAT_MODELS.find((entry) => entry.key === key)
    if (catalogEntry) return catalogEntry
    if (fallbackEntry && fallbackEntry.key === key) return fallbackEntry
    return fallbackEntry || AVAILABLE_CHAT_MODELS[0]
}

/** Models the user can pick given saved API keys. */
export function listChatModelsForUser(hasProviderKey) {
    return AVAILABLE_CHAT_MODELS.filter((entry) => hasProviderKey(entry.provider))
}

export function resolveModelKeyFromFirestore({ modelKey, provider, model }) {
    const catalogEntry = findCatalogModel({ modelKey, provider, model })
    if (catalogEntry) return catalogEntry.key
    if (typeof modelKey === 'string' && modelKey.trim()) return modelKey.trim()
    if (typeof model === 'string' && model.trim()) return model.trim()
    return null
}

export function buildInferenceDocFields(entry, { reasoningEnabled, webSearchEnabled }) {
    return {
        modelKey: entry.key,
        provider: entry.provider,
        model: entry.apiModelId,
        modelLabel: entry.label,
        providerLabel: entry.providerLabel || getProviderLabel(entry.provider),
        reasoningEnabled,
        webSearchEnabled
    }
}

export function defaultModelKeyForUser(hasProviderKey) {
    const allowed = listChatModelsForUser(hasProviderKey)
    const openaiDefault = catalog.providers?.openai?.defaultModelId
    if (openaiDefault && allowed.some((entry) => entry.key === openaiDefault)) {
        return openaiDefault
    }
    return allowed[0]?.key || AVAILABLE_CHAT_MODELS[0].key
}
