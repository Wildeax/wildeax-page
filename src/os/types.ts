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
  /** Emoji shown on the desktop icon and in the taskbar. */
  glyph: string
}

/** Open windows, ordered back to front. The last entry is focused. */
export interface OsState {
  open: WindowId[]
}

export type OsAction =
  | { type: 'open'; id: WindowId }
  | { type: 'close'; id: WindowId }
  | { type: 'focus'; id: WindowId }
