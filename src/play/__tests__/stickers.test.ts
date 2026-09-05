import { describe, it, expect } from 'vitest'
import { addSticker, STICKER_CAP, STICKER_KINDS } from '@/play/stickers'
import type { PlacedSticker } from '@/play/stickers'

function makeSticker(id: string, placedAt: number): PlacedSticker {
  return { id, kind: 'star', x: 0, y: 0, rotation: 0, scale: 1, placedAt }
}

describe('addSticker', () => {
  it('appends while under the cap', () => {
    const result = addSticker([makeSticker('a', 1)], makeSticker('b', 2), 10)
    expect(result.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('evicts the oldest once over the cap', () => {
    const existing = [makeSticker('a', 5), makeSticker('b', 1), makeSticker('c', 9)]
    const result = addSticker(existing, makeSticker('d', 12), 3)
    expect(result).toHaveLength(3)
    expect(result.map((s) => s.id)).toEqual(['a', 'c', 'd'])
  })

  it('holds at the cap across many placements', () => {
    let list: PlacedSticker[] = []
    for (let i = 0; i < STICKER_CAP + 1; i++) {
      list = addSticker(list, makeSticker(`s${i}`, i))
    }
    expect(list).toHaveLength(STICKER_CAP)
    expect(list.some((s) => s.id === 's0')).toBe(false)
  })

  it('does not mutate the list it was given', () => {
    const existing = [makeSticker('a', 1)]
    addSticker(existing, makeSticker('b', 2), 10)
    expect(existing).toHaveLength(1)
  })
})

describe('STICKER_KINDS', () => {
  it('has unique ids', () => {
    const ids = STICKER_KINDS.map((k) => k.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is not empty, or the palette renders nothing', () => {
    expect(STICKER_KINDS.length).toBeGreaterThan(0)
  })
})
