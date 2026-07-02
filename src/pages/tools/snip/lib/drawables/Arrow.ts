import type { Drawable, Point, Rect, ResizeHandle } from '../types'
import { distanceToSegment, pointDistance } from '../utils'
import { DEFAULT_STROKE_WIDTH } from '../config'

export class Arrow implements Drawable {
    readonly id: string
    readonly kind = 'arrow'
    selected = false

    start: Point
    end: Point
    color: string
    strokeWidth: number

    constructor(
        id: string,
        start: Point,
        end: Point,
        color: string,
        strokeWidth = DEFAULT_STROKE_WIDTH
    ) {
        this.id = id
        this.start = { ...start }
        this.end = { ...end }
        this.color = color
        this.strokeWidth = strokeWidth
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const { start, end } = this
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const headLength = Math.max(12, this.strokeWidth * 3.5)
        const headAngle = Math.PI / 7

        ctx.save()
        ctx.strokeStyle = this.color
        ctx.fillStyle = this.color
        ctx.lineWidth = this.strokeWidth
        ctx.lineCap = 'round'

        // Shaft — stop short of the tip so the head doesn't look pierced.
        const shaftEndX = end.x - Math.cos(angle) * headLength * 0.6
        const shaftEndY = end.y - Math.sin(angle) * headLength * 0.6
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(shaftEndX, shaftEndY)
        ctx.stroke()

        // Head
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(
            end.x - headLength * Math.cos(angle - headAngle),
            end.y - headLength * Math.sin(angle - headAngle)
        )
        ctx.lineTo(
            end.x - headLength * Math.cos(angle + headAngle),
            end.y - headLength * Math.sin(angle + headAngle)
        )
        ctx.closePath()
        ctx.fill()

        ctx.restore()
    }

    contains(p: Point): boolean {
        const hitWidth = Math.max(10, this.strokeWidth * 2)
        return distanceToSegment(p, this.start, this.end) <= hitWidth
    }

    move(dx: number, dy: number): void {
        this.start.x += dx
        this.start.y += dy
        this.end.x += dx
        this.end.y += dy
    }

    resize(handle: ResizeHandle, dx: number, dy: number): void {
        // Endpoints are dragged live (not snapshot-based like Rectangle) since
        // there's no "flip" ambiguity — each endpoint moves independently.
        if (handle === 'start') {
            this.start.x += dx
            this.start.y += dy
        } else if (handle === 'end') {
            this.end.x += dx
            this.end.y += dy
        }
    }

    getBounds(): Rect {
        const x = Math.min(this.start.x, this.end.x)
        const y = Math.min(this.start.y, this.end.y)
        return {
            x,
            y,
            width: Math.abs(this.end.x - this.start.x),
            height: Math.abs(this.end.y - this.start.y),
        }
    }

    getHandles(): { handle: ResizeHandle; point: Point }[] {
        return [
            { handle: 'start', point: this.start },
            { handle: 'end', point: this.end },
        ]
    }

    hitTestHandle(point: Point, hitRadius: number): ResizeHandle | null {
        if (pointDistance(point, this.start) <= hitRadius) return 'start'
        if (pointDistance(point, this.end) <= hitRadius) return 'end'
        return null
    }

    clone(): Arrow {
        return new Arrow(
            this.id,
            this.start,
            this.end,
            this.color,
            this.strokeWidth
        )
    }
}
