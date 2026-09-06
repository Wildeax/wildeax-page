import { expect, it } from 'vitest'
import { phoneTilt, tiltFromAngles } from './phone'
import { carryWithPage } from './world'
import { createBody } from './physics'

it('calibrates to the held angle and ignores small sensor jitter', () => {
  const neutral = { beta: 60, gamma: 10, angle: 0 }
  expect(tiltFromAngles(neutral, neutral)).toEqual({ x: 0, y: 0 })
  expect(tiltFromAngles({ ...neutral, gamma: 12 }, neutral).x).toBe(0)
  expect(tiltFromAngles({ ...neutral, gamma: 25 }, neutral).x).toBeCloseTo(0.48)
  expect(tiltFromAngles({ ...neutral, gamma: 100 }, neutral).x).toBe(1)
})

it('maps all four screen rotations and rejects invalid or changed orientation', () => {
  for (const [angle, x, y] of [[0, 1, 0], [90, 0, -1], [180, -1, 0], [270, 0, 1]]) {
    const value = tiltFromAngles({ beta: 0, gamma: 30, angle }, { beta: 0, gamma: 0, angle })
    expect(value.x).toBeCloseTo(x)
    expect(value.y).toBeCloseTo(y)
  }
  expect(tiltFromAngles({ beta: NaN, gamma: 0, angle: 0 }, { beta: 0, gamma: 0, angle: 0 })).toEqual({ x: 0, y: 0 })
  expect(tiltFromAngles({ beta: 0, gamma: 30, angle: 90 }, { beta: 0, gamma: 0, angle: 0 })).toEqual({ x: 0, y: 0 })
})

it('does not keep pushing a toy after sensor data stops', () => {
  const phone = { current: { tilt: { x: 1, y: 0, at: 5 }, petAt: 0, activeUntil: 0 } }
  expect(phoneTilt(phone, 5.2).x).toBe(1)
  expect(phoneTilt(phone, 6).x).toBe(0)
})

it('carries a resting pet with a scrolled card and releases it when the card leaves view', () => {
  const before = { width: 390, floor: 760, platforms: [{ id: 'card', left: 16, right: 374, y: 400 }] }
  const body = { ...createBody(before), ground: 'card', y: 400 }
  const next = { ...before, platforms: [{ ...before.platforms[0], y: 250 }] }
  expect(carryWithPage(body, before, next)).toMatchObject({ ground: 'card', y: 250, x: body.x })
  expect(carryWithPage(body, before, { ...next, platforms: [] }).ground).toBeNull()
})
