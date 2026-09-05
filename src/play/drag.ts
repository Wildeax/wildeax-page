import type { Point, Rect, Size } from '@/play/types'

/** Below this much travel the interaction is a click, so links still work. */
export const DRAG_THRESHOLD_PX = 5

/** Touch hold before an element lifts, so a normal swipe still scrolls. */
export const LONG_PRESS_MS = 250

export function exceedsDragThreshold(start: Point, current: Point): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= DRAG_THRESHOLD_PX
}

/**
 * Negating a zero bound produces -0, which is a real number that renders as
 * "translate(-0px)" and compares false under Object.is. Normalise it away.
 */
function zeroed(n: number): number {
  return n === 0 ? 0 : n
}

function clamp(value: number, low: number, high: number): number {
  // An element larger than the page gives high < low. Prefer the low edge so
  // the element's top-left stays visible rather than its bottom-right.
  if (high < low) return zeroed(low)
  return zeroed(Math.min(Math.max(value, low), high))
}

/**
 * Keeps a dragged element inside the document. Positions are permanent and
 * never decay, so without this an element flung off-screen is gone for every
 * future visitor until the room is reset.
 */
export function clampToBounds(offset: Point, rect: Rect, page: Size): Point {
  return {
    x: clamp(offset.x, -rect.left, page.width - rect.left - rect.width),
    y: clamp(offset.y, -rect.top, page.height - rect.top - rect.height),
  }
}
