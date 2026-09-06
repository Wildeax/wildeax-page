import type { Body } from './physics'

export interface IconTarget { id: string; x: number; y: number; open: boolean }
export interface Visit {
  phase: 'idle' | 'inspect' | 'hop'
  nextAt: number
  until: number
  startedAt: number
  target: IconTarget | null
  origin: { x: number; y: number }
}

export function createVisit(now: number, random: () => number): Visit {
  return { phase: 'idle', nextAt: now + 22 + random() * 18, until: 0, startedAt: 0, target: null, origin: { x: 0, y: 0 } }
}

export function visitIcon(previous: Visit, body: Body, icons: readonly IconTarget[], now: number, busy: boolean, random: () => number, visited: ReadonlySet<string> = new Set(), openWindows = icons.filter((icon) => icon.open).length): Visit {
  if (busy) return previous.phase === 'idle' ? previous : createVisit(now, random)
  const eligible = (icon: IconTarget) => !icon.open && (openWindows < 2 || !visited.has(icon.id))
  if (previous.phase !== 'idle') {
    const target = icons.find((icon) => icon.id === previous.target?.id && eligible(icon))
    if (!target) return createVisit(now, random)
    if (previous.phase === 'inspect' && now >= previous.until) {
      if (random() >= 0.6) return createVisit(now, random)
      return { ...previous, phase: 'hop', startedAt: now, until: now + 0.8, target, origin: { x: body.x, y: body.y } }
    }
    return { ...previous, target }
  }
  if (now < previous.nextAt || !body.ground || body.form !== 'cat') return previous
  const target = icons.filter((icon) => eligible(icon) && Math.hypot(icon.x - body.x, icon.y - body.y) <= 650)
    .sort((a, b) => Number(visited.has(a.id)) - Number(visited.has(b.id)) || Math.hypot(a.x - body.x, a.y - body.y) - Math.hypot(b.x - body.x, b.y - body.y))[0]
  if (!target) return { ...previous, nextAt: now + 5 }
  return { ...previous, phase: 'inspect', target, until: now + 1.1, origin: { x: body.x, y: body.y } }
}

export function readIcons(root: HTMLElement, origin: { left: number; top: number }): IconTarget[] {
  const windows = [...root.querySelectorAll<HTMLElement>('[data-window]')]
  return [...root.querySelectorAll<HTMLElement>('[data-icon]')].flatMap((icon) => {
    const win = windows.find((el) => el.dataset.window === icon.dataset.icon)
    const rect = icon.getBoundingClientRect()
    if (!win || !rect.width || getComputedStyle(icon).visibility === 'hidden') return []
    const x = rect.left + rect.width / 2
    const y = rect.top + Math.min(34, rect.height / 2)
    if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) return []
    const top = document.elementFromPoint?.(x, y)
    if (top && !icon.contains(top) && !top.closest('[data-wcat]')) return []
    return [{ id: icon.dataset.icon!, x: x - origin.left, y: y - origin.top, open: !win.hidden }]
  })
}

export function roomFor(root: HTMLElement, id: string): HTMLElement | null {
  const win = [...root.querySelectorAll<HTMLElement>('[data-window]')].find((el) => el.dataset.window === id)
  if (!win || win.hidden || win.closest('[class*="os-flight-"]') || getComputedStyle(win).visibility === 'hidden') return null
  return win.querySelector<HTMLElement>('[data-wcat-room]')
}
