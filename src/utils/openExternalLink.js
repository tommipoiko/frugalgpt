const OPEN_DEDUPE_MS = 800
const WINDOW_FEATURES = 'noopener,noreferrer'

function getLastOpen() {
    if (typeof window === 'undefined') {
        return { url: '', at: 0 }
    }

    if (!window.frugalGptLastExternalOpen) {
        window.frugalGptLastExternalOpen = { url: '', at: 0 }
    }

    return window.frugalGptLastExternalOpen
}

function shouldOpen(url) {
    const lastOpen = getLastOpen()
    const now = Date.now()
    if (lastOpen.url === url && now - lastOpen.at < OPEN_DEDUPE_MS) return false

    lastOpen.url = url
    lastOpen.at = now
    return true
}

function isElectronEmbeddedBrowser() {
    return typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')
}

function openViaForm(url) {
    const form = document.createElement('form')
    form.method = 'GET'
    form.action = url
    form.target = '_blank'
    form.rel = 'noopener noreferrer'
    form.style.display = 'none'
    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
}

export function openExternalLinkOnce(url) {
    if (!url || typeof url !== 'string') return
    if (!shouldOpen(url)) return

    if (isElectronEmbeddedBrowser()) {
        try {
            const parsed = new URL(url, window.location.href)
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                // Avoid window.open in Cursor/VS Code — it is handled twice there.
                openViaForm(parsed.href)
                return
            }
        } catch {
            // Fall through to window.open for non-http(s) URLs.
        }
    }

    window.open(url, '_blank', WINDOW_FEATURES)
}

export function handleExternalLinkClick(event, url) {
    if (event.button !== 0 || !url) return

    event.preventDefault()
    event.stopPropagation()

    if (typeof event.nativeEvent?.stopImmediatePropagation === 'function') {
        event.nativeEvent.stopImmediatePropagation()
    }

    openExternalLinkOnce(url)
}
