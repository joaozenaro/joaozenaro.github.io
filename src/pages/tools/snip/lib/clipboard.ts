import type { EditorStore } from './store'

export type CopyResult = { ok: true } | { ok: false; reason: string }

/**
 * Per spec: offscreen canvas -> draw image -> draw every annotation ->
 * Clipboard API. Selection UI (handles, dashed outline) is never part of
 * this canvas, so nothing extra needs to be hidden/shown first.
 */
export async function copyAnnotatedImage(
    store: EditorStore
): Promise<CopyResult> {
    const { image } = store
    if (!image) return { ok: false, reason: 'No image to copy' }

    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        return {
            ok: false,
            reason: "Clipboard image copy isn't supported in this browser",
        }
    }

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
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
        ])
        return { ok: true }
    } catch (err) {
        return {
            ok: false,
            reason:
                err instanceof Error ? err.message : 'Clipboard write failed',
        }
    }
}
