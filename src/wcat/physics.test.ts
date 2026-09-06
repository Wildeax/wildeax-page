import { describe, expect, it } from 'vitest'
import { createBody, GRAVITY, step, throwVelocity } from './physics'
import type { Body, World } from './physics'

const world: World = { width: 800, floor: 600, platforms: [] }
function advance(body: Body, seconds: number, hz = 60, bounds = world): Body {
  for (let i = 0; i < Math.round(seconds * hz); i++) body = step(body, 1 / hz, bounds)
  return body
}

describe('wcat physics', () => {
  it('integrates gravity without mutating the input', () => {
    const body = { ...createBody(world), y: 100, ground: null }
    const next = step(body, 0.01, world)
    expect(next.vy).toBeCloseTo(GRAVITY * 0.01)
    expect(next.y).toBeGreaterThan(100)
    expect(body.y).toBe(100)
  })

  it.each([
    { x: 781, y: 300, vx: 500, vy: 0, axis: 'vx' as const, sign: -1 },
    { x: 19, y: 300, vx: -500, vy: 0, axis: 'vx' as const, sign: 1 },
    { x: 400, y: 37, vx: 0, vy: -500, axis: 'vy' as const, sign: 1 },
    { x: 400, y: 599, vx: 0, vy: 500, axis: 'vy' as const, sign: -1 },
  ])('reflects a ball at each boundary: $axis / $sign', (input) => {
    const next = step({ ...createBody(world), ...input, form: 'ball', ground: null }, 0.01, world)
    expect(Math.sign(next[input.axis])).toBe(input.sign)
    if (input.axis === 'vx') expect(Math.abs(next.vx)).toBeCloseTo(360)
    else expect(Math.abs(next.vy)).toBeGreaterThan(300)
    expect(next.x).toBeGreaterThanOrEqual(18)
    expect(next.x).toBeLessThanOrEqual(782)
    expect(next.y).toBeGreaterThanOrEqual(36)
    expect(next.y).toBeLessThanOrEqual(600)
  })

  it('settles a thrown ball and applies time-scaled floor friction', () => {
    const ball: Body = { ...createBody(world), form: 'ball', vx: 600 }
    const slow = advance(ball, 1, 30)
    const fast = advance(ball, 1, 120)
    expect(slow.vx).toBeCloseTo(fast.vx, 5)
    expect(slow.vx).toBeLessThan(600)
    const resting = advance(ball, 8)
    expect(resting.ground).toBe('floor')
    expect(resting.rest).toBeGreaterThanOrEqual(0.3)
  })

  it('settles a ball dropped from 178 px above the floor', () => {
    const result = advance({ ...createBody(world), y: 422, form: 'ball', ground: null }, 4, 62.5)
    expect(result, JSON.stringify(result)).toMatchObject({ ground: 'floor', vy: 0 })
    expect(result.rest).toBeGreaterThanOrEqual(0.3)
  })

  it('lands on the first platform crossed even at high speed', () => {
    const bounds = { ...world, platforms: [
      { id: 'lower', left: 200, right: 600, y: 400 },
      { id: 'upper', left: 200, right: 600, y: 250 },
    ] }
    const next = step({ ...createBody(world), x: 300, y: 230, vy: 1800, ground: null }, 0.05, bounds)
    expect(next.ground).toBe('upper')
    expect(next.y).toBe(250)
    expect(next.vy).toBe(0)
  })

  it('passes upward through platforms and ignores them in ball form', () => {
    const bounds = { ...world, platforms: [{ id: 'window', left: 200, right: 600, y: 250 }] }
    const body = { ...createBody(world), x: 300, y: 260, vy: -500, ground: null }
    expect(step(body, 0.05, bounds).y).toBeLessThan(250)
    expect(step({ ...body, form: 'ball', y: 230, vy: 800 }, 0.05, bounds).y).toBeGreaterThan(250)
  })

  it.each(['removed', 'moved'])('falls when a supporting window is %s', (change) => {
    const bounds = { ...world, platforms: change === 'removed' ? [] : [{ id: 'window', left: 200, right: 600, y: 400 }] }
    const body = { ...createBody(world), x: 300, y: 250, ground: 'window' }
    const next = step(body, 0.02, bounds)
    expect(next.ground).toBeNull()
    expect(next.y).toBeGreaterThan(250)
  })

  it('drops with no horizontal flight or bounce under reduced motion', () => {
    const bounds = { ...world, reducedMotion: true }
    const result = advance({ ...createBody(world), form: 'ball', x: 300, y: 100, vx: 1000, vy: -700, ground: null }, 2, 60, bounds)
    expect(result.x).toBe(300)
    expect(result.y).toBe(600)
    expect(result.vy).toBe(0)
    expect(result.rest).toBeGreaterThan(0.3)
  })

  it('keeps both forms in bounds when the viewport shrinks', () => {
    const smaller = { ...world, width: 200, floor: 150 }
    const next = step({ ...createBody(world), x: 790, y: 580 }, 0.016, smaller)
    expect(next.x).toBeLessThanOrEqual(178)
    expect(next.y).toBe(150)
  })
})

describe('throw sampling', () => {
  it('averages only the latest 80 ms and caps total speed', () => {
    const velocity = throwVelocity([
      { x: -900, y: -900, at: 0 },
      { x: 0, y: 0, at: 0.1 },
      { x: 120, y: -120, at: 0.14 },
      { x: 240, y: -240, at: 0.18 },
    ])
    expect(Math.hypot(velocity.vx, velocity.vy)).toBeCloseTo(1800)
    expect(velocity.vx).toBeCloseTo(-velocity.vy)
  })

  it('does not throw after a pause or divide by zero', () => {
    expect(throwVelocity([{ x: 10, y: 10, at: 1 }, { x: 10, y: 10, at: 1.2 }])).toEqual({ vx: 0, vy: 0 })
    expect(throwVelocity([{ x: 10, y: 10, at: 1 }, { x: 20, y: 20, at: 1 }])).toEqual({ vx: 0, vy: 0 })
  })
})
