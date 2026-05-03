const MAX_BYTES_TEXT = 120_000

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = reader.result
            if (typeof dataUrl !== 'string') {
                reject(new Error('Invalid read'))
                return
            }
            const comma = dataUrl.indexOf(',')
            resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl)
        }
        reader.onerror = () => reject(reader.error || new Error('Read failed'))
        reader.readAsDataURL(file)
    })
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.onerror = () => reject(reader.error || new Error('Read failed'))
        reader.readAsText(file)
    })
}

/** Payload sent to Cloud Functions (no File objects). */
export async function buildAttachmentParts(files) {
    const parts = []
    const list = Array.from(files || []).slice(0, 5)
    // eslint-disable-next-line no-restricted-syntax
    for (const file of list) {
        // eslint-disable-next-line no-await-in-loop
        if (file.type.startsWith('image/')) {
            // eslint-disable-next-line no-await-in-loop
            const base64 = await readFileAsBase64(file)
            parts.push({
                kind: 'image',
                mimeType: file.type || 'image/jpeg',
                base64,
                name: file.name
            })
        } else {
            try {
                // eslint-disable-next-line no-await-in-loop
                let text = await readFileAsText(file)
                if (text.length > MAX_BYTES_TEXT) {
                    text = `${text.slice(0, MAX_BYTES_TEXT)}\n…[truncated]`
                }
                parts.push({
                    kind: 'text',
                    name: file.name,
                    text
                })
            } catch {
                parts.push({
                    kind: 'note',
                    name: file.name,
                    note: `[Binary file ${file.name} — describe it or open locally.]`
                })
            }
        }
    }
    return parts
}

export function summarizeAttachmentsForStore(files) {
    return Array.from(files || []).slice(0, 5).map((file, i) => ({
        id: `att-${i}-${file.name}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size
    }))
}
