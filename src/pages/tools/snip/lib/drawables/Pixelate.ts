import type { Drawable, Point, Rect, ResizeHandle } from '../types'
import { pointDistance } from '../../lib/utils'
import { PIXELATE_BLOCK_SIZE } from '../config'
import { getImageSampler } from '../../imageSource'

interface Block {
    x: number
    y: number
    w: number
    h: number
    color: string
}

export class Pixelate implements Drawable {
    readonly id: string
    readonly kind = 'pixelate'
    selected = false

    x: number
    y: number
    width: number
    height: number

    private resizeBase: Rect | null = null
    private live = false

    /** Computed once per gesture-end (see setLive), not per frame — the actual heavy work. */
    private blocks: Block[] | null = null
    private computedFor: Rect | null = null

    constructor(
        id: string,
        x: number,
        y: number,
        width: number,
        height: number
    ) {
        this.id = id
        this.x = x
        this.y = y
        this.width = width
        this.height = height
    }

    /** Called by the interaction layer: true while actively dragging/resizing/moving. */
    setLive(live: boolean): void {
        this.live = live
        if (!live) this.invalidate()
    }

    private invalidate(): void {
        this.blocks = null
        this.computedFor = null
    }

    private recomputeIfNeeded(): void {
        const bounds = this.getBounds()
        const unchanged =
            this.computedFor &&
            this.computedFor.x === bounds.x &&
            this.computedFor.y === bounds.y &&
            this.computedFor.width === bounds.width &&
            this.computedFor.height === bounds.height
        if (unchanged) return

        const sampler = getImageSampler()
        if (!sampler || bounds.width < 1 || bounds.height < 1) {
            this.blocks = []
            this.computedFor = bounds
            return
        }

        const blocks: Block[] = []
        for (let by = 0; by < bounds.height; by += PIXELATE_BLOCK_SIZE) {
            for (let bx = 0; bx < bounds.width; bx += PIXELATE_BLOCK_SIZE) {
                const w = Math.min(PIXELATE_BLOCK_SIZE, bounds.width - bx)
                const h = Math.min(PIXELATE_BLOCK_SIZE, bounds.height - by)
                const avg = sampler.averageColor(
                    bounds.x + bx,
                    bounds.y + by,
                    w,
                    h
                )
                if (!avg) continue
                blocks.push({
                    x: bounds.x + bx,
                    y: bounds.y + by,
                    w,
                    h,
                    color: `rgb(${avg.r},${avg.g},${avg.b})`,
                })
            }
        }

        this.blocks = blocks
        this.computedFor = bounds
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const bounds = this.getBounds()
        if (bounds.width < 1 || bounds.height < 1) return

        if (this.live) {
            // Cheap placeholder while dragging — no per-pixel sampling mid-gesture.
            ctx.save()
            ctx.fillStyle = 'rgba(128, 128, 128, 0.35)'
            ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
            ctx.setLineDash([4, 3])
            ctx.lineWidth = 1
            ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
            ctx.restore()
            return
        }

        this.recomputeIfNeeded()
        if (!this.blocks || this.blocks.length === 0) return

        ctx.save()
        for (const b of this.blocks) {
            ctx.fillStyle = b.color
            ctx.fillRect(b.x, b.y, b.w, b.h)
        }
        ctx.restore()
    }

    contains(p: Point): boolean {
        return (
            p.x >= this.x &&
            p.x <= this.x + this.width &&
            p.y >= this.y &&
            p.y <= this.y + this.height
        )
    }

    move(dx: number, dy: number): void {
        this.x += dx
        this.y += dy
    }

    beginResize(_handle: ResizeHandle): void {
        this.resizeBase = this.getBounds()
    }

    resize(handle: ResizeHandle, dx: number, dy: number): void {
        const base = this.resizeBase ?? this.getBounds()
        let x0 = base.x
        let y0 = base.y
        let x1 = base.x + base.width
        let y1 = base.y + base.height

        switch (handle) {
            case 'nw':
                x0 += dx
                y0 += dy
                break
            case 'ne':
                x1 += dx
                y0 += dy
                break
            case 'se':
                x1 += dx
                y1 += dy
                break
            case 'sw':
                x0 += dx
                y1 += dy
                break
            default:
                return
        }

        this.x = Math.min(x0, x1)
        this.y = Math.min(y0, y1)
        this.width = Math.abs(x1 - x0)
        this.height = Math.abs(y1 - y0)
    }

    getBounds(): Rect {
        return { x: this.x, y: this.y, width: this.width, height: this.height }
    }

    getHandles(): { handle: ResizeHandle; point: Point }[] {
        return [
            { handle: 'nw', point: { x: this.x, y: this.y } },
            { handle: 'ne', point: { x: this.x + this.width, y: this.y } },
            {
                handle: 'se',
                point: { x: this.x + this.width, y: this.y + this.height },
            },
            { handle: 'sw', point: { x: this.x, y: this.y + this.height } },
        ]
    }

    hitTestHandle(point: Point, hitRadius: number): ResizeHandle | null {
        for (const h of this.getHandles()) {
            if (pointDistance(point, h.point) <= hitRadius) return h.handle
        }
        return null
    }

    clone(): Pixelate {
        const copy = new Pixelate(
            this.id,
            this.x,
            this.y,
            this.width,
            this.height
        )
        // Cached blocks intentionally not copied — cheap to recompute, and
        // keeps clone() (used for undo snapshots) fast and side-effect-free.
        return copy
    }
}
