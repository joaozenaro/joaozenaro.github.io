import type { Drawable, Point, ResizeHandle } from './lib/types'

export interface HandleHit {
    kind: 'handle'
    element: Drawable
    handle: ResizeHandle
}

export interface ShapeHit {
    kind: 'shape'
    element: Drawable
}

export type HitResult = HandleHit | ShapeHit | null

/**
 * Priority, per spec:
 *   1. Resize handles (of the currently selected element only — handles
 *      aren't shown on unselected elements, so there's nothing to hit)
 *   2. Arrow endpoints — covered by the same handle check above, since
 *      Arrow.getHandles() returns "start"/"end" as handles
 *   3. Shapes — topmost first (last drawn = last in the array = on top)
 */
export function hitTest(
    point: Point,
    elements: Drawable[],
    selected: Drawable | null,
    hitRadius: number
): HitResult {
    if (selected) {
        const handle = selected.hitTestHandle(point, hitRadius)
        if (handle) return { kind: 'handle', element: selected, handle }
    }

    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i]
        if (el.contains(point)) return { kind: 'shape', element: el }
    }

    return null
}
