import { describe, expect, it } from 'vitest'
import { createBrain, gaze, think } from './brain'
import type { Input } from './brain'
import { createBody, step } from './physics'
import type { World } from './physics'

const world: World = { width: 800, floor: 600, platforms: [] }
const random = () => 0.5
function input(now: number, patch: Partial<Input> = {}): Input {
  return { now, world, pointer: { x: 0, y: 0, movedAt: 0, inside: false }, mobile: false, random, ...patch }
}

describe('wcat brain', () => {
  it('clears a solid selection wall before crossing onto its top', () => {
    const wall = { id: 'selection', left: 302, right: 650, y: 380, bottom: 600 }
    const bounds = { ...world, obstacles: [wall], platforms: [wall] }
    let body = createBody(bounds)
    let brain = createBrain(0, random)
    let landed = false
    for (let i = 0; i < 540; i++) {
      const now = i / 60
      ;({ body, brain } = think(brain, body, input(now, { world: bounds })))
      body = step(body, 1 / 60, bounds)
      if (body.ground === 'selection') { landed = true; break }
    }
    expect(landed).toBe(true)
    expect(body.x).toBeGreaterThan(wall.left)
    expect(body.y).toBe(wall.y)
  })

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
    expect(wake.brain.mode).toBe('wake')
    expect(gaze(wake.brain, wake.body, 47)).toEqual({ x: 0, y: 0 })
    const wakingInput = { pointer: { x: wake.body.x, y: wake.body.y, inside: true, movedAt: 47 } }
    expect(think(wake.brain, wake.body, input(47.4, wakingInput)).brain.mode).toBe('wake')
    expect(think(wake.brain, wake.body, input(47.7, wakingInput)).brain.mode).toBe('sit')
  })

  it('ignores a parked pointer instead of following it', () => {
    const pointer = { x: 700, y: 500, movedAt: 0.5, inside: true }
    const result = think(createBrain(0, random), createBody(world), input(2.1, { pointer }))
    expect(result.brain.mode).toBe('sit')
    expect(result.body.vx).toBe(0)
    expect(gaze(result.brain, result.body, 2.1)).toEqual({ x: 0, y: 0 })
  })

  it('tracks the live pointer during a brief attention bout, then takes a long break', () => {
    const body = createBody(world)
    const pointer = { x: 400, y: 550, movedAt: 1, inside: true }
    const first = think(createBrain(0, random), body, input(1, { pointer }))
    expect(gaze(first.brain, body, 1).x).toBeGreaterThan(0)
    const moved = think(first.brain, body, input(1.1, { pointer: { ...pointer, x: 180, movedAt: 1.1 } }))
    expect(gaze(moved.brain, body, 1.1).x).toBeLessThan(0)
    const ignored = think(moved.brain, body, input(5, { pointer: { ...pointer, movedAt: 5 } }))
    expect(gaze(ignored.brain, body, 5)).toEqual({ x: 0, y: 0 })
    expect(ignored.body.vx).toBe(0)
    expect(ignored.brain.lookAfter).toBeGreaterThan(10)
  })

  it('does not flicker between sleeping and awake under a nearby parked pointer', () => {
    const pointer = { x: 280, y: 590, movedAt: 0, inside: true }
    const first = think(createBrain(0, random), createBody(world), input(46, { pointer }))
    const next = think(first.brain, first.body, input(46.016, { pointer }))
    expect(first.brain.mode).toBe('nap')
    expect(next.brain.mode).toBe('nap')
  })

  it('rests after unrolling instead of immediately following the throw pointer', () => {
    const pointer = { x: 700, y: 450, movedAt: 1, inside: true }
    const brain = createBrain(8, random)
    const result = think(brain, createBody(world), input(8.1, { pointer }))
    expect(result.brain.mode).toBe('sit')
    expect(result.body.vx).toBe(0)
    const next = think(result.brain, result.body, input(10, { pointer: { ...pointer, movedAt: 8.2 }, signals: { teasedAt: 7 } }))
    expect(next.brain.mode).toBe('sit')
  })

  it('jumps to a reachable window and lands on its top', () => {
    const bounds = { ...world, platforms: [{ id: 'window', left: 340, right: 550, y: 450 }] }
    const pointer = { x: 420, y: 460, movedAt: 0, inside: true }
    const jump = think(createBrain(0, random), createBody(bounds), input(5.1, { world: bounds, pointer }))
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

  it.each(['mobile', 'reduced'])('stays still and can nap with %s motion restrictions', (kind) => {
    const args = input(60, { mobile: kind === 'mobile', world: { ...world, reducedMotion: kind === 'reduced' } })
    const result = think(createBrain(0, random), createBody(world), args)
    expect(think(createBrain(0, random), createBody(world), { ...args, now: 10 }).brain.mode).toBe('sit')
    expect(result.brain.mode).toBe('nap')
    expect(result.body.vx).toBe(0)
  })

  it('stalks a teased cursor, crouches, then pounces once and cools down', () => {
    const pointer = { x: 390, y: 580, movedAt: 1, inside: true }
    const args = { pointer, signals: { teasedAt: 1 } }
    const stalk = think(createBrain(0, random), createBody(world), input(1, args))
    expect(stalk.brain.mode).toBe('stalk')
    expect(stalk.body.vx).toBe(36)
    const crouch = think(stalk.brain, stalk.body, input(1.5, args))
    expect(crouch.brain.mode).toBe('crouch')
    expect(crouch.body.vx).toBe(0)
    const pounce = think(crouch.brain, crouch.body, input(2.1, args))
    expect(pounce.brain.mode).toBe('pounce')
    expect(pounce.body.vy).toBeLessThan(0)
    let body = pounce.body
    for (let i = 0; i < 120 && !body.ground; i++) body = step(body, 1 / 120, world)
    expect(body.ground).toBe('floor')
    expect(body.x).toBeCloseTo(390, -1)
    const landed = think(pounce.brain, body, input(2.7, args))
    const again = think(landed.brain, landed.body, input(3, { pointer: { ...pointer, x: 500 }, signals: { teasedAt: 3 } }))
    expect(again.brain.mode).toBe('sit')
  })

  it('gives up the hunt if the toy leaves and will not pounce off a window', () => {
    const pointer = { x: 390, y: 580, movedAt: 1, inside: true }
    const stalk = think(createBrain(0, random), createBody(world), input(1, { pointer, signals: { teasedAt: 1 } }))
    expect(think(stalk.brain, stalk.body, input(1.2, { pointer: { ...pointer, inside: false } })).brain.mode).toBe('sit')
    const bounds = { ...world, platforms: [{ id: 'window', left: 200, right: 340, y: 300 }] }
    const body = { ...createBody(bounds), y: 300, ground: 'window' }
    const result = think(createBrain(0, random), body, input(1, { world: bounds, pointer: { ...pointer, y: 290 }, signals: { teasedAt: 1 } }))
    expect(result.brain.mode).toBe('sit')
    expect(result.body.ground).toBe('window')
  })

  it.each(['mobile', 'reduced'])('allows affection but not hunting with %s restrictions', (kind) => {
    const args = { mobile: kind === 'mobile', world: { ...world, reducedMotion: kind === 'reduced' }, pointer: { x: 390, y: 580, movedAt: 1, inside: true } }
    const first = think(createBrain(0, random), createBody(world), input(1, { ...args, signals: { teasedAt: 1 } }))
    expect(first.brain.mode).toBe('sit')
    const pet = think(first.brain, first.body, input(2, { ...args, signals: { pettedAt: 2 } }))
    expect(pet.brain.mode).toBe('pet')
    expect(pet.body.vx).toBe(0)
    expect(gaze(pet.brain, pet.body, 2)).toEqual({ x: 0, y: 0 })
  })

  it('wakes to a poke or pet and does not immediately go back to sleep', () => {
    const sleeping = think(createBrain(0, random), createBody(world), input(46))
    for (const signals of [{ pokedAt: 47 }, { pettedAt: 47 }]) {
      const awake = think(sleeping.brain, sleeping.body, input(47, { signals }))
      expect(awake.brain.mode).toBe('wake')
      const reaction = think(awake.brain, awake.body, input(47.7, { signals }))
      expect(['poke', 'pet']).toContain(reaction.brain.mode)
      const resting = think(reaction.brain, reaction.body, input(50, { signals }))
      expect(resting.brain.mode).toBe('sit')
      expect(think(resting.brain, resting.body, input(50.1, { signals })).brain.mode).toBe('sit')
    }
  })

  it('does not prolong waking forever when head strokes continue', () => {
    const sleeping = think(createBrain(0, random), createBody(world), input(46))
    const waking = think(sleeping.brain, sleeping.body, input(47, { signals: { pettedAt: 47 } }))
    const more = think(waking.brain, waking.body, input(47.4, { signals: { pettedAt: 47.4 } }))
    expect(more.brain.mode).toBe('wake')
    expect(more.brain.until).toBe(waking.brain.until)
    expect(think(more.brain, more.body, input(47.7, { signals: { pettedAt: 47.7 } })).brain.mode).toBe('pet')
  })

  it('sometimes checks below a ledge once before stepping off', () => {
    const bounds = { ...world, platforms: [{ id: 'window', left: 100, right: 300, y: 250 }] }
    const brain = { ...createBrain(0, random), mode: 'walk' as const, until: 10 }
    const body = { ...createBody(bounds), x: 280, y: 250, ground: 'window' }
    const peek = think(brain, body, input(1, { world: bounds, random: () => 0.2 }))
    expect(peek.brain.mode).toBe('peek')
    expect(peek.body.vx).toBe(0)
    expect(gaze(peek.brain, peek.body, 1).y).toBeGreaterThan(0)
    const decisions: number[] = []
    const next = think(peek.brain, peek.body, input(3, { world: bounds, random: () => { decisions.push(1); return 0.2 } }))
    expect(next.brain.mode).toBe('walk')
    expect(next.body.vx).toBe(70)
    expect(decisions).toHaveLength(0)
    const ordinary = think(brain, body, input(1, { world: bounds, random: () => 0.4 }))
    expect(ordinary.brain.mode).toBe('walk')
  })
})
