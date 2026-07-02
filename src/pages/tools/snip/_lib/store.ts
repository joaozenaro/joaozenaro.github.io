import type { Drawable, ToolName, InteractionMode } from './types'

type Listener = () => void

/**
 * Matches the EditorState shape from the spec, plus pub/sub so the toolbar,
 * renderer, and clipboard can each react to changes without polling.
 *
 * Undo/redo uses whole-array snapshots (via Drawable.clone()) rather than a
 * command stack. Simpler to get right, and fine at MVP element counts —
 * worth revisiting if elements ever get expensive to clone.
 */
export class EditorStore {
    image: HTMLImageElement | null = null
    tool: ToolName = 'select'
    selected: Drawable | null = null
    elements: Drawable[] = []
    interaction: InteractionMode = 'idle'
    dirty = true

    private undoStack: Drawable[][] = []
    private redoStack: Drawable[][] = []
    private pendingSnapshot: Drawable[] | null = null
    private listeners = new Set<Listener>()

    subscribe(fn: Listener): () => void {
        this.listeners.add(fn)
        return () => this.listeners.delete(fn)
    }

    private notify(): void {
        for (const fn of this.listeners) fn()
    }

    markDirty(): void {
        this.dirty = true
    }

    setTool(tool: ToolName): void {
        if (this.tool === tool) return
        this.tool = tool
        this.select(null)
        this.notify()
    }

    setInteraction(mode: InteractionMode): void {
        if (this.interaction === mode) return
        this.interaction = mode
        this.notify()
    }

    select(el: Drawable | null): void {
        if (this.selected === el) return
        if (this.selected) this.selected.selected = false
        this.selected = el
        if (el) el.selected = true
        this.markDirty()
        this.notify()
    }

    addElement(el: Drawable): void {
        this.elements.push(el)
        this.markDirty()
    }

    removeSelected(): void {
        if (!this.selected) return
        this.elements = this.elements.filter((e) => e !== this.selected)
        this.select(null)
        this.markDirty()
    }

    /** Call once before a gesture/action that mutates elements (draw, move, resize, delete). */
    beginChange(): void {
        this.pendingSnapshot = this.elements.map((e) => e.clone())
    }

    /** Call once the gesture/action finishes to push it onto the undo stack. */
    commitChange(): void {
        if (!this.pendingSnapshot) return
        this.undoStack.push(this.pendingSnapshot)
        this.pendingSnapshot = null
        this.redoStack = []
        this.notify()
    }

    /** Call instead of commitChange() when a gesture turned out to be a no-op (e.g. a click with no drag). */
    abortChange(): void {
        this.pendingSnapshot = null
    }

    undo(): void {
        if (this.undoStack.length === 0) return
        this.redoStack.push(this.elements.map((e) => e.clone()))
        this.elements = this.undoStack.pop()!
        this.select(null)
        this.markDirty()
        this.notify()
    }

    redo(): void {
        if (this.redoStack.length === 0) return
        this.undoStack.push(this.elements.map((e) => e.clone()))
        this.elements = this.redoStack.pop()!
        this.select(null)
        this.markDirty()
        this.notify()
    }

    get canUndo(): boolean {
        return this.undoStack.length > 0
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0
    }

    /** Call when a new image is pasted in — clears the canvas and history. */
    reset(image: HTMLImageElement): void {
        this.image = image
        this.elements = []
        this.selected = null
        this.undoStack = []
        this.redoStack = []
        this.pendingSnapshot = null
        this.tool = 'select'
        this.markDirty()
        this.notify()
    }
}
