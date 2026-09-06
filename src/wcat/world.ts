import { CAT_SIZE } from './physics'
import type { World } from './physics'

/** All layout reads happen together, before the frame writes the cat transform. */
export function readWorld(layer: HTMLElement, mobile: boolean, reducedMotion: boolean): World & { left: number; top: number } {
  const rect = layer.getBoundingClientRect()
  const width = rect.width || window.innerWidth
  const height = rect.height || window.innerHeight
  const world = { width, floor: Math.max(CAT_SIZE, height - (mobile ? 8 : 44)), left: rect.left, top: rect.top, reducedMotion }
  if (mobile) return { ...world, platforms: [] }
  const root = layer.parentElement ?? layer
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
  return { ...world, platforms }
}
