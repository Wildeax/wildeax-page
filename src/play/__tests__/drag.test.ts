import { describe, it, expect } from 'vitest'
import { exceedsDragThreshold, clampToBounds, DRAG_THRESHOLD_PX } from '@/play/drag'

describe('exceedsDragThreshold', () => {
  it('treats movement below the threshold as a click', () => {
    expect(exceedsDragThreshold({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false)
  })

  it('treats movement at the threshold as a drag', () => {
    expect(exceedsDragThreshold({ x: 0, y: 0 }, { x: DRAG_THRESHOLD_PX, y: 0 })).toBe(true)
  })

  it('measures diagonal distance, not per-axis', () => {
    // 4px on each axis is 5.66px of travel, which is a drag.
    expect(exceedsDragThreshold({ x: 0, y: 0 }, { x: 4, y: 4 })).toBe(true)
  })

  it('is direction agnostic', () => {
    expect(exceedsDragThreshold({ x: 10, y: 10 }, { x: 4, y: 10 })).toBe(true)
  })
})

describe('clampToBounds', () => {
  const rect = { left: 100, top: 100, width: 50, height: 50 }
  const page = { width: 1000, height: 800 }

  it('leaves an in-bounds offset alone', () => {
    expect(clampToBounds({ x: 10, y: 10 }, rect, page)).toEqual({ x: 10, y: 10 })
  })

  it('stops an element escaping the left edge', () => {
    expect(clampToBounds({ x: -500, y: 0 }, rect, page)).toEqual({ x: -100, y: 0 })
  })

  it('stops an element escaping the right edge', () => {
    // 1000 - 100 - 50 = 850 is as far right as it can go.
    expect(clampToBounds({ x: 5000, y: 0 }, rect, page)).toEqual({ x: 850, y: 0 })
  })

  it('stops an element escaping the bottom edge', () => {
    expect(clampToBounds({ x: 0, y: 5000 }, rect, page)).toEqual({ x: 0, y: 650 })
  })

  it('prefers the left edge when the element is wider than the page', () => {
    const wide = { left: 0, top: 0, width: 2000, height: 50 }
    expect(clampToBounds({ x: 300, y: 0 }, wide, page).x).toBe(0)
  })
})
