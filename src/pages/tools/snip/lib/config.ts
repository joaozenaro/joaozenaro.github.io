export const PALETTE = {
    red: '#ff3b30',
    green: '#34c759',
    blue: '#007aff',
    yellow: '#ffcc00',
    purple: '#af52de',
    white: '#ffffff',
    black: '#000000',
} as const

/**
 * No color picker UI exists yet. Every new shape uses this until one is
 * wired up — swap this for a live "active color" read from the store
 * (e.g. `store.activeColor`) once that lands.
 */
export const DEFAULT_COLOR: string = PALETTE.red

/** Canvas-space units (≈ natural image pixels). Not zoom/DPI aware yet. */
export const DEFAULT_STROKE_WIDTH = 4

/** Size of each averaged block when rendering a Pixelate region. */
export const PIXELATE_BLOCK_SIZE = 14

/** CSS pixels — converted to canvas-space via Viewport.scaleFactor. */
export const HANDLE_SIZE = 8
export const HANDLE_HIT_RADIUS = 10
