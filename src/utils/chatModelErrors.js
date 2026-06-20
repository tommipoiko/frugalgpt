const MODEL_ERROR_HINTS = [
    'model',
    'not found',
    'does not exist',
    'unsupported',
    'invalid',
    'no longer',
    'deprecated',
    'unknown model',
    'unknown'
]

/* eslint-disable import/prefer-default-export */
export function formatChatModelError(errorMessage, inference) {
    if (!errorMessage || typeof errorMessage !== 'string') {
        return 'Failed to send message. Please try again.'
    }

    if (!inference) return errorMessage

    const lower = errorMessage.toLowerCase()
    const looksModelRelated = inference.isLegacy
        || MODEL_ERROR_HINTS.some((hint) => lower.includes(hint))

    if (!looksModelRelated) return errorMessage

    const label = inference.modelLabel || inference.model || 'this model'
    const provider = inference.providerLabel || inference.provider || 'the provider'

    return (
        `This chat uses ${label} (${provider}). `
        + 'The provider API rejected the request — the model may no longer be available. '
        + `Details: ${errorMessage}`
    )
}
