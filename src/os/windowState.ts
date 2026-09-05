import type { OsAction, OsState, WindowDef, WindowId } from '@/os/types'

/** Windows stack from here. Below it: wallpaper and desktop icons. */
export const Z_BASE = 10

export function initialOsState(defs: readonly WindowDef[]): OsState {
  return { open: defs.filter((d) => d.openOnLoad).map((d) => d.id) }
}

/** Removes an id then appends it, which is both "raise" and "deduplicate". */
function raise(open: readonly WindowId[], id: WindowId): WindowId[] {
  return [...open.filter((w) => w !== id), id]
}

export function osReducer(state: OsState, action: OsAction): OsState {
  switch (action.type) {
    case 'open':
      return { open: raise(state.open, action.id) }
    case 'focus':
      // Focusing something closed is a no-op rather than an open. A stray
      // focus must never resurrect a window the visitor deliberately closed.
      return state.open.includes(action.id) ? { open: raise(state.open, action.id) } : state
    case 'close':
      return state.open.includes(action.id)
        ? { open: state.open.filter((w) => w !== action.id) }
        : state
  }
}

export function isOpen(state: OsState, id: WindowId): boolean {
  return state.open.includes(id)
}

/** -1 for a closed window. Callers render it hidden rather than unmounted. */
export function zIndexOf(state: OsState, id: WindowId): number {
  const i = state.open.indexOf(id)
  return i === -1 ? -1 : Z_BASE + i
}
