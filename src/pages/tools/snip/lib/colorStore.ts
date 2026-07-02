import { DEFAULT_COLOR } from './config'

type Listener = (color: string) => void

let activeColor: string = DEFAULT_COLOR
const listeners = new Set<Listener>()

export function getActiveColor(): string {
    return activeColor
}

export function setActiveColor(color: string): void {
    if (activeColor === color) return
    activeColor = color
    for (const fn of listeners) fn(activeColor)
}

export function subscribeActiveColor(fn: Listener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
}
