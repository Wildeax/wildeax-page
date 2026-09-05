import type { OsAction, OsState, WindowDef, WindowId } from '@/os/types'

/** Windows stack from here. Below it: wallpaper and desktop icons. */
export const Z_BASE = 10

export function initialOsState(defs: readonly WindowDef[]): OsState {
  return { open: defs.filter((d) => d.openOnLoad).map((d) => d.id), minimized: [] }
}

/** Removes an id then appends it, which is both "raise" and "deduplicate". */
function raise(open: readonly WindowId[], id: WindowId): WindowId[] {
  return [...open.filter((w) => w !== id), id]
}

function without(list: readonly WindowId[], id: WindowId): WindowId[] {
  return list.filter((w) => w !== id)
}

export function osReducer(state: OsState, action: OsAction): OsState {
  const { id } = action
  switch (action.type) {
    case 'open':
      // Opening also restores: a window you ask for should be on screen.
      return { open: raise(state.open, id), minimized: without(state.minimized, id) }
    case 'focus':
      // Focusing something closed is a no-op rather than an open. A stray
      // focus must never resurrect a window the visitor deliberately closed.
      // A minimized window is not on screen either; restore is the verb there.
      if (!state.open.includes(id) || state.minimized.includes(id)) return state
      return { ...state, open: raise(state.open, id) }
    case 'close':
      if (!state.open.includes(id)) return state
      return { open: without(state.open, id), minimized: without(state.minimized, id) }
    case 'minimize':
      if (!state.open.includes(id) || state.minimized.includes(id)) return state
      return { ...state, minimized: [...state.minimized, id] }
    case 'restore':
      if (!state.minimized.includes(id)) return state
      return { open: raise(state.open, id), minimized: without(state.minimized, id) }
  }
}

export function isOpen(state: OsState, id: WindowId): boolean {
  return state.open.includes(id)
}

export function isMinimized(state: OsState, id: WindowId): boolean {
  return state.minimized.includes(id)
}

/** Open and not minimized: the window is actually drawn. */
export function isVisible(state: OsState, id: WindowId): boolean {
  return isOpen(state, id) && !isMinimized(state, id)
}

/** -1 for a closed window. Callers render it hidden rather than unmounted. */
export function zIndexOf(state: OsState, id: WindowId): number {
  const i = state.open.indexOf(id)
  return i === -1 ? -1 : Z_BASE + i
}
