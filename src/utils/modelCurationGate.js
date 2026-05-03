const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function hasProviderKey(data, pid) {
    if (!data) return false
    if (pid === 'openai') {
        return !!(data.providers?.openai?.apiKey?.trim() || data.openAi?.openaiKey?.trim())
    }
    return !!data.providers?.[pid]?.apiKey?.trim()
}

function checkedAtToMs(checkedAt) {
    if (!checkedAt) return null
    if (typeof checkedAt.toMillis === 'function') return checkedAt.toMillis()
    if (typeof checkedAt.seconds === 'number') return checkedAt.seconds * 1000
    return null
}

/** True if any keyed provider lacks curation or its check is older than 30 days. */
export default function needsModelCuration(userData) {
    if (!userData) return false
    const providerIds = ['openai', 'anthropic', 'google', 'mistral'].filter(
        (pid) => hasProviderKey(userData, pid)
    )
    if (providerIds.length === 0) return false

    const staleOrMissing = providerIds.some((pid) => {
        const entry = userData.modelCuration?.[pid]
        const ids = entry?.modelIds
        const ms = checkedAtToMs(entry?.checkedAt)
        const stale = ms == null || (Date.now() - ms > THIRTY_DAYS_MS)
        const missingIds = !Array.isArray(ids) || ids.length === 0
        return missingIds || stale
    })
    return staleOrMissing
}
