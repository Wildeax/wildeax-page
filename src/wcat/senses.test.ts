import { describe, expect, it } from 'vitest'
import { createMotion, observe } from './senses'
import { createBody } from './physics'

const body = createBody({ width: 800, floor: 600, platforms: [] })
const sample = (x: number, y: number, at: number) => ({ x, y, at })

describe('wcat senses', () => {
  it('notices two nearby toy-like direction reversals', () => {
    let motion = createMotion()
    for (const [i, x] of [360, 390, 360, 390].entries()) motion = observe(motion, sample(x, 580, i * 0.12), body)
    expect(motion.teasedAt).toBeCloseTo(0.36)
    expect(motion.pettedAt).toBe(-Infinity)
  })

  it('ignores ordinary passing, distant wiggles, and old movement', () => {
    for (const points of [
      [360, 380, 400, 420].map((x, i) => sample(x, 580, i * 0.12)),
      [650, 680, 650, 680].map((x, i) => sample(x, 300, i * 0.12)),
      [360, 390, 360, 390].map((x, i) => sample(x, 580, i * 0.8)),
    ]) {
      const motion = points.reduce((state, point) => observe(state, point, body), createMotion())
      expect(motion.teasedAt).toBe(-Infinity)
      expect(motion.pettedAt).toBe(-Infinity)
    }
  })

  it('recognizes sustained back-and-forth head strokes without treating them as prey', () => {
    let motion = createMotion()
    for (const [i, x] of [266, 276, 286, 296, 286, 276, 266, 276, 286, 296].entries()) motion = observe(motion, sample(x, 570, i * 0.1), body)
    expect(motion.pettedAt).toBeCloseTo(0.9)
    expect(motion.teasedAt).toBe(-Infinity)
  })

  it('does not pet on a single slow pass, stationary hover, fast pass, or stroke below the head', () => {
    for (const points of [
      [266, 276, 286, 296].map((x, i) => sample(x, 570, i * 0.15)),
      [270, 270, 270, 270].map((x, i) => sample(x, 570, i * 0.1)),
      [266, 276, 286, 296].map((x, i) => sample(x, 570, i * 0.005)),
      [266, 276, 286, 296].map((x, i) => sample(x, 596, i * 0.1)),
    ]) {
      const motion = points.reduce((state, point) => observe(state, point, body), createMotion())
      expect(motion.pettedAt).toBe(-Infinity)
    }
  })

  it('recognizes deliberate strokes from a high-polling-rate mouse', () => {
    let motion = createMotion()
    for (let i = 0; i <= 900; i++) {
      const phase = i / 300
      const x = phase < 1 ? 266 + phase * 30 : phase < 2 ? 296 - (phase - 1) * 30 : 266 + (phase - 2) * 30
      motion = observe(motion, sample(x, 570, i / 1000), body)
    }
    expect(motion.pettedAt).toBeGreaterThan(0.7)
  })

  it('bounds its history even with high-frequency pointer events', () => {
    let motion = createMotion()
    for (let i = 0; i < 1000; i++) motion = observe(motion, sample(360 + i % 20, 580, i / 1000), body)
    expect(motion.points.length).toBeLessThanOrEqual(80)
  })
})
