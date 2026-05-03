import inferModelCapabilities from './modelCapabilities'

/** Strip noisy suffixes for Perplexity-style short labels (full id stays as value). */
export function formatModelShortLabel(provider, modelId) {
    let s = String(modelId || '').trim()
    if (!s) return ''

    s = s.replace(/@\d+$/i, '')
    s = s.replace(/-(preview|exp|experimental)(-\d+)?$/i, '')
    s = s.replace(/-\d{3,}$/i, '')
    s = s.replace(/-lite-\d+$/i, '-lite')
    s = s.replace(/-(latest|001)$/i, '')

    if (provider === 'google') {
        s = s.replace(/^gemini-/i, 'Gemini ')
        s = s.replace(/-/g, ' ')
        s = s.replace(/\bflash lite\b/i, 'Flash')
        s = s.replace(/\blite\b/gi, '').replace(/\s+/g, ' ').trim()
        return s.replace(/\b\w/g, (c) => c.toUpperCase())
    }

    if (provider === 'anthropic') {
        return s
            .replace(/^claude-/i, 'Claude ')
            .replace(/-/g, ' ')
            .replace(/\b(\d{4})(\d{2})(\d{2})\b/g, '$1-$2-$3')
    }

    if (provider === 'openai') {
        return s.replace(/-/g, ' ')
    }

    return s
}

/** Rough relative $ vs cheapest flash-tier model in same vendor (~1× baseline). */
export function estimateRelativeCostMultiplier(provider, modelId) {
    const id = String(modelId || '').toLowerCase()

    if (provider === 'openai') {
        if (/^gpt-5|^o3|^o4/i.test(id)) return 12
        if (/gpt-4\.1/i.test(id)) return 9
        if (/gpt-4o(?!-mini)/i.test(id)) return 6
        if (/gpt-4o-mini|mini/i.test(id)) return 2
        if (/^o1|^o3-mini/i.test(id)) return 8
        return 5
    }

    if (provider === 'anthropic') {
        if (/opus/i.test(id)) return 14
        if (/sonnet/i.test(id)) return 7
        if (/haiku/i.test(id)) return 2
        return 6
    }

    if (provider === 'google') {
        if (/gemini-3|gemini3/i.test(id)) return id.includes('pro') ? 14 : 10
        if (/2\.5.*pro|pro.*2\.5/i.test(id)) return 11
        if (/flash-thinking|thinking/i.test(id)) return 8
        if (/2\.5.*flash|^gemini-2\.5-flash/i.test(id)) return 3
        if (/2\.0.*flash|^gemini-2\.0-flash/i.test(id)) return 2
        if (/pro/i.test(id)) return 10
        return 4
    }

    if (provider === 'mistral') {
        if (/large|medium/i.test(id)) return id.includes('large') ? 9 : 5
        if (/small|mini/i.test(id)) return 2
        return 5
    }

    return 5
}

/** Perplexity-style one-line label for select option rows. */
export function formatModelOptionLabel(m) {
    const label = m.shortLabel || m.id
    const cost = typeof m.relativeCost === 'number' ? m.relativeCost : null
    const reasoning = m.capabilities?.reasoning
    const parts = [label]
    if (cost != null) parts.push(`~${cost}×`)
    if (reasoning) parts.push('Reasoning')
    return parts.join(' · ')
}

/** Merge API row with fallbacks for curated-id-only lists. */
export function enrichModelRow(provider, row) {
    const id = typeof row?.id === 'string' ? row.id : ''
    const caps = row?.capabilities || inferModelCapabilities(provider, id)
    const relativeCost = typeof row?.relativeCost === 'number'
        ? row.relativeCost
        : estimateRelativeCostMultiplier(provider, id)
    const shortLabel = row?.shortLabel || formatModelShortLabel(provider, id)
    return {
        id,
        capabilities: caps,
        relativeCost,
        shortLabel
    }
}
