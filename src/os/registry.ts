import type { WindowDef, WindowId } from '@/os/types'
import arenaLogo from '@/assets/img/arena/logo-icon x512.png'
import swLogo from '@/assets/img/sw/SW white transperent.png'
import sweeprIcon from '@/assets/img/minesweeper/minesweeper_icon.png'
import portrait from '@/assets/img/wildeax portrait2.jpg'

/**
 * The one description of every window. Positions here are the authored
 * defaults; once a visitor drags a window, the shared position from
 * `Playable` takes over for everyone.
 *
 * readme, work and me open on load. A viewport-locked page has no scrollbar
 * and so no affordance that more exists, and an empty desktop reads as broken.
 *
 * iconSrc is a real logo where one exists. Windows without one fall back to
 * the emoji glyph.
 */
export const WINDOWS: readonly WindowDef[] = [
  { id: 'readme', titleKey: 'os.win.readme', width: 440, height: 300, x: 48, y: 56, openOnLoad: true, glyph: '📄' },
  { id: 'work', titleKey: 'os.win.work', width: 420, height: 340, x: 540, y: 96, openOnLoad: true, glyph: '🗂️' },
  { id: 'me', titleKey: 'os.win.me', width: 300, height: 330, x: 200, y: 400, openOnLoad: true, glyph: '🖼️', iconSrc: portrait },
  { id: 'art', titleKey: 'os.win.art', width: 520, height: 380, x: 300, y: 180, openOnLoad: false, glyph: '🎨' },
  { id: 'contact', titleKey: 'os.win.contact', width: 380, height: 280, x: 640, y: 380, openOnLoad: false, glyph: '✉️' },
  { id: 'splitwars', titleKey: 'os.win.splitwars', width: 440, height: 320, x: 260, y: 120, openOnLoad: false, glyph: '🚀', iconSrc: swLogo },
  { id: 'arena', titleKey: 'os.win.arena', width: 440, height: 320, x: 290, y: 150, openOnLoad: false, glyph: '⚔️', iconSrc: arenaLogo },
  { id: 'sweepr98', titleKey: 'os.win.sweepr98', width: 440, height: 300, x: 320, y: 180, openOnLoad: false, glyph: '💣', iconSrc: sweeprIcon },
  { id: 'collab', titleKey: 'os.win.collab', width: 440, height: 320, x: 350, y: 210, openOnLoad: false, glyph: '🔗' },
  { id: 'pos', titleKey: 'os.win.pos', width: 440, height: 320, x: 380, y: 240, openOnLoad: false, glyph: '🏥' },
]

/**
 * What appears on the desktop itself. Project windows are reached through
 * work.exe rather than cluttering the desktop with ten icons.
 */
export const DESKTOP_ICON_IDS: readonly WindowId[] = ['readme', 'work', 'art', 'me', 'contact']

export function windowById(id: WindowId): WindowDef {
  const found = WINDOWS.find((w) => w.id === id)
  if (!found) throw new Error(`Unknown window id: ${id}`)
  return found
}
