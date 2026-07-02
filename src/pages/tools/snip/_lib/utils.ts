import type { Point } from './types'

let counter = 0

/** Cheap unique id */
export function uid(): string {
    counter += 1
    return `el_${Date.now().toString(36)}_${counter}`
}

export function pointDistance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y)
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSq = dx * dx + dy * dy
    if (lengthSq === 0) return pointDistance(p, a)

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq
    t = Math.max(0, Math.min(1, t))

    return pointDistance(p, { x: a.x + t * dx, y: a.y + t * dy })
}
