/** Geometry for the desktop's rubber-band selection. No DOM in here. */

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** The rectangle between two corners, whichever order they were dragged in. */
export function normalizeRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

/** Strict overlap. Rectangles that only share an edge do not intersect. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

export function selectIntersecting<T extends string>(
  marquee: Rect,
  items: readonly { id: T; rect: Rect }[],
): T[] {
  return items.filter((item) => rectsIntersect(marquee, item.rect)).map((item) => item.id)
}
