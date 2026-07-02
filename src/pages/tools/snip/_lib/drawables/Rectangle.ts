import type { Drawable, Point, Rect, ResizeHandle } from '../types'
import { pointDistance } from '../utils'
import { DEFAULT_STROKE_WIDTH } from '../config'

export class Rectangle implements Drawable {
    readonly id: string
    readonly kind = 'rectangle'
    selected = false

    x: number
    y: number
    width: number
    height: number
    color: string
    strokeWidth: number

    /** Snapshot of bounds taken at the start of a resize gesture — see beginResize(). */
    private resizeBase: Rect | null = null

    constructor(
        id: string,
        x: number,
        y: number,
        width: number,
        height: number,
        color: string,
        strokeWidth = DEFAULT_STROKE_WIDTH
    ) {
        this.id = id
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.color = color
        this.strokeWidth = strokeWidth
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save()
        ctx.strokeStyle = this.color
        ctx.lineWidth = this.strokeWidth
        const inset = this.strokeWidth / 2
        ctx.strokeRect(
            this.x + inset,
            this.y + inset,
            Math.max(0, this.width - this.strokeWidth),
            Math.max(0, this.height - this.strokeWidth)
        )
        ctx.restore()
    }

    contains(p: Point): boolean {
        // Whole bounding box counts as a hit target for moving, even though
        // only the border is drawn — matches typical click-to-drag UX.
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

    /**
     * dx/dy are cumulative from the gesture's start point, always applied to
     * the snapshot taken in beginResize(). Re-deriving from a fixed base each
     * call (rather than mutating incrementally) avoids the corner "flip"
     * glitch when dragging a handle past the opposite edge.
     */
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

    clone(): Rectangle {
        return new Rectangle(
            this.id,
            this.x,
            this.y,
            this.width,
            this.height,
            this.color,
            this.strokeWidth
        )
    }
}
