/**
 * The main annotation canvas never draws the source image (see the
 * "Rendering" section of the spec — two layers, image isn't redrawn). But
 * Pixelate needs raw pixel access to compute block averages. Rather than
 * breaking the two-layer architecture, we decode the image once into an
 * offscreen canvas on paste and cache its ImageData here.
 */

let cachedData: ImageData | null = null

export function setSourceImage(img: HTMLImageElement): void {
    const off = document.createElement('canvas')
    off.width = img.naturalWidth
    off.height = img.naturalHeight

    const ctx = off.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
        cachedData = null
        return
    }

    ctx.drawImage(img, 0, 0)
    cachedData = ctx.getImageData(0, 0, off.width, off.height)
}

export function clearSourceImage(): void {
    cachedData = null
}

export interface ImageSampler {
    averageColor(
        x: number,
        y: number,
        w: number,
        h: number
    ): { r: number; g: number; b: number } | null
}

export function getImageSampler(): ImageSampler | null {
    if (!cachedData) return null
    const { data, width, height } = cachedData

    return {
        averageColor(bx, by, bw, bh) {
            const x0 = Math.max(0, Math.floor(bx))
            const y0 = Math.max(0, Math.floor(by))
            const x1 = Math.min(width, Math.floor(bx + bw))
            const y1 = Math.min(height, Math.floor(by + bh))
            if (x1 <= x0 || y1 <= y0) return null

            // Sample on a grid instead of every pixel — plenty accurate for an
            // averaged block and much cheaper on large pixelate regions.
            const step = Math.max(1, Math.floor(Math.min(x1 - x0, y1 - y0) / 8))

            let r = 0
            let g = 0
            let b = 0
            let count = 0

            for (let y = y0; y < y1; y += step) {
                for (let x = x0; x < x1; x += step) {
                    const i = (y * width + x) * 4
                    r += data[i]
                    g += data[i + 1]
                    b += data[i + 2]
                    count += 1
                }
            }

            if (count === 0) return null
            return {
                r: Math.round(r / count),
                g: Math.round(g / count),
                b: Math.round(b / count),
            }
        },
    }
}
