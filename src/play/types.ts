export type Capability = 'move' | 'spin' | 'grow'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

/** A visitor's change to one element, relative to its authored position. */
export interface Transform {
  x: number
  y: number
  rotation: number
  scale: number
}

export const IDENTITY_TRANSFORM: Transform = { x: 0, y: 0, rotation: 0, scale: 1 }
