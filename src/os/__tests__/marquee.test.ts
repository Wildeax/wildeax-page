import { describe, it, expect } from 'vitest'
import { normalizeRect, rectsIntersect, selectIntersecting } from '@/os/marquee'

describe('normalizeRect', () => {
  it('is the same rectangle whichever corner was dragged first', () => {
    const a = normalizeRect({ x: 10, y: 20 }, { x: 110, y: 70 })
    const b = normalizeRect({ x: 110, y: 70 }, { x: 10, y: 20 })
    expect(a).toEqual({ x: 10, y: 20, width: 100, height: 50 })
    expect(b).toEqual(a)
  })

  it('has zero size before the pointer has moved', () => {
    expect(normalizeRect({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 5, y: 5, width: 0, height: 0 })
  })
})

describe('rectsIntersect', () => {
  const icon = { x: 100, y: 100, width: 80, height: 80 }

  it('is true when the marquee covers part of the icon', () => {
    expect(rectsIntersect({ x: 150, y: 150, width: 200, height: 200 }, icon)).toBe(true)
  })

  it('is true when the marquee is entirely inside the icon', () => {
    expect(rectsIntersect({ x: 120, y: 120, width: 10, height: 10 }, icon)).toBe(true)
  })

  it('is false when they only share an edge', () => {
    expect(rectsIntersect({ x: 180, y: 100, width: 50, height: 50 }, icon)).toBe(false)
  })

  it('is false when apart', () => {
    expect(rectsIntersect({ x: 500, y: 500, width: 50, height: 50 }, icon)).toBe(false)
  })
})

describe('selectIntersecting', () => {
  it('returns the ids of every icon the marquee touches, in order', () => {
    const items = [
      { id: 'readme', rect: { x: 10, y: 10, width: 60, height: 60 } },
      { id: 'work', rect: { x: 10, y: 100, width: 60, height: 60 } },
      { id: 'art', rect: { x: 10, y: 190, width: 60, height: 60 } },
    ] as const
    expect(selectIntersecting({ x: 0, y: 0, width: 100, height: 130 }, items)).toEqual(['readme', 'work'])
  })

  it('returns nothing for a zero-size marquee on empty wallpaper', () => {
    const items = [{ id: 'readme', rect: { x: 10, y: 10, width: 60, height: 60 } }] as const
    expect(selectIntersecting({ x: 500, y: 500, width: 0, height: 0 }, items)).toEqual([])
  })
})
