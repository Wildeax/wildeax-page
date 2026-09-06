import { describe, expect, it } from 'vitest'
import { createBrain, think } from './brain'
import type { Input } from './brain'
import { createBody, step } from './physics'
import type { World } from './physics'

const world: World = { width: 800, floor: 600, platforms: [] }
const random = () => 0.5
function input(now: number, patch: Partial<Input> = {}): Input {
  return { now, world, pointer: { x: 0, y: 0, movedAt: 0, inside: false }, mobile: false, random, ...patch }
}

describe('wcat brain', () => {
  it('sits until its injected timer expires, then walks', () => {
    const brain = createBrain(0, random)
    expect(think(brain, createBody(world), input(4)).brain.mode).toBe('sit')
    const walking = think(brain, createBody(world), input(5.1))
    expect(walking.brain.mode).toBe('walk')
    expect(Math.abs(walking.body.vx)).toBe(70)
  })

  it('falls when its support disappears, then sits after landing', () => {
    const falling = think(createBrain(0, random), { ...createBody(world), y: 300, ground: 'gone' }, input(1))
    expect(falling.brain.mode).toBe('fall')
    let body = falling.body
    for (let i = 0; i < 120; i++) body = step(body, 1 / 60, world)
    expect(think(falling.brain, body, input(3)).brain.mode).toBe('sit')
  })

  it('naps after 45 seconds of pointer inactivity and wakes near a pointer', () => {
    const nap = think(createBrain(0, random), createBody(world), input(46))
    expect(nap.brain.mode).toBe('nap')
    const wake = think(nap.brain, nap.body, input(47, { pointer: { x: nap.body.x, y: nap.body.y, inside: true, movedAt: 47 } }))
    expect(wake.brain.mode).toBe('sit')
  })

  it('follows a parked pointer, gives up after six seconds, and does not immediately restart', () => {
    const pointer = { x: 700, y: 500, movedAt: 0.5, inside: true }
    const following = think(createBrain(0, random), createBody(world), input(2.1, { pointer }))
    expect(following.brain.mode).toBe('follow')
    expect(following.body.vx).toBe(70)
    const stopped = think(following.brain, following.body, input(8.2, { pointer }))
    expect(stopped.brain.mode).toBe('sit')
    expect(think(stopped.brain, stopped.body, input(8.3, { pointer })).brain.mode).toBe('sit')
  })

  it('stops following when the pointer moves', () => {
    const pointer = { x: 700, y: 500, movedAt: 0.5, inside: true }
    const following = think(createBrain(0, random), createBody(world), input(2.1, { pointer }))
    expect(think(following.brain, following.body, input(2.2, { pointer: { ...pointer, movedAt: 2.2 } })).brain.mode).toBe('sit')
  })

  it('does not flicker between sleeping and awake under a nearby parked pointer', () => {
    const pointer = { x: 280, y: 590, movedAt: 0, inside: true }
    const first = think(createBrain(0, random), createBody(world), input(46, { pointer }))
    const next = think(first.brain, first.body, input(46.016, { pointer }))
    expect(first.brain.mode).toBe('sit')
    expect(next.brain.mode).toBe('sit')
  })

  it('jumps to a reachable window and lands on its top', () => {
    const bounds = { ...world, platforms: [{ id: 'window', left: 340, right: 550, y: 450 }] }
    const pointer = { x: 420, y: 460, movedAt: 0, inside: true }
    const jump = think(createBrain(0, random), createBody(bounds), input(2, { world: bounds, pointer }))
    expect(jump.brain.mode).toBe('jump')
    expect(jump.body.vy).toBeLessThan(0)
    let body = jump.body
    for (let i = 0; i < 120 && !body.ground; i++) body = step(body, 1 / 120, bounds)
    expect(body.ground).toBe('window')
    expect(body.y).toBe(450)
  })

  it('walks off an isolated platform instead of floating at its edge', () => {
    const bounds = { ...world, platforms: [{ id: 'window', left: 100, right: 300, y: 250 }] }
    const brain = { ...createBrain(0, random), mode: 'walk' as const, until: 10 }
    let result = think(brain, { ...createBody(bounds), x: 277, y: 250, ground: 'window' }, input(1, { world: bounds }))
    for (let i = 0; i < 30; i++) result = think(result.brain, step(result.body, 1 / 60, bounds), input(1 + i / 60, { world: bounds }))
    expect(result.body.y).toBeGreaterThan(250)
    expect(result.body.ground).toBeNull()
    expect(result.brain.mode).toBe('fall')
  })

  it('can reach ordinary window tops from the floor', () => {
    const bounds = { ...world, platforms: [{ id: 'window', left: 300, right: 650, y: 200 }] }
    const result = think(createBrain(0, random), createBody(bounds), input(5.1, { world: bounds }))
    expect(result.brain.mode).toBe('jump')
    let body = result.body
    for (let i = 0; i < 240 && !body.ground; i++) body = step(body, 1 / 120, bounds)
    expect(body.ground).toBe('window')
  })

  it.each(['mobile', 'reduced'])('stays seated with %s motion restrictions', (kind) => {
    const args = input(60, { mobile: kind === 'mobile', world: { ...world, reducedMotion: kind === 'reduced' } })
    const result = think(createBrain(0, random), createBody(world), args)
    expect(result.brain.mode).toBe('sit')
    expect(result.body.vx).toBe(0)
  })
})
