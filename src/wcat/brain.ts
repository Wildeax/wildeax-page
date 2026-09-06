import { CAT_SIZE, GRAVITY, clamp, support } from './physics'
import type { Body, Platform, World } from './physics'

export type Mode = 'sit' | 'walk' | 'jump' | 'follow' | 'nap' | 'fall' | 'ball'
export interface Brain {
  mode: Mode
  until: number
  facing: 1 | -1
  followedAt: number
  followUntil: number
}
export interface Pointer { x: number; y: number; movedAt: number; inside: boolean }
export interface Input { now: number; world: World; pointer: Pointer; mobile: boolean; random: () => number }

export function createBrain(now: number, random: () => number): Brain {
  return { mode: 'sit', until: now + 2 + random() * 6, facing: 1, followedAt: -1, followUntil: 0 }
}

export function think(previous: Brain, current: Body, input: Input): { brain: Brain; body: Body } {
  const { now, world, pointer, mobile, random } = input
  const brain = { ...previous }
  let body = { ...current }
  const sit = () => {
    brain.mode = 'sit'
    brain.until = now + 2 + random() * 6
    body.vx = 0
  }
  const done = () => ({ brain, body })
  if (body.form === 'ball') { brain.mode = 'ball'; return done() }
  const surface = support(body, world)
  if (!surface) {
    body.ground = null
    if (brain.mode !== 'jump' || body.vy >= 0) brain.mode = 'fall'
    return done()
  }
  if (mobile || world.reducedMotion) { if (brain.mode !== 'sit') sit(); body.vx = 0; return done() }
  if (['jump', 'fall', 'ball'].includes(brain.mode)) { sit(); return done() }

  const distance = Math.hypot(pointer.x - body.x, pointer.y - body.y)
  if (brain.mode === 'nap') {
    if (pointer.inside && distance < 150) sit()
    return done()
  }
  if (now - pointer.movedAt >= 45) {
    // A parked pointer near the cat should not alternate nap/wake every frame.
    brain.mode = pointer.inside && distance < 150 ? 'sit' : 'nap'
    body.vx = 0
    return done()
  }

  if (brain.mode === 'follow') {
    if (!pointer.inside || pointer.movedAt !== brain.followedAt || now >= brain.followUntil || Math.abs(pointer.x - body.x) < 40) {
      sit()
      return done()
    }
  } else if (pointer.inside && now - pointer.movedAt >= 1.5 && pointer.movedAt !== brain.followedAt && distance > 120) {
    brain.mode = 'follow'
    brain.followedAt = pointer.movedAt
    brain.followUntil = now + 6
  }

  if (brain.mode === 'sit' && now >= brain.until) {
    brain.mode = 'walk'
    brain.until = now + 1 + random() * 3
  }
  if (brain.mode === 'walk' && now >= brain.until) { sit(); return done() }
  if (brain.mode !== 'walk' && brain.mode !== 'follow') return done()
  if (brain.mode === 'follow') brain.facing = pointer.x < body.x ? -1 : 1
  body.vx = brain.facing * 70

  const atEdge = brain.facing === 1 ? body.x >= surface.right - CAT_SIZE / 2 - 4 : body.x <= surface.left + CAT_SIZE / 2 + 4
  const targets = world.platforms.flatMap((p) => {
    if (p.id === surface.id || (surface.id !== 'floor' && Math.abs(body.y - p.y) > 180) || p.right - p.left < CAT_SIZE) return []
    const x = clamp(brain.mode === 'follow' ? pointer.x : body.x + brain.facing * 100, p.left + CAT_SIZE / 2, p.right - CAT_SIZE / 2)
    if (Math.abs(x - body.x) > 260 || (x - body.x) * brain.facing < 0) return []
    if (brain.mode === 'follow' && (pointer.x < p.left || pointer.x > p.right || Math.abs(pointer.y - p.y) > 180)) return []
    return [{ platform: p, x }]
  }).sort((a, b) => surface.id === 'floor' && brain.mode !== 'follow'
    ? b.platform.y - a.platform.y || Math.abs(a.x - body.x) - Math.abs(b.x - body.x)
    : Math.abs(a.x - body.x) - Math.abs(b.x - body.x))
  if (targets[0] && (atEdge || brain.mode === 'follow' || surface.id === 'floor')) {
    body = jump(body, targets[0].platform, targets[0].x)
    brain.mode = 'jump'
  } else if (atEdge) {
    if (surface.id === 'floor') {
      brain.facing = brain.facing === 1 ? -1 : 1
      body.vx = brain.facing * 70
    }
    // With no target, keep walking until the center clears the title bar.
    // Physics then removes support without a sideways teleport.
  }
  return done()
}

function jump(body: Body, platform: Platform, x: number): Body {
  const rise = Math.max(0, body.y - platform.y) + Math.min(48, Math.max(0, platform.y - CAT_SIZE))
  const vy = -Math.sqrt(2 * GRAVITY * rise)
  const time = (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * (platform.y - body.y))) / GRAVITY
  return { ...body, vx: (x - body.x) / time, vy, ground: null }
}
