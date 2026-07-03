import type { EditorStore } from './store'

export type DownloadResult = { ok: true } | { ok: false; reason: string }

/**
 * Renders the annotated image to an offscreen canvas and triggers a browser download.
 */
export async function downloadAnnotatedImage(
    store: EditorStore
): Promise<DownloadResult> {
    const { image } = store
    if (!image) return { ok: false, reason: 'No image to download' }

    const off = document.createElement('canvas')
    off.width = image.naturalWidth
    off.height = image.naturalHeight
    const ctx = off.getContext('2d')
    if (!ctx) return { ok: false, reason: 'Could not create export canvas' }

    ctx.drawImage(image, 0, 0)
    for (const el of store.elements) {
        el.draw(ctx)
    }

    const blob: Blob | null = await new Promise((resolve) =>
        off.toBlob((b) => resolve(b), 'image/png')
    )
    if (!blob) return { ok: false, reason: 'Failed to encode image' }

    try {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `snip-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return { ok: true }
    } catch (err) {
        return {
            ok: false,
            reason: err instanceof Error ? err.message : 'Download failed',
        }
    }
}
