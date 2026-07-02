import type { EditorStore } from './store'
import type { Viewport } from './viewport'
import type { Rect } from './types'

const SELECTION_COLOR = '#3b9dff'

export class Renderer {
    private ctx: CanvasRenderingContext2D
    private rafId: number | null = null

    constructor(
        private canvas: HTMLCanvasElement,
        private store: EditorStore,
        private viewport: Viewport
    ) {
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('2D canvas context unavailable')
        this.ctx = ctx
    }

    start(): void {
        if (this.rafId !== null) return
        const loop = () => {
            if (this.store.dirty) {
                this.render()
                this.store.dirty = false
            }
            this.rafId = requestAnimationFrame(loop)
        }
        this.rafId = requestAnimationFrame(loop)
    }

    stop(): void {
        if (this.rafId !== null) cancelAnimationFrame(this.rafId)
        this.rafId = null
    }

    /** Sync canvas backing resolution to the image's natural pixel size. */
    resizeToImage(img: HTMLImageElement): void {
        this.canvas.width = img.naturalWidth
        this.canvas.height = img.naturalHeight
        this.store.markDirty()
    }

    private render(): void {
        const { ctx, canvas, store } = this
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        for (const el of store.elements) {
            el.draw(ctx)
        }

        if (store.selected) {
            this.drawSelectionUI(store.selected.getBounds())
            const handleSize = this.viewport.handleSize()
            for (const { point } of store.selected.getHandles()) {
                this.drawHandle(point.x, point.y, handleSize)
            }
        }
    }

    private drawSelectionUI(bounds: Rect): void {
        const { ctx } = this
        ctx.save()
        ctx.strokeStyle = SELECTION_COLOR
        ctx.lineWidth = Math.max(1, this.viewport.scaleFactor)
        ctx.setLineDash([5, 4])
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
        ctx.restore()
    }

    private drawHandle(cx: number, cy: number, size: number): void {
        const { ctx } = this
        ctx.save()
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = SELECTION_COLOR
        ctx.lineWidth = Math.max(1, this.viewport.scaleFactor)
        ctx.beginPath()
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
    }
}
