import { EditorStore } from './lib/store'
import { Renderer } from './lib/renderer'
import { Viewport } from './lib/viewport'
import { InteractionController } from './lib/interaction'
import { initPasteHandler } from './lib/paste'
import { copyAnnotatedImage } from './lib/clipboard'
import { setActiveColor, subscribeActiveColor } from './lib/colorStore'
import type { ToolName } from './lib/types'

const canvas = document.getElementById(
    'edit-canvas'
) as HTMLCanvasElement | null
const imgEl = document.getElementById('source-image') as HTMLImageElement | null
const editArea = document.getElementById('edit-area')
const emptyState = document.getElementById('empty-state')
const toolbar = document.querySelector('[role="toolbar"]')
const colorPicker = document.getElementById('color-picker')
const btnUndo = document.getElementById('btn-undo')
const btnRedo = document.getElementById('btn-redo')
const btnCopy = document.getElementById('btn-copy')

if (!canvas || !imgEl || !editArea || !emptyState || !toolbar) {
    console.error('Snip: expected DOM elements are missing — aborting init.')
} else {
    const store = new EditorStore()
    const renderer = new Renderer(canvas, store, new Viewport(canvas))
    const interaction = new InteractionController(canvas, store)

    renderer.start()

    // --- Paste -> reveal editor, hide empty state ---
    initPasteHandler(imgEl, store, renderer, () => {
        emptyState.style.display = 'none'
        editArea.style.display = 'flex'
        syncToolCursor()
    })

    // --- Toolbar: tool buttons ---
    toolbar.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
            'button[data-tool]'
        )
        if (!btn) return
        const tool = btn.dataset.tool as ToolName | undefined
        if (!tool || !['select', 'rect', 'arrow', 'pixelate'].includes(tool))
            return

        store.setTool(tool)
    })

    store.subscribe(() => {
        for (const btn of toolbar.querySelectorAll<HTMLButtonElement>(
            'button[data-tool]'
        )) {
            const isActive = btn.dataset.tool === store.tool
            btn.setAttribute('aria-pressed', String(isActive))
        }
        syncToolCursor()
        syncUndoRedoButtons()
    })

    function syncToolCursor(): void {
        canvas!.classList.toggle('tool-select', store.tool === 'select')
        canvas!.classList.toggle('tool-draw', store.tool !== 'select')
    }

    // --- Color picker ---
    if (colorPicker) {
        colorPicker.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
                'button[data-color]'
            )
            if (!btn?.dataset.color) return
            setActiveColor(btn.dataset.color)
        })

        subscribeActiveColor((color: string) => {
            for (const btn of colorPicker.querySelectorAll<HTMLButtonElement>(
                'button[data-color]'
            )) {
                btn.setAttribute(
                    'aria-checked',
                    String(btn.dataset.color === color)
                )
            }
        })
    }

    // --- Undo / redo ---
    function syncUndoRedoButtons(): void {
        btnUndo?.setAttribute('aria-disabled', String(!store.canUndo))
        btnRedo?.setAttribute('aria-disabled', String(!store.canRedo))
    }
    syncUndoRedoButtons()

    btnUndo?.addEventListener('click', () => store.undo())
    btnRedo?.addEventListener('click', () => store.redo())

    // --- Copy ---
    btnCopy?.addEventListener('click', async () => {
        const result = await copyAnnotatedImage(store)
        btnCopy.dataset.tooltip = result.ok ? 'Copied!' : result.reason
        if (result.ok) {
            setTimeout(() => {
                btnCopy.dataset.tooltip = 'Copy'
            }, 1500)
        }
    })

    // --- Keyboard shortcuts ---
    window.addEventListener('keydown', (e) => {
        const isMod = e.metaKey || e.ctrlKey

        if ((e.key === 'Delete' || e.key === 'Backspace') && store.selected) {
            const target = e.target as HTMLElement | null
            if (
                target &&
                (target.tagName === 'INPUT' || target.isContentEditable)
            )
                return
            e.preventDefault()
            store.beginChange()
            store.removeSelected()
            store.commitChange()
            return
        }

        if (isMod && e.key.toLowerCase() === 'z') {
            e.preventDefault()
            if (e.shiftKey) store.redo()
            else store.undo()
            return
        }

        if (isMod && e.key.toLowerCase() === 'y') {
            e.preventDefault()
            store.redo()
            return
        }

        if (e.key === 'Escape') {
            store.select(null)
        }
    })

    // Cleanup if this script instance is ever torn down (e.g. Astro view transitions).
    window.addEventListener('pagehide', () => {
        renderer.stop()
        interaction.destroy()
    })
}
