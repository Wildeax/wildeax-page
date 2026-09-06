import { describe, expect, it } from 'vitest'
import { createBody, GRAVITY, placeGently, releaseBody, shouldBeDizzy, step, throwVelocity } from './physics'
import type { Body, World } from './physics'

const world: World = { width: 800, floor: 600, platforms: [] }
function advance(body: Body, seconds: number, hz = 60, bounds = world): Body {
  for (let i = 0; i < Math.round(seconds * hz); i++) body = step(body, 1 / hz, bounds)
  return body
}

describe('wcat physics', () => {
  it.each([
    { x: 330, y: 300, vx: 1400, vy: 0, axis: 'vx' as const, sign: -1 },
    { x: 510, y: 300, vx: -1400, vy: 0, axis: 'vx' as const, sign: 1 },
    { x: 410, y: 205, vx: 0, vy: 900, axis: 'vy' as const, sign: -1 },
    { x: 410, y: 540, vx: 0, vy: -1000, axis: 'vy' as const, sign: 1 },
  ])('bounces off a live selection wall: $axis / $sign', (input) => {
    const obstacle = { id: 'selection', left: 360, right: 480, y: 220, bottom: 500 }
    const bounds = { ...world, obstacles: [obstacle], platforms: [obstacle] }
    const next = step({ ...createBody(world), ...input, form: 'ball', ground: null }, 0.025, bounds)
    expect(Math.sign(next[input.axis])).toBe(input.sign)
  })

  it('supports the cat and a resting ball on top, then drops them when selection ends', () => {
    const obstacle = { id: 'selection', left: 200, right: 600, y: 300, bottom: 500 }
    const bounds = { ...world, obstacles: [obstacle], platforms: [obstacle] }
    for (const form of ['cat', 'ball'] as const) {
      const perched = advance({ ...createBody(world), x: 400, y: 298, vy: 20, form, ground: null }, 2, 60, bounds)
      expect(perched.ground).toBe('selection')
      expect(perched.y).toBe(300)
      if (form === 'ball') expect(perched.rest).toBeGreaterThan(0.3)
      const falling = step(perched, 0.1, world)
      expect(falling.ground).toBeNull()
      expect(falling.y).toBeGreaterThan(300)
    }
  })

  it('pushes a cat out safely when a selection grows across it', () => {
    const obstacle = { id: 'selection', left: 300, right: 500, y: 200, bottom: 600 }
    const bounds = { ...world, obstacles: [obstacle], platforms: [obstacle] }
    const next = step({ ...createBody(world), x: 310, form: 'ball' }, 0.016, bounds)
    expect(next.x + 18).toBeLessThanOrEqual(300)
    expect(next.y).toBeLessThanOrEqual(600)
    expect(Number.isFinite(next.vx + next.vy)).toBe(true)
  })

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

describe('gentle placement and rough throws', () => {
  const bounds = { ...world, platforms: [{ id: 'window', left: 100, right: 500, y: 300 }] }
  const held = { ...createBody(bounds), form: 'ball' as const, y: 310, ground: null }

  it('unrolls a gentle release onto a nearby title bar and stays supported', () => {
    const placed = releaseBody(held, { vx: 40, vy: 20 }, bounds)
    expect(placed).toMatchObject({ form: 'cat', ground: 'window', y: 300, vx: 0, vy: 0 })
    expect(step(placed, 0.1, bounds).ground).toBe('window')
    expect(placeGently({ ...held, y: 260 }, { vx: 0, vy: 0 }, bounds)?.y).toBe(300)
  })

  it('does not magnetize fast throws, distant drops, off-edge releases or canceled gestures', () => {
    expect(placeGently(held, { vx: 300, vy: 0 }, bounds)).toBeNull()
    expect(placeGently({ ...held, y: 200 }, { vx: 0, vy: 0 }, bounds)).toBeNull()
    expect(placeGently({ ...held, x: 95 }, { vx: 0, vy: 0 }, bounds)).toBeNull()
    expect(placeGently(held, { vx: 0, vy: 0 }, world)).toBeNull()
    expect(releaseBody(held, { vx: 0, vy: 0 }, bounds, false).form).toBe('ball')
    expect(releaseBody(held, { vx: 300, vy: 0 }, { ...bounds, reducedMotion: true }).form).toBe('ball')
  })

  it('chooses the closest eligible top without depending on DOM order', () => {
    const platforms = [...bounds.platforms, { id: 'closer', left: 100, right: 500, y: 315 }]
    expect(placeGently(held, { vx: 0, vy: 0 }, { ...bounds, platforms })?.ground).toBe('closer')
    expect(placeGently(held, { vx: 0, vy: 0 }, { ...bounds, platforms: [...platforms].reverse() })?.ground).toBe('closer')
  })

  it('gets dizzy only after a hard launch with fast turns and an impact', () => {
    const hard = releaseBody({ ...held, y: 450 }, { vx: 1650, vy: -300 }, world)
    const result = advance(hard, 10)
    expect(result.fastTurns).toBeGreaterThanOrEqual(3)
    expect(result.hardImpacts).toBeGreaterThan(0)
    expect(shouldBeDizzy(result)).toBe(true)
    expect(shouldBeDizzy(result, true)).toBe(false)
    expect(shouldBeDizzy({ ...result, launchSpeed: 700 })).toBe(false)
    expect(shouldBeDizzy({ ...result, fastTurns: 1 })).toBe(false)
    expect(shouldBeDizzy({ ...result, hardImpacts: 0 })).toBe(false)
  })

  it('ordinary tosses and hard vertical drops do not get dizzy or carry over past spin', () => {
    const toss = advance(releaseBody(held, { vx: 700, vy: -100 }, world), 10)
    const vertical = advance(releaseBody(held, { vx: 0, vy: -1700 }, world), 10)
    expect(shouldBeDizzy(toss)).toBe(false)
    expect(shouldBeDizzy(vertical)).toBe(false)
    const fresh = releaseBody({ ...held, fastTurns: 30, hardImpacts: 10, launchSpeed: 1800 }, { vx: 0, vy: 0 }, world)
    expect(fresh).toMatchObject({ fastTurns: 0, hardImpacts: 0, launchSpeed: 0 })
  })
})
