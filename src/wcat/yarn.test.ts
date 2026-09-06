import { describe, expect, it } from 'vitest'
import { batYarn, createYarn, releaseYarn, stepYarn, STRING_LINK } from './yarn'
import { createBody, step } from './physics'
import { createPlay, playWithYarn } from './toy-brain'

const world = { width: 800, floor: 600, platforms: [] }
const random = () => 0.5

describe('private yarn physics', () => {
  it('does not advance string momentum during a zero-duration frame', () => {
    const toy = createYarn(world, 0)
    toy.string[4].px -= 20
    expect(stepYarn(toy, 0, world)).toEqual(toy)
  })

  it('throws, bounces and settles without turning into a cat', () => {
    let yarn = createYarn(world, 0)
    yarn.body.y = 350
    yarn = releaseYarn(yarn, { vx: 1100, vy: -300 }, 1, world)
    let bounced = false
    for (let i = 0; i < 1200; i++) {
      yarn = stepYarn(yarn, 1 / 60, world)
      if (yarn.body.vx < 0) bounced = true
    }
    expect(bounced).toBe(true)
    expect(yarn.body.form).toBe('ball')
    expect(yarn.body.ground).toBe('floor')
    expect(Math.abs(yarn.body.vx)).toBeLessThan(1)
    expect(yarn.thrownAt).toBe(1)
  })

  it('keeps a pinned, bounded string whose segments recover their length', () => {
    let yarn = createYarn(world, 0)
    yarn.body = { ...yarn.body, x: 700, y: 150, ground: null }
    for (let i = 0; i < 600; i++) yarn = stepYarn(yarn, 1 / 60, world)
    expect(yarn.string[0].x).toBe(yarn.body.x - 8)
    expect(yarn.string[0].y).toBe(yarn.body.y - 18)
    for (let i = 1; i < yarn.string.length; i++) {
      const p = yarn.string[i]
      const previous = yarn.string[i - 1]
      expect(Number.isFinite(p.x + p.y)).toBe(true)
      expect(p.y).toBeLessThanOrEqual(world.floor)
      expect(Math.hypot(p.x - previous.x, p.y - previous.y)).toBeLessThan(STRING_LINK + 1)
    }
  })

  it('bats the yarn without restarting the human throw timer', () => {
    const yarn = createYarn(world, 1)
    const batted = batYarn(yarn, -1, 3)
    expect(batted.body.vx).toBeLessThan(0)
    expect(batted.body.vy).toBeLessThan(0)
    expect(batted.thrownAt).toBe(1)
    expect(batted.pawedAt).toBe(3)
    expect(yarn.body.vx).toBe(0)
  })

  it('keeps reduced motion still and cancels a release without tempting a hunt', () => {
    const yarn = createYarn(world, 1)
    const reduced = { ...world, reducedMotion: true }
    const thrown = releaseYarn(yarn, { vx: 1400, vy: -500 }, 2, reduced, true)
    expect(thrown.body.vx).toBe(0)
    expect(thrown.thrownAt).toBe(1)
    const first = stepYarn(thrown, 1 / 60, reduced)
    expect(stepYarn(first, 1, reduced).string).toEqual(first.string)
  })
})

describe('cat interest in the yarn', () => {
  it.each([
    { id: 'window', left: 180, right: 600, y: 280 },
    { id: 'full-width-card', left: 16, right: 784, y: 280 },
  ])('descends from $id to pursue a toy on the floor', (platform) => {
    const scene = { ...world, platforms: [platform] }
    let body = { ...createBody(scene), x: 400, y: platform.y, ground: platform.id as string | null }
    let play = createPlay()
    const toy = createYarn(scene, 0)
    toy.body.x = 450
    let lowest = body.y
    for (let frame = 0; frame < 180; frame++) {
      const now = frame / 60
      // A moving toy keeps inviting pursuit, without changing its height.
      const result = playWithYarn(play, body, { ...toy, body: { ...toy.body, vx: 30 } }, scene, now, false, random)
      play = result.play
      body = step(result.body, 1 / 60, scene)
      lowest = Math.max(lowest, body.y)
    }
    expect(lowest).toBeGreaterThan(560)
  })

  it('loses interest in stationary yarn early and does not restart on its own', () => {
    const toy = createYarn(world, 0)
    const body = createBody(world)
    const first = playWithYarn(createPlay(), body, toy, world, 0, false, random)
    const quiet = playWithYarn(first.play, body, toy, world, 3, false, random)
    expect(quiet.ended).toBe(true)
    expect(quiet.mode).toBeNull()
    expect(playWithYarn(quiet.play, body, toy, world, 30, false, random).mode).toBeNull()
    expect(playWithYarn(quiet.play, body, { ...toy, thrownAt: 30, body: { ...toy.body, vx: 200 } }, world, 30, false, random).mode).not.toBeNull()
  })

  it('chases a fresh throw, then loses interest on time despite more throws', () => {
    const body = createBody(world)
    const toy = createYarn(world, 1)
    toy.body.vx = 120
    const first = playWithYarn(createPlay(), body, toy, world, 1, false, random)
    expect(first.mode).toBe('follow')
    expect(first.body.vx).toBeGreaterThan(0)
    const second = playWithYarn(first.play, body, { ...toy, thrownAt: 4 }, world, 4, false, random)
    expect(second.play.until).toBe(first.play.until)
    const bored = playWithYarn(second.play, body, { ...toy, thrownAt: 12 }, world, 12, false, random)
    expect(bored.ended).toBe(true)
    expect(bored.mode).toBeNull()
    expect(bored.body.vx).toBe(0)
    expect(playWithYarn(bored.play, body, { ...toy, thrownAt: 13 }, world, 13, false, random).mode).toBeNull()
    expect(playWithYarn(bored.play, body, { ...toy, thrownAt: 30 }, world, 30, false, random).mode).not.toBeNull()
  })

  it('crouches, pounces at the toy and bats it on contact', () => {
    const body = { ...createBody(world), x: 390 }
    const toy = createYarn(world, 1)
    const crouch = playWithYarn(createPlay(), body, toy, world, 1, false, random)
    expect(crouch.mode).toBe('crouch')
    const pounce = playWithYarn(crouch.play, body, toy, world, 1.4, false, random)
    expect(pounce.mode).toBe('pounce')
    expect(pounce.body.vy).toBeLessThan(0)
    const touch = playWithYarn(pounce.play, { ...pounce.body, x: toy.body.x, y: toy.body.y }, toy, world, 1.6, false, random)
    expect(touch.swat).not.toBe(0)
  })

  it('lets direct interaction win, cancels removal and waits while the toy is held', () => {
    const body = createBody(world)
    const toy = createYarn(world, 1)
    expect(playWithYarn(createPlay(), body, toy, world, 1, true, random).mode).toBeNull()
    const active = playWithYarn(createPlay(), body, toy, world, 1, false, random)
    expect(playWithYarn(active.play, body, null, world, 2, false, random).ended).toBe(true)
    const held = playWithYarn(active.play, body, { ...toy, held: true }, world, 2, false, random)
    expect(held.play.until).toBe(active.play.until)
    expect(held.body.vx).toBe(0)
    expect(held.ended).toBe(false)
    expect(playWithYarn(createPlay(), body, { ...toy, thrownAt: -10 }, world, 1, false, random).mode).toBeNull()
  })
})
