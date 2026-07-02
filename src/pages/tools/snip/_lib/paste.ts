import type { EditorStore } from './store'
import type { Renderer } from './renderer'
import { setSourceImage } from './imageSource'

export type OnImageLoaded = (img: HTMLImageElement) => void

/**
 * Loads pasted images directly into the real <img id="source-image">
 * element (rather than a detached Image), since that element IS the
 * visible image layer per the spec's two-layer architecture — no reason
 * to decode twice.
 */
export function initPasteHandler(
    imgEl: HTMLImageElement,
    store: EditorStore,
    renderer: Renderer,
    onLoaded: OnImageLoaded
): void {
    window.addEventListener('paste', (e: ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (const item of items) {
            if (!item.type.startsWith('image/')) continue
            const file = item.getAsFile()
            if (!file) continue

            e.preventDefault()
            loadImageFile(file, imgEl, store, renderer, onLoaded)
            return
        }
    })
}

function loadImageFile(
    file: File,
    imgEl: HTMLImageElement,
    store: EditorStore,
    renderer: Renderer,
    onLoaded: OnImageLoaded
): void {
    const previousUrl =
        imgEl.src && imgEl.src.startsWith('blob:') ? imgEl.src : null
    const url = URL.createObjectURL(file)

    imgEl.onload = () => {
        setSourceImage(imgEl)
        store.reset(imgEl)
        renderer.resizeToImage(imgEl)
        onLoaded(imgEl)
        if (previousUrl) URL.revokeObjectURL(previousUrl)
    }

    imgEl.src = url
}
