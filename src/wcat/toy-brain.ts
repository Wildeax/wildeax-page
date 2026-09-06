import { CAT_SIZE, GRAVITY, clamp, support } from './physics'
import type { Body, World } from './physics'
import type { YarnState } from './yarn'

interface ToyPlay {
  phase: 'rest' | 'chase' | 'crouch' | 'pounce'
  until: number
  nextAt: number
  throwAt: number
  pounceAt: number
  movingAt: number
}
export interface PlayResult {
  play: ToyPlay
  body: Body
  mode: 'follow' | 'crouch' | 'pounce' | null
  target: { x: number; y: number }
  facing: 1 | -1
  swat: -1 | 0 | 1
  ended: boolean
}

export function createPlay(): ToyPlay { return { phase: 'rest', until: 0, nextAt: 0, throwAt: -Infinity, pounceAt: 0, movingAt: 0 } }

export function playWithYarn(previous: ToyPlay, current: Body, yarn: YarnState | null, world: World, now: number, blocked: boolean, random: () => number): PlayResult {
  const play = { ...previous }
  let body = { ...current }
  const target = { x: yarn?.body.x ?? body.x, y: yarn?.body.y ?? body.y }
  const facing = target.x >= body.x ? 1 : -1
  const result = (mode: PlayResult['mode'] = null, swat: PlayResult['swat'] = 0, ended = false): PlayResult => ({ play, body, mode, target, facing, swat, ended })
  const active = play.phase !== 'rest'
  if (yarn && (yarn.held || Math.hypot(yarn.body.vx, yarn.body.vy) > 25)) play.movingAt = now
  if (active && yarn?.held && !blocked && now < play.until) {
    if (body.ground) body.vx = 0
    return result('follow')
  }
  const unavailable = blocked || !yarn || yarn.held || world.reducedMotion || body.form !== 'cat'
  if (active && (unavailable || now >= play.until || now - play.movingAt > 2.25)) {
    play.phase = 'rest'
    play.nextAt = now + 10 + random() * 8
    if (body.ground) body.vx = 0
    return result(null, 0, true)
  }
  if (unavailable || !yarn) return result()
  if (!active) {
    if (now < play.nextAt || now - yarn.thrownAt > 2 || yarn.thrownAt <= play.throwAt || Math.hypot(target.x - body.x, target.y - body.y) > 900) return result()
    play.phase = 'chase'
    play.until = now + 7 + random() * 6
    play.throwAt = yarn.thrownAt
    play.pounceAt = now
    play.movingAt = now
  }
  const swat = Math.hypot(target.x - body.x, target.y - body.y) < 42 && now - yarn.pawedAt >= 0.8 ? facing : 0
  const surface = support(body, world)
  if (!surface) return result('pounce', swat)
  // A lower toy needs a route OFF this perch. A ballistic hop aimed beneath
  // the same one-way top simply lands back on it, over and over.
  if (surface.id !== 'floor' && target.y > body.y + CAT_SIZE * 1.5) {
    const exits = [surface.left - CAT_SIZE / 2, surface.right + CAT_SIZE / 2]
      .filter((x) => x >= CAT_SIZE / 2 && x <= world.width - CAT_SIZE / 2)
      .sort((a, b) => Math.abs(a - body.x) + Math.abs(a - target.x) * 0.4 - Math.abs(b - body.x) - Math.abs(b - target.x) * 0.4)
    if (exits.length) {
      play.phase = 'chase'
      body.vx = Math.sign(exits[0] - body.x) * 145
      return { ...result('follow', swat), facing: body.vx < 0 ? -1 : 1 }
    }
    // Phone headings can span every reachable x. Crouch and deliberately
    // drop through that one-way top, moving the feet just beyond its plane.
    // Solid selection walls never use this drop-through route.
    if (!world.obstacles?.some((wall) => wall.id === surface.id)) {
      body.vx = 0
      if (play.phase !== 'crouch') { play.phase = 'crouch'; play.pounceAt = now + 0.28 }
      if (now < play.pounceAt) return result('crouch')
      const fallTime = Math.sqrt(2 * (target.y - body.y) / GRAVITY)
      body = { ...body, y: surface.y + 1, ground: null, vy: 80, vx: clamp((target.x - body.x) / fallTime, -220, 220) }
      play.phase = 'pounce'
      return result('pounce')
    }
  }
  if (play.phase === 'pounce') { play.phase = 'chase'; play.pounceAt = now + 0.7 }
  if (play.phase === 'crouch') {
    body.vx = 0
    if (now < play.pounceAt) return result('crouch', swat)
    const x = clamp(target.x + yarn.body.vx * 0.12, CAT_SIZE / 2, world.width - CAT_SIZE / 2)
    const y = clamp(target.y, CAT_SIZE, world.floor)
    const rise = Math.max(0, body.y - y) + Math.min(48, Math.max(0, y - CAT_SIZE))
    const vy = -Math.sqrt(2 * GRAVITY * rise)
    const time = Math.max(0.15, (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * (y - body.y))) / GRAVITY)
    body = { ...body, vx: clamp((x - body.x) / time, -340, 340), vy, ground: null }
    play.phase = 'pounce'
    return result('pounce', swat)
  }
  const atEdge = facing === 1 ? body.x >= surface.right - CAT_SIZE / 2 - 4 : body.x <= surface.left + CAT_SIZE / 2 + 4
  if (now >= play.pounceAt && (Math.abs(target.x - body.x) < 140 || atEdge)) {
    play.phase = 'crouch'
    play.pounceAt = now + 0.28
    body.vx = 0
    return result('crouch', swat)
  }
  body.vx = Math.abs(target.x - body.x) > 32 ? facing * Math.min(175, Math.abs(target.x - body.x) + 40) : 0
  return result('follow', swat)
}
