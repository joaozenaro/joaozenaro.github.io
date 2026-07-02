import type { EditorStore } from './store'
import { Viewport } from './viewport'
import { hitTest } from '../hitTest'
import type { Drawable, Point, ResizeHandle } from './types'
import { Rectangle } from './drawables/Rectangle'
import { Arrow } from './drawables/Arrow'
import { Pixelate } from './drawables/Pixelate'
import { uid } from './utils'
import { getActiveColor } from './colorStore'

/** Below this size, a drawn/dragged shape is treated as an accidental click, not a real element. */
const MIN_ELEMENT_SIZE = 3

type Gesture =
    | { kind: 'none' }
    | { kind: 'drawing'; element: Drawable; startPoint: Point; moved: boolean }
    | { kind: 'moving'; element: Drawable; lastPoint: Point; moved: boolean }
    | {
          kind: 'resizing'
          element: Drawable
          handle: ResizeHandle
          startPoint: Point
          lastPoint: Point
          moved: boolean
      }

function createElement(tool: string, at: Point): Drawable | null {
    const id = uid()
    switch (tool) {
        case 'rect':
            return new Rectangle(id, at.x, at.y, 0, 0, getActiveColor())
        case 'arrow':
            return new Arrow(id, at, at, getActiveColor())
        case 'pixelate':
            return new Pixelate(id, at.x, at.y, 0, 0)
        default:
            return null
    }
}

export class InteractionController {
    private viewport: Viewport
    private gesture: Gesture = { kind: 'none' }

    constructor(
        private canvas: HTMLCanvasElement,
        private store: EditorStore
    ) {
        this.viewport = new Viewport(canvas)
        canvas.addEventListener('pointerdown', this.onPointerDown)
        canvas.addEventListener('pointermove', this.onPointerMove)
        window.addEventListener('pointerup', this.onPointerUp)
    }

    destroy(): void {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown)
        this.canvas.removeEventListener('pointermove', this.onPointerMove)
        window.removeEventListener('pointerup', this.onPointerUp)
    }

    private onPointerDown = (e: PointerEvent): void => {
        if (!this.store.image) return
        e.preventDefault()
        this.canvas.setPointerCapture(e.pointerId)

        const point = this.viewport.toCanvasPoint(e)
        const { store } = this

        if (store.tool === 'select') {
            const hit = hitTest(
                point,
                store.elements,
                store.selected,
                this.viewport.handleHitRadius()
            )

            if (hit?.kind === 'handle') {
                store.beginChange() // snapshot BEFORE mutation — see store.ts beginChange/commitChange
                hit.element.beginResize?.(hit.handle)
                hit.element.setLive?.(true)
                this.gesture = {
                    kind: 'resizing',
                    element: hit.element,
                    handle: hit.handle,
                    startPoint: point,
                    lastPoint: point,
                    moved: false,
                }
                return
            }

            if (hit?.kind === 'shape') {
                store.beginChange()
                store.select(hit.element)
                hit.element.setLive?.(true)
                this.gesture = {
                    kind: 'moving',
                    element: hit.element,
                    lastPoint: point,
                    moved: false,
                }
                return
            }

            store.select(null)
            this.gesture = { kind: 'none' }
            return
        }

        // A drawing tool is active — start a new element anchored at this point.
        const element = createElement(store.tool, point)
        if (!element) return

        store.beginChange() // snapshot before the new element exists, so undo removes it cleanly
        store.addElement(element)
        store.select(element)
        store.setInteraction('drawing')
        element.beginResize?.('se')
        element.setLive?.(true)
        this.gesture = {
            kind: 'drawing',
            element,
            startPoint: point,
            moved: false,
        }
    }

    private onPointerMove = (e: PointerEvent): void => {
        if (this.gesture.kind === 'none') return
        const point = this.viewport.toCanvasPoint(e)
        const { store } = this

        if (this.gesture.kind === 'drawing') {
            const g = this.gesture
            const dx = point.x - g.startPoint.x
            const dy = point.y - g.startPoint.y
            g.element.resize('se', dx, dy)
            g.moved =
                g.moved ||
                Math.abs(dx) > MIN_ELEMENT_SIZE ||
                Math.abs(dy) > MIN_ELEMENT_SIZE
            store.markDirty()
            return
        }

        if (this.gesture.kind === 'moving') {
            const g = this.gesture
            const dx = point.x - g.lastPoint.x
            const dy = point.y - g.lastPoint.y
            g.element.move(dx, dy)
            g.lastPoint = point
            g.moved = g.moved || Math.abs(dx) > 0 || Math.abs(dy) > 0
            if (g.moved) store.setInteraction('moving')
            store.markDirty()
            return
        }

        if (this.gesture.kind === 'resizing') {
            const g = this.gesture
            store.setInteraction('resizing')
            if (g.handle === 'start' || g.handle === 'end') {
                // Arrow endpoints: incremental delta since Arrow.resize mutates directly (see Arrow.ts).
                const dx = point.x - g.lastPoint.x
                const dy = point.y - g.lastPoint.y
                g.element.resize(g.handle, dx, dy)
                g.lastPoint = point
            } else {
                // Corner handles: cumulative delta from gesture start (see Rectangle/Pixelate.resize).
                const dx = point.x - g.startPoint.x
                const dy = point.y - g.startPoint.y
                g.element.resize(g.handle, dx, dy)
            }
            g.moved = true
            store.markDirty()
            return
        }
    }

    private onPointerUp = (): void => {
        const { store } = this
        const g = this.gesture
        if (g.kind === 'none') return

        if (g.kind === 'drawing') {
            const bounds = g.element.getBounds()
            const tooSmall =
                bounds.width < MIN_ELEMENT_SIZE &&
                bounds.height < MIN_ELEMENT_SIZE
            g.element.setLive?.(false)

            if (tooSmall) {
                store.elements = store.elements.filter((el) => el !== g.element)
                store.select(null)
                store.abortChange()
            } else {
                store.commitChange()
            }
        }

        if (g.kind === 'moving') {
            if (g.moved) {
                store.commitChange()
            } else {
                store.abortChange()
            }
        }

        if (g.kind === 'resizing') {
            g.element.setLive?.(false)
            if (g.moved) {
                store.commitChange()
            } else {
                store.abortChange()
            }
        }

        store.setInteraction('idle')
        store.markDirty()
        this.gesture = { kind: 'none' }
    }
}
