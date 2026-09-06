import { describe, expect, it } from 'vitest'
import { easeTail, tailPath, tailPose } from './tail'

describe('wcat vector tail', () => {
  it('attaches at the back and keeps a fixed base without curling under the feet', () => {
    for (const mode of ['sit', 'walk', 'follow', 'stalk', 'crouch', 'pet', 'poke', 'nap', 'wake', 'fall', 'jump', 'pounce', 'dizzy', 'peek', 'inspect', 'enter']) {
      const start = tailPose(mode, 0)
      for (let t = 0; t <= 20; t += 0.1) {
        const pose = tailPose(mode, t)
        expect(tailPath(pose)).toMatch(/^M40 30 C30\.00 30\.00 /)
        expect(pose.slice(0, 4)).toEqual(start.slice(0, 4))
        // Convex-hull bound: neither cubic can cross below this local height.
        // Including the 3px stroke, it stays above the cat's 44px feet.
        for (let i = 1; i < pose.length; i += 2) expect(pose[i]).toBeLessThanOrEqual(37)
        expect(2 * pose[5] - pose[3]).toBeLessThanOrEqual(37)
      }
    }
  })

  it('bends its curve over time instead of rotating a rigid tail', () => {
    const first = tailPath(tailPose('sit', 0))
    expect(first).toContain('C')
    expect(first).toContain('S')
    expect(tailPath(tailPose('sit', 1))).not.toBe(first)
  })

  it('has distinct poses for affection, hunting, sleep and rough landings', () => {
    const paths = ['sit', 'walk', 'stalk', 'pet', 'nap', 'dizzy', 'peek'].map((mode) => tailPath(tailPose(mode, 0)))
    expect(new Set(paths).size).toBe(paths.length)
    for (const path of paths) expect(path).not.toMatch(/NaN|Infinity/)
  })

  it('holds still while sleeping or with reduced motion', () => {
    expect(tailPose('nap', 20)).toEqual(tailPose('nap', 0))
    expect(tailPose('sit', 20, true)).toEqual(tailPose('sit', 0, true))
  })

  it('eases between shapes independently of frame rate', () => {
    const start = tailPose('sit', 0)
    const target = tailPose('pet', 0)
    let slow = start
    let fast = start
    for (let i = 0; i < 30; i++) slow = easeTail(slow, target, 1 / 30)
    for (let i = 0; i < 120; i++) fast = easeTail(fast, target, 1 / 120)
    fast.forEach((value, i) => expect(value).toBeCloseTo(slow[i], 5))
    expect(easeTail(start, target, 0)).toEqual(start)
    expect(easeTail(start, target, 1 / 60)).not.toEqual(target)
  })
})
