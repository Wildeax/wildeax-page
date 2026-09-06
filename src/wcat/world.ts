import { CAT_SIZE } from './physics'
import type { Obstacle, World } from './physics'

/** All layout reads happen together, before the frame writes the cat transform. */
export function readWorld(layer: HTMLElement, mobile: boolean, reducedMotion: boolean, room = false): World & { left: number; top: number } {
  const rect = layer.getBoundingClientRect()
  const width = rect.width || window.innerWidth
  const height = rect.height || window.innerHeight
  const world = { width, floor: Math.max(CAT_SIZE, height - (mobile ? 8 : 44)), left: rect.left, top: rect.top, reducedMotion }
  if (mobile && !room) {
    const padding = Math.max(8, parseFloat(getComputedStyle(layer).paddingBottom) || 0)
    const viewport = window.visualViewport
    // Browser chrome/keyboards can reduce the visible floor independently of
    // the layout viewport. Pinch zoom should not reposition the pet.
    const visibleHeight = viewport?.scale === 1 ? Math.min(height, viewport.offsetTop + viewport.height - rect.top) : height
    world.floor = Math.max(CAT_SIZE, visibleHeight - padding)
  }
  if (room) {
    const dock = layer.ownerDocument.querySelector('[data-sticker-dock]')?.getBoundingClientRect()
    // A room stays in its window's stacking context. Reserve the portion
    // above the foreground dock instead of leaving an unreachable cat behind it.
    if (dock && dock.width && dock.right > rect.left && dock.left < rect.right && dock.top > rect.top && dock.top < rect.bottom) {
      world.floor = Math.max(CAT_SIZE, Math.min(world.floor, dock.top - rect.top - 4))
    }
  }
  if (mobile) return { ...world, platforms: [] }
  const root = layer.parentElement ?? layer
  const band = root.querySelector('[data-marquee]')?.getBoundingClientRect()
  const obstacles: Obstacle[] = []
  if (band && band.width >= 2 && band.height >= 2) {
    const wall = { id: 'selection', left: Math.max(0, band.left - rect.left), right: Math.min(width, band.right - rect.left), y: Math.max(0, band.top - rect.top), bottom: Math.min(world.floor, band.bottom - rect.top) }
    if (wall.right > wall.left && wall.bottom > wall.y) obstacles.push(wall)
  }
  const platforms = [...root.querySelectorAll<HTMLElement>('[data-window]:not([hidden]) [data-drag-handle]')].flatMap((el) => {
    if (el.closest('.os-flight-minimize, .os-flight-close')) return []
    const r = el.getBoundingClientRect()
    if (!r.width || getComputedStyle(el).visibility === 'hidden') return []
    const y = r.top - rect.top
    const left = Math.max(0, r.left - rect.left)
    const right = Math.min(width, r.right - rect.left)
    if (y < CAT_SIZE || y >= world.floor || right - left < CAT_SIZE) return []
    return [{ id: el.closest<HTMLElement>('[data-window]')!.dataset.window!, left, right, y }]
  })
  for (const wall of obstacles) if (wall.y >= CAT_SIZE && wall.right - wall.left >= CAT_SIZE) platforms.push(wall)
  return { ...world, platforms, obstacles }
}
