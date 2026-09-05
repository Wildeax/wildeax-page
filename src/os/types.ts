/**
 * Stable window identifiers. These key shared position state, so they must
 * never be derived from translated text: Features keyed its cards on the
 * translated title, and switching to Spanish moved every saved position.
 */
export type WindowId =
  | 'readme'
  | 'work'
  | 'art'
  | 'me'
  | 'contact'
  | 'splitwars'
  | 'arena'
  | 'sweepr98'
  | 'collab'
  | 'pos'

export interface WindowDef {
  id: WindowId
  /** i18n key for the title bar, e.g. 'os.win.readme'. */
  titleKey: string
  width: number
  height: number
  /** Authored position. Visitors drag from here, and that is shared. */
  x: number
  y: number
  openOnLoad: boolean
  /** Emoji fallback for the desktop icon and taskbar. */
  glyph: string
  /** A real logo or image. Wins over glyph wherever one is rendered. */
  iconSrc?: string
}

/**
 * Open windows ordered back to front; the last entry is focused. Minimized is
 * a subset of open: a minimized window keeps its taskbar entry and z-slot but
 * is not drawn. All of this is per visitor, never shared.
 */
export interface OsState {
  open: WindowId[]
  minimized: WindowId[]
}

export type OsAction =
  | { type: 'open'; id: WindowId }
  | { type: 'close'; id: WindowId }
  | { type: 'focus'; id: WindowId }
  | { type: 'minimize'; id: WindowId }
  | { type: 'restore'; id: WindowId }
