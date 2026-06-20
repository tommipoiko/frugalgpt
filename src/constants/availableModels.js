import catalog from '../../models.json'

/**
 * reasoningMode:
 * - `toggle` — user can enable/disable extended reasoning (when supported server-side).
 * - `fixed-on` — always request reasoning for this SKU (no toggle).
 * - `none` — no reasoning path / hide toggle.
 *
 * webSearch: show “Web browsing” toggle only when true for this model.
 */

export const AVAILABLE_CHAT_MODELS = Object.entries(catalog.providers || {}).flatMap(
    ([providerId, provider]) => (provider.models || []).map((model) => ({
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
    }))
)

export function getChatModelEntry(key) {
    return AVAILABLE_CHAT_MODELS.find((m) => m.key === key) || AVAILABLE_CHAT_MODELS[0]
}

/** Models the user can pick given saved API keys. */
export function listChatModelsForUser(hasProviderKey) {
    return AVAILABLE_CHAT_MODELS.filter((m) => hasProviderKey(m.provider))
}

export function resolveModelKeyFromFirestore({ modelKey }) {
    if (typeof modelKey === 'string') {
        const byKey = AVAILABLE_CHAT_MODELS.find((m) => m.key === modelKey)
        if (byKey) return modelKey
    }
    return null
}

export function defaultModelKeyForUser(hasProviderKey) {
    const allowed = listChatModelsForUser(hasProviderKey)
    return allowed[0]?.key || AVAILABLE_CHAT_MODELS[0].key
}
