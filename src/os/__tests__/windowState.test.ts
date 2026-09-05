import { describe, it, expect } from 'vitest'
import { initialOsState, osReducer, zIndexOf, isOpen, Z_BASE } from '@/os/windowState'
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
