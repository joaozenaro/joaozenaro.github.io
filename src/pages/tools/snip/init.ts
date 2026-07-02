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
        if (result.ok) {
            showToast('Annotated image copied to clipboard!', 'success')
        } else {
            showToast(`Failed to copy: ${result.reason}`, 'error')
        }
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
        const target = e.target as HTMLElement | null
        const isTyping =
            target &&
            (target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable)

        if (isTyping) return

        if ((e.key === 'Delete' || e.key === 'Backspace') && store.selected) {
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

        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            const key = e.key.toLowerCase()
            if (key === 'r') {
                e.preventDefault()
                store.setTool('rect')
                return
            }
            if (key === 'a') {
                e.preventDefault()
                store.setTool('arrow')
                return
            }
            if (key === 'v') {
                e.preventDefault()
                store.setTool('select')
                return
            }
            if (key === 'p') {
                e.preventDefault()
                store.setTool('pixelate')
                return
            }
        }

        if (e.key === 'Escape') {
            store.select(null)
        }
    })

    // --- Toast notification ---
    function showToast(message: string, type: 'success' | 'error' = 'success'): void {
        let container = document.getElementById('toast-container')
        if (!container) {
            container = document.createElement('div')
            container.id = 'toast-container'
            document.body.appendChild(container)
        }

        const toast = document.createElement('div')
        toast.className = `toast toast-${type}`
        toast.innerText = message

        container.appendChild(toast)

        // Trigger transition
        requestAnimationFrame(() => {
            toast.classList.add('visible')
        })

        setTimeout(() => {
            toast.classList.remove('visible')
            toast.addEventListener('transitionend', () => {
                toast.remove()
                if (container && container.childElementCount === 0) {
                    container.remove()
                }
            })
        }, 2500)
    }

    // Cleanup if this script instance is ever torn down (e.g. Astro view transitions).
    window.addEventListener('pagehide', () => {
        renderer.stop()
        interaction.destroy()
    })
}
