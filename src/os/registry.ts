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
 *
 * Layout budget, enforced by the registry test: x >= 120 so nothing covers the
 * icon column, and every window fits a 1280x720 desktop above a 44px taskbar.
 * Desktop.tsx also clamps at runtime for smaller viewports. The first version
 * put me.jpg at y=400 with height 330, which on a 711px-tall screen sat under
 * the taskbar and behind the sticker dock, so its minimize flight was invisible.
 */
export const WINDOWS: readonly WindowDef[] = [
  { id: 'readme', titleKey: 'os.win.readme', width: 440, height: 260, x: 130, y: 56, openOnLoad: true, glyph: '📄' },
  { id: 'work', titleKey: 'os.win.work', width: 420, height: 340, x: 590, y: 56, openOnLoad: true, glyph: '🗂️' },
  { id: 'me', titleKey: 'os.win.me', width: 300, height: 300, x: 120, y: 336, openOnLoad: true, glyph: '🖼️', iconSrc: portrait },
  { id: 'art', titleKey: 'os.win.art', width: 520, height: 380, x: 600, y: 280, openOnLoad: false, glyph: '🎨' },
  { id: 'contact', titleKey: 'os.win.contact', width: 380, height: 280, x: 460, y: 340, openOnLoad: false, glyph: '✉️' },
  { id: 'splitwars', titleKey: 'os.win.splitwars', width: 440, height: 320, x: 300, y: 140, openOnLoad: false, glyph: '🚀', iconSrc: swLogo },
  { id: 'arena', titleKey: 'os.win.arena', width: 440, height: 320, x: 330, y: 170, openOnLoad: false, glyph: '⚔️', iconSrc: arenaLogo },
  { id: 'sweepr98', titleKey: 'os.win.sweepr98', width: 440, height: 300, x: 360, y: 200, openOnLoad: false, glyph: '💣', iconSrc: sweeprIcon },
  { id: 'collab', titleKey: 'os.win.collab', width: 440, height: 320, x: 390, y: 230, openOnLoad: false, glyph: '🔗' },
  { id: 'pos', titleKey: 'os.win.pos', width: 440, height: 320, x: 420, y: 260, openOnLoad: false, glyph: '🏥' },
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
