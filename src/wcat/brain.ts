import { CAT_SIZE, GRAVITY, clamp, support } from './physics'
import type { Body, Platform, World } from './physics'
import type { Signals } from './senses'

export type Mode = 'sit' | 'walk' | 'jump' | 'nap' | 'wake' | 'fall' | 'ball' | 'stalk' | 'crouch' | 'pounce' | 'pet' | 'poke'
export interface Brain {
  mode: Mode
  until: number
  facing: 1 | -1
  awakeAt: number
  reactedAt: number
  huntAfter: number
  lookAfter: number
  lookUntil: number
  target: { x: number; y: number }
  wakeTo: 'sit' | 'pet' | 'poke'
}
export interface Pointer { x: number; y: number; movedAt: number; inside: boolean }
export interface Input { now: number; world: World; pointer: Pointer; mobile: boolean; random: () => number; signals?: Signals }

export function createBrain(now: number, random: () => number): Brain {
  return { mode: 'sit', until: now + 2 + random() * 6, facing: 1, awakeAt: now,
    reactedAt: now - 0.001, huntAfter: now, lookAfter: now, lookUntil: 0, target: { x: 0, y: 0 }, wakeTo: 'sit' }
}

// Ordinary glances look at a remembered spot, not a live cursor. Sleeping,
// petting and rolling always use a neutral face, including between RAF ticks.
export function gaze(brain: Brain, body: Body, now: number, reduced = false): { x: number; y: number } {
  if (reduced || body.form === 'ball' || ['nap', 'wake', 'pet', 'poke'].includes(brain.mode) || now >= brain.lookUntil) return { x: 0, y: 0 }
  return { x: clamp((brain.target.x - body.x) / 70, -2, 2), y: clamp((brain.target.y - (body.y - 28)) / 70, -2, 2) }
}

export function think(previous: Brain, current: Body, input: Input): { brain: Brain; body: Body } {
  const { now, world, pointer, mobile, random, signals = {} } = input
  const brain = { ...previous }
  let body = { ...current }
  const sit = () => {
    brain.mode = 'sit'
    brain.until = now + 2 + random() * 6
    body.vx = 0
  }
  const wake = (to: Brain['wakeTo']) => {
    brain.mode = 'wake'
    brain.wakeTo = to
    brain.until = now + 0.65
    brain.awakeAt = now
    brain.lookUntil = 0
    body.vx = 0
  }
  const done = () => ({ brain, body })
  if (body.form === 'ball') { brain.mode = 'ball'; return done() }
  const surface = support(body, world)
  if (!surface) {
    body.ground = null
    if (brain.mode !== 'pounce' && (brain.mode !== 'jump' || body.vy >= 0)) brain.mode = 'fall'
    return done()
  }
  const pokedAt = signals.pokedAt ?? -Infinity
  const pettedAt = signals.pettedAt ?? -Infinity
  const affectionAt = Math.max(pokedAt, pettedAt)
  if (affectionAt > brain.reactedAt && now - affectionAt < 0.3) {
    brain.reactedAt = affectionAt
    brain.awakeAt = now
    // Repeated clicks during a startle do not restart its animation forever.
    const reaction = pokedAt >= pettedAt ? 'poke' : 'pet'
    if (brain.mode === 'nap') wake(reaction)
    else if (brain.mode === 'wake') brain.wakeTo = reaction
    else if (brain.mode !== 'poke' || now >= brain.until) {
      brain.mode = reaction
      brain.until = now + (brain.mode === 'poke' ? 0.65 : 1.4)
    }
    brain.lookUntil = 0
    brain.huntAfter = now + 5
    body.vx = 0
  }
  if (brain.mode === 'wake') {
    if (now >= brain.until) {
      if (brain.wakeTo === 'sit') sit()
      else {
        brain.mode = brain.wakeTo
        brain.until = now + (brain.mode === 'poke' ? 0.65 : 1.4)
      }
    }
    body.vx = 0
    return done()
  }
  if (brain.mode === 'pet' || brain.mode === 'poke') {
    if (now >= brain.until) sit()
    body.vx = 0
    return done()
  }
  if (['jump', 'fall', 'ball', 'pounce'].includes(brain.mode)) { sit(); return done() }

  const distance = Math.hypot(pointer.x - body.x, pointer.y - body.y)
  if (brain.mode === 'nap') {
    if (pointer.inside && distance < 110 && now - pointer.movedAt < 0.15) wake('sit')
    return done()
  }
  if (now - Math.max(pointer.movedAt, brain.awakeAt) >= 45) {
    brain.mode = 'nap'
    brain.lookUntil = 0
    body.vx = 0
    return done()
  }

  // Sleeping is stationary, so phones and reduced-motion visitors can nap
  // too. Their restrictions apply to roaming, gaze and hunting below.
  if (mobile || world.reducedMotion) { if (brain.mode !== 'sit') sit(); body.vx = 0; brain.lookUntil = 0; return done() }

  const toyReachable = pointer.inside && distance <= 240 && Math.abs(pointer.y - body.y) <= 100
    && pointer.x >= surface.left + CAT_SIZE / 2 && pointer.x <= surface.right - CAT_SIZE / 2
  const teasedAt = signals.teasedAt ?? -Infinity
  if (brain.mode !== 'stalk' && brain.mode !== 'crouch' && now >= brain.huntAfter
    && teasedAt > brain.reactedAt && now - teasedAt < 0.4 && toyReachable && distance >= 45) {
    brain.mode = 'stalk'
    brain.until = now + 0.45
    brain.reactedAt = teasedAt
    brain.huntAfter = now + 8 + random() * 5
  }
  if (brain.mode === 'stalk' || brain.mode === 'crouch') {
    if (!toyReachable) { brain.lookUntil = 0; sit(); return done() }
    if (brain.mode === 'stalk') {
      brain.target = { x: clamp(pointer.x, body.x - 160, body.x + 160), y: pointer.y }
      brain.facing = brain.target.x < body.x ? -1 : 1
      body.vx = Math.abs(brain.target.x - body.x) > 65 ? brain.facing * 36 : 0
      if (now >= brain.until) { brain.mode = 'crouch'; brain.until = now + 0.55; body.vx = 0 }
    } else if (now >= brain.until) {
      const x = clamp(brain.target.x, surface.left + CAT_SIZE / 2, surface.right - CAT_SIZE / 2)
      body = jump(body, surface, x)
      brain.mode = 'pounce'
    }
    brain.lookUntil = now + 0.6
    brain.lookAfter = brain.huntAfter
    return done()
  }

  if (now >= brain.lookAfter && pointer.inside && distance < 260 && now - pointer.movedAt < 0.2) {
    brain.lookAfter = now + 4 + random() * 5
    if (random() < 0.7) {
      brain.target = { x: pointer.x, y: pointer.y }
      brain.lookUntil = now + 0.65 + random() * 0.7
    }
  }
  if (brain.mode === 'sit' && now >= brain.until) {
    brain.mode = 'walk'
    brain.until = now + 1 + random() * 3
  }
  if (brain.mode === 'walk' && now >= brain.until) { sit(); return done() }
  if (brain.mode !== 'walk') return done()
  body.vx = brain.facing * 70

  const atEdge = brain.facing === 1 ? body.x >= surface.right - CAT_SIZE / 2 - 4 : body.x <= surface.left + CAT_SIZE / 2 + 4
  const targets = world.platforms.flatMap((p) => {
    if (p.id === surface.id || (surface.id !== 'floor' && Math.abs(body.y - p.y) > 180) || p.right - p.left < CAT_SIZE) return []
    const x = clamp(body.x + brain.facing * 100, p.left + CAT_SIZE / 2, p.right - CAT_SIZE / 2)
    if (Math.abs(x - body.x) > 260 || (x - body.x) * brain.facing < 0) return []
    return [{ platform: p, x }]
  }).sort((a, b) => surface.id === 'floor'
    ? b.platform.y - a.platform.y || Math.abs(a.x - body.x) - Math.abs(b.x - body.x)
    : Math.abs(a.x - body.x) - Math.abs(b.x - body.x))
  if (targets[0] && (atEdge || surface.id === 'floor')) {
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
