import type { Point } from './types'
import { HANDLE_SIZE, HANDLE_HIT_RADIUS } from './config'

/**
 * The canvas's internal resolution (canvas.width/height) is set to the
 * pasted image's *natural* pixel size, while its CSS size is whatever fits
 * the layout (see CanvasArea.astro — width/height: 100%). That means a
 * "canvas-space" unit is not 1:1 with a CSS pixel, and the ratio changes
 * whenever the window resizes. Everything Drawable-related works in
 * canvas-space; this class is the only place that knows the conversion.
 */
export class Viewport {
    constructor(private canvas: HTMLCanvasElement) {}

    get scaleFactor(): number {
        const rect = this.canvas.getBoundingClientRect()
        return rect.width > 0 ? this.canvas.width / rect.width : 1
    }

    toCanvasPoint(e: PointerEvent | MouseEvent): Point {
        const rect = this.canvas.getBoundingClientRect()
        const s = this.scaleFactor
        return {
            x: (e.clientX - rect.left) * s,
            y: (e.clientY - rect.top) * s,
        }
    }

    /** Visual handle size, converted from a constant CSS size to canvas-space. */
    handleSize(): number {
        return HANDLE_SIZE * this.scaleFactor
    }

    /** Hit-test radius around a handle, in canvas-space. */
    handleHitRadius(): number {
        return HANDLE_HIT_RADIUS * this.scaleFactor
    }
}
