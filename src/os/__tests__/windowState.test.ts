import { describe, it, expect } from 'vitest'
import {
  initialOsState,
  osReducer,
  zIndexOf,
  isOpen,
  isMinimized,
  isVisible,
  Z_BASE,
} from '@/os/windowState'
import type { WindowDef } from '@/os/types'

const defs: WindowDef[] = [
  { id: 'readme', titleKey: 'os.win.readme', width: 460, height: 320, x: 40, y: 40, openOnLoad: true, glyph: '📄' },
  { id: 'work', titleKey: 'os.win.work', width: 420, height: 360, x: 520, y: 80, openOnLoad: true, glyph: '🗂️' },
  { id: 'art', titleKey: 'os.win.art', width: 520, height: 400, x: 200, y: 140, openOnLoad: false, glyph: '🎨' },
]

describe('initialOsState', () => {
  it('opens only the windows flagged openOnLoad, in registry order', () => {
    expect(initialOsState(defs).open).toEqual(['readme', 'work'])
  })

  it('starts with nothing minimized', () => {
    expect(initialOsState(defs).minimized).toEqual([])
  })
})

describe('osReducer', () => {
  it('appends a newly opened window on top', () => {
    const s = osReducer(initialOsState(defs), { type: 'open', id: 'art' })
    expect(s.open).toEqual(['readme', 'work', 'art'])
  })

  it('does not duplicate a window that is already open', () => {
    const s = osReducer(initialOsState(defs), { type: 'open', id: 'readme' })
    expect(s.open).toEqual(['work', 'readme'])
    expect(s.open.filter((id) => id === 'readme')).toHaveLength(1)
  })

  it('raises an already-open window to the top when opened again', () => {
    const s = osReducer(initialOsState(defs), { type: 'open', id: 'readme' })
    expect(s.open[s.open.length - 1]).toBe('readme')
  })

  it('removes a window on close', () => {
    const s = osReducer(initialOsState(defs), { type: 'close', id: 'readme' })
    expect(s.open).toEqual(['work'])
  })

  it('ignores closing a window that is not open', () => {
    const before = initialOsState(defs)
    expect(osReducer(before, { type: 'close', id: 'art' }).open).toEqual(before.open)
  })

  it('raises on focus', () => {
    const s = osReducer(initialOsState(defs), { type: 'focus', id: 'readme' })
    expect(s.open).toEqual(['work', 'readme'])
  })

  it('ignores focusing a closed window rather than opening it', () => {
    const s = osReducer(initialOsState(defs), { type: 'focus', id: 'art' })
    expect(s.open).toEqual(['readme', 'work'])
  })

  it('does not mutate the state it was given', () => {
    const before = initialOsState(defs)
    osReducer(before, { type: 'open', id: 'art' })
    expect(before.open).toEqual(['readme', 'work'])
  })
})

describe('minimize and restore', () => {
  it('keeps a minimized window in open, so its taskbar entry and z-slot survive', () => {
    const s = osReducer(initialOsState(defs), { type: 'minimize', id: 'readme' })
    expect(s.open).toEqual(['readme', 'work'])
    expect(s.minimized).toEqual(['readme'])
    expect(isVisible(s, 'readme')).toBe(false)
    expect(isOpen(s, 'readme')).toBe(true)
  })

  it('ignores minimizing a closed window', () => {
    const before = initialOsState(defs)
    expect(osReducer(before, { type: 'minimize', id: 'art' })).toBe(before)
  })

  it('does not double-minimize', () => {
    const once = osReducer(initialOsState(defs), { type: 'minimize', id: 'readme' })
    expect(osReducer(once, { type: 'minimize', id: 'readme' })).toBe(once)
  })

  it('restore un-minimizes and raises', () => {
    const min = osReducer(initialOsState(defs), { type: 'minimize', id: 'readme' })
    const s = osReducer(min, { type: 'restore', id: 'readme' })
    expect(s.minimized).toEqual([])
    expect(s.open).toEqual(['work', 'readme'])
    expect(isVisible(s, 'readme')).toBe(true)
  })

  it('ignores restoring something that is not minimized', () => {
    const before = initialOsState(defs)
    expect(osReducer(before, { type: 'restore', id: 'readme' })).toBe(before)
  })

  it('does not focus a minimized window; restore is the verb for that', () => {
    const min = osReducer(initialOsState(defs), { type: 'minimize', id: 'readme' })
    expect(osReducer(min, { type: 'focus', id: 'readme' })).toBe(min)
  })

  it('open on a minimized window restores it', () => {
    const min = osReducer(initialOsState(defs), { type: 'minimize', id: 'readme' })
    const s = osReducer(min, { type: 'open', id: 'readme' })
    expect(isMinimized(s, 'readme')).toBe(false)
    expect(s.open[s.open.length - 1]).toBe('readme')
  })

  it('close clears minimized too', () => {
    const min = osReducer(initialOsState(defs), { type: 'minimize', id: 'readme' })
    const s = osReducer(min, { type: 'close', id: 'readme' })
    expect(s.open).toEqual(['work'])
    expect(s.minimized).toEqual([])
  })
})

describe('zIndexOf and isOpen', () => {
  it('stacks later windows above earlier ones', () => {
    const s = initialOsState(defs)
    expect(zIndexOf(s, 'readme')).toBe(Z_BASE)
    expect(zIndexOf(s, 'work')).toBe(Z_BASE + 1)
  })

  it('reports a closed window as not open', () => {
    const s = initialOsState(defs)
    expect(isOpen(s, 'art')).toBe(false)
    expect(isOpen(s, 'readme')).toBe(true)
  })
})
