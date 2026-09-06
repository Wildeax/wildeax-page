export const CAT_SIZE = 44
export const BALL_SIZE = 36
export const GRAVITY = 2200
export const REST_SECONDS = 0.3
const REST_SPEED = 40
const BOUNCE = 0.72

export interface Platform { id: string; left: number; right: number; y: number }
export interface World { width: number; floor: number; platforms: readonly Platform[]; reducedMotion?: boolean }
export interface Body {
  /** Horizontal center and feet, in layer coordinates. Velocities are px/s. */
  x: number; y: number; vx: number; vy: number
  form: 'cat' | 'ball'
  ground: string | null
  angle: number
  rest: number
  launchSpeed: number
  fastTurns: number
  hardImpacts: number
}
export interface Sample { x: number; y: number; at: number }

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)))
export const sizeOf = (body: Body) => body.form === 'cat' ? CAT_SIZE : BALL_SIZE

export function createBody(world: World): Body {
  return { x: clamp(world.width * 0.35, CAT_SIZE / 2, world.width - CAT_SIZE / 2), y: world.floor, vx: 0, vy: 0, form: 'cat', ground: 'floor', angle: 0, rest: 0, launchSpeed: 0, fastTurns: 0, hardImpacts: 0 }
}

/** Only a slow release close to a visible top is a placement, not a throw. */
export function placeGently(body: Body, velocity: { vx: number; vy: number }, world: World): Body | null {
  if (Math.hypot(velocity.vx, velocity.vy) > 180) return null
  const platform = world.platforms.filter((p) => p.y >= CAT_SIZE && p.y < world.floor
    && body.x >= p.left + CAT_SIZE / 2 && body.x <= p.right - CAT_SIZE / 2
    && body.y >= p.y - 64 && body.y <= p.y + 36)
    .sort((a, b) => Math.abs(a.y - body.y) - Math.abs(b.y - body.y) || a.id.localeCompare(b.id))[0]
  return platform ? { ...body, form: 'cat', y: platform.y, vx: 0, vy: 0, ground: platform.id,
    angle: 0, rest: 0, launchSpeed: 0, fastTurns: 0, hardImpacts: 0 } : null
}

export function releaseBody(body: Body, velocity: { vx: number; vy: number }, world: World, allowPlacement = true): Body {
  const placed = allowPlacement ? placeGently(body, velocity, world) : null
  if (placed) return placed
  return { ...body, form: 'ball', vx: world.reducedMotion ? 0 : velocity.vx, vy: world.reducedMotion ? 0 : velocity.vy,
    ground: null, rest: 0, launchSpeed: world.reducedMotion ? 0 : Math.hypot(velocity.vx, velocity.vy), fastTurns: 0, hardImpacts: 0 }
}

export function shouldBeDizzy(body: Body, reduced = false): boolean {
  return !reduced && body.launchSpeed >= 1300 && body.fastTurns >= 3 && body.hardImpacts >= 1
}

export function support(body: Body, world: World): Platform | undefined {
  if (body.ground === 'floor' && body.y >= world.floor - 1) return { id: 'floor', left: 0, right: world.width, y: world.floor }
  return world.platforms.find((p) => p.id === body.ground && Math.abs(p.y - body.y) < 1 && body.x >= p.left && body.x <= p.right)
}

/** Small substeps bound collision error independently of display refresh rate. */
export function step(body: Body, dt: number, world: World): Body {
  let next = { ...body }
  const count = Math.max(1, Math.ceil(dt * 120))
  const h = dt / count
  for (let i = 0; i < count; i++) next = integrate(next, h, world)
  return next
}

function integrate(body: Body, dt: number, world: World): Body {
  const next = { ...body }
  const ball = body.form === 'ball'
  const size = sizeOf(body)
  const radius = size / 2
  const bounce = ball && !world.reducedMotion ? BOUNCE : 0
  const grounded = body.vy === 0 && (ball ? body.ground === 'floor' && body.y >= world.floor : !!support(body, world))
  if (ball && world.reducedMotion) { next.vx = 0; next.vy = Math.max(0, next.vy) }
  next.ground = grounded ? body.ground : null
  next.x += next.vx * dt
  if (!grounded) {
    next.y += next.vy * dt + GRAVITY * dt * dt / 2
    next.vy += GRAVITY * dt
  }
  const impact = (speed: number) => { if (ball && Math.abs(speed) >= 450) next.hardImpacts = Math.min(20, next.hardImpacts + 1) }
  if (next.x < radius) { impact(next.vx); next.x = radius; next.vx = Math.abs(next.vx) * bounce }
  if (next.x > world.width - radius) { impact(next.vx); next.x = Math.max(radius, world.width - radius); next.vx = -Math.abs(next.vx) * bounce }
  if (next.y < size) { impact(next.vy); next.y = size; next.vy = Math.abs(next.vy) * bounce }

  // One-way platforms: the feet must cross the top on the way down. Sort by
  // crossing height so the DOM order cannot make the cat tunnel through one.
  if (!ball && !grounded && next.vy >= 0) {
    const crossed = world.platforms.filter((p) => {
      if (p.y < body.y || p.y > next.y || p.y > world.floor) return false
      const t = (p.y - body.y) / (next.y - body.y || 1)
      const x = body.x + (next.x - body.x) * t
      return x >= p.left && x <= p.right
    }).sort((a, b) => a.y - b.y)[0]
    if (crossed) { next.y = crossed.y; next.vy = 0; next.ground = crossed.id }
  }
  if (next.y >= world.floor) {
    impact(next.vy)
    next.y = world.floor
    next.vy = next.vy > 60 ? -next.vy * bounce : 0
    next.ground = next.vy === 0 ? 'floor' : null
  }
  // Walking beyond a title bar removes support on this step, not a frame later.
  if (!ball && next.ground && !support(next, world)) next.ground = null
  if (ball && next.ground === 'floor') next.vx *= Math.pow(0.985, dt * 60)
  if (ball) {
    const rotation = (next.x - body.x) / radius
    next.angle += rotation
    if (Math.abs(body.vx) >= 600) next.fastTurns = Math.min(50, next.fastTurns + Math.abs(rotation) / (2 * Math.PI))
  }
  next.rest = ball && next.ground === 'floor' && Math.hypot(next.vx, next.vy) < REST_SPEED ? next.rest + dt : 0
  return next
}

export function throwVelocity(samples: readonly Sample[]): { vx: number; vy: number } {
  const last = samples.at(-1)
  if (!last) return { vx: 0, vy: 0 }
  const first = samples.find((s) => s.at >= last.at - 0.08 - 1e-9) ?? last
  const elapsed = last.at - first.at
  if (elapsed <= 0) return { vx: 0, vy: 0 }
  const vx = (last.x - first.x) / elapsed
  const vy = (last.y - first.y) / elapsed
  const scale = Math.min(1, 1800 / (Math.hypot(vx, vy) || 1))
  return { vx: vx * scale, vy: vy * scale }
}
