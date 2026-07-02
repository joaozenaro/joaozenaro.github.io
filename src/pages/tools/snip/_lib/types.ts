export interface Point {
    x: number
    y: number
}

export interface Rect {
    x: number
    y: number
    width: number
    height: number
}

/**
 * "start"/"end" are arrow endpoints. The rest are corner resize handles.
 * Edge handles (n/e/s/w) are intentionally not used — spec only calls for
 * corner resizing in the MVP.
 */
export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'start' | 'end'

export type ToolName = 'select' | 'rect' | 'arrow' | 'pixelate'

/**
 * "editingText" is reserved for the future text tool (DOM-overlay editing,
 * see lib/store.ts) — not used by any current Drawable.
 */
export type InteractionMode =
    'idle' | 'drawing' | 'moving' | 'resizing' | 'editingText'

export interface Drawable {
    readonly id: string
    readonly kind: string
    selected: boolean

    draw(ctx: CanvasRenderingContext2D): void
    contains(point: Point): boolean
    move(dx: number, dy: number): void
    resize(handle: ResizeHandle, dx: number, dy: number): void
    getBounds(): Rect
    getHandles(): { handle: ResizeHandle; point: Point }[]
    hitTestHandle(point: Point, hitRadius: number): ResizeHandle | null
    clone(): Drawable

    /**
     * Optional: snapshot internal state right before a resize gesture starts.
     * Without this, dragging a corner handle past the opposite corner causes
     * the rect to "flip" and the handle role to glitch. Implementations that
     * resize from corners (Rectangle, Pixelate) should implement this.
     */
    beginResize?(handle: ResizeHandle): void

    /**
     * Optional: toggle a cheap preview while being actively dragged, so
     * expensive draw work can be deferred until the gesture ends (see
     * Pixelate, and the "Performance" section of the spec).
     */
    setLive?(live: boolean): void
}
