/**
 * Hard-coded chat models (display names). Maps to provider API ids — adjust `apiModelId`
 * if your account exposes different SKUs.
 *
 * reasoningMode:
 * - `toggle` — user can enable/disable extended reasoning (when supported server-side).
 * - `fixed-on` — always request reasoning for this SKU (no toggle).
 * - `none` — no reasoning path / hide toggle.
 *
 * webSearch: show “Web browsing” toggle only when true for this model.
 */

export const AVAILABLE_CHAT_MODELS = [
    {
        key: 'gpt-5.4',
        provider: 'openai',
        apiModelId: 'gpt-5.4',
        label: 'GPT-5.4',
        reasoningMode: 'toggle',
        webSearch: true
    },
    {
        key: 'gpt-5.5',
        provider: 'openai',
        apiModelId: 'gpt-5.5',
        label: 'GPT-5.5',
        reasoningMode: 'toggle',
        webSearch: true
    },
    {
        key: 'gemini-3.1-pro-preview',
        provider: 'google',
        apiModelId: 'gemini-3.1-pro-preview',
        label: 'Gemini 3.1 Pro Preview',
        reasoningMode: 'fixed-on',
        webSearch: true
    },
    {
        key: 'claude-sonnet-4-6',
        provider: 'anthropic',
        apiModelId: 'claude-sonnet-4-6',
        label: 'Claude Sonnet 4.6',
        reasoningMode: 'toggle',
        webSearch: true
    },
    {
        key: 'claude-opus-4-7',
        provider: 'anthropic',
        apiModelId: 'claude-opus-4-7',
        label: 'Claude Opus 4.7',
        reasoningMode: 'toggle',
        webSearch: true
    },
    {
        key: 'magistral-small-latest',
        provider: 'mistral',
        apiModelId: 'magistral-small-latest',
        label: 'Magistral Small Latest',
        reasoningMode: 'fixed-on',
        webSearch: true
    },
    {
        key: 'magistral-medium-latest',
        provider: 'mistral',
        apiModelId: 'magistral-medium-latest',
        label: 'Magistral Medium Latest',
        reasoningMode: 'fixed-on',
        webSearch: true
    }
]

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
