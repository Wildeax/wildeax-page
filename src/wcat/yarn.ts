import { clamp, createBody, releaseBody, step } from './physics'
import type { Body, World } from './physics'

export const STRING_LINK = 7
interface StringPoint { x: number; y: number; px: number; py: number }
export interface YarnState { body: Body; string: StringPoint[]; held: boolean; thrownAt: number; pawedAt: number }
export interface YarnRef { current: YarnState | null }

function makeString(body: Body, world: World): StringPoint[] {
  return Array.from({ length: 14 }, (_, i) => {
    const x = clamp(body.x - 8 - i * STRING_LINK, 2, world.width - 2)
    const y = Math.min(world.floor, body.y - 18 + i * 2)
    return { x, y, px: x, py: y }
  })
}

export function createYarn(world: World, now: number): YarnState {
  const body: Body = { ...createBody(world), x: world.width * 0.6, form: 'ball' }
  return { body, string: makeString(body, world), held: false, thrownAt: now, pawedAt: -Infinity }
}

export function releaseYarn(yarn: YarnState, velocity: { vx: number; vy: number }, now: number, world: World, cancel = false): YarnState {
  return { ...yarn, body: releaseBody(yarn.body, cancel ? { vx: 0, vy: 0 } : velocity, world, false), held: false,
    thrownAt: cancel ? yarn.thrownAt : now }
}

export function batYarn(yarn: YarnState, direction: 1 | -1, now: number): YarnState {
  return { ...yarn, body: { ...yarn.body, vx: direction * 280, vy: -260, ground: null, rest: 0 }, pawedAt: now }
}

export function stepYarn(yarn: YarnState, dt: number, world: World): YarnState {
  if (dt <= 0) return yarn
  const body = yarn.held ? yarn.body : step(yarn.body, dt, world)
  if (world.reducedMotion) return { ...yarn, body, string: makeString(body, world) }
  const points = yarn.string.map((point) => ({ ...point }))
  const count = Math.max(1, Math.ceil(Math.min(dt, 0.25) * 120))
  const h = Math.min(dt, 0.25) / count
  for (let tick = 0; tick < count; tick++) {
    for (let i = 1; i < points.length; i++) {
      const p = points[i]
      const vx = (p.x - p.px) * Math.pow(0.985, h * 60)
      const vy = (p.y - p.py) * Math.pow(0.985, h * 60)
      p.px = p.x; p.py = p.y
      p.x += vx + (world.tilt?.x ?? 0) * 720 * h * h
      p.y += vy + (860 + (world.tilt?.y ?? 0) * 300) * h * h
    }
    for (let pass = 0; pass < 8; pass++) {
      points[0] = { x: body.x - 8, y: body.y - 18, px: body.x - 8, py: body.y - 18 }
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]
        const b = points[i]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.hypot(dx, dy)
        if (!distance) continue
        const correction = (distance - STRING_LINK) / distance
        const weight = i === 1 ? 1 : 0.5
        b.x -= dx * correction * weight; b.y -= dy * correction * weight
        if (i > 1) { a.x += dx * correction * weight; a.y += dy * correction * weight }
      }
      for (const p of points.slice(1)) {
        p.x = clamp(p.x, 2, world.width - 2)
        p.y = clamp(p.y, 2, world.floor)
        for (const wall of world.obstacles ?? []) {
          if (p.x <= wall.left || p.x >= wall.right || p.y <= wall.y || p.y >= wall.bottom) continue
          const distances = [p.x - wall.left, wall.right - p.x, p.y - wall.y, wall.bottom - p.y]
          switch (distances.indexOf(Math.min(...distances))) {
            case 0: p.x = wall.left; break
            case 1: p.x = wall.right; break
            case 2: p.y = wall.y; break
            case 3: p.y = wall.bottom; break
          }
        }
      }
    }
  }
  return { ...yarn, body, string: points }
}

export function stringPath(yarn: YarnState): string {
  return yarn.string.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
}
