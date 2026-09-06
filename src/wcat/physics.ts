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
}
export interface Sample { x: number; y: number; at: number }

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)))
export const sizeOf = (body: Body) => body.form === 'cat' ? CAT_SIZE : BALL_SIZE

export function createBody(world: World): Body {
  return { x: clamp(world.width * 0.35, CAT_SIZE / 2, world.width - CAT_SIZE / 2), y: world.floor, vx: 0, vy: 0, form: 'cat', ground: 'floor', angle: 0, rest: 0 }
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
  if (next.x < radius) { next.x = radius; next.vx = Math.abs(next.vx) * bounce }
  if (next.x > world.width - radius) { next.x = Math.max(radius, world.width - radius); next.vx = -Math.abs(next.vx) * bounce }
  if (next.y < size) { next.y = size; next.vy = Math.abs(next.vy) * bounce }

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
    next.y = world.floor
    next.vy = next.vy > 60 ? -next.vy * bounce : 0
    next.ground = next.vy === 0 ? 'floor' : null
  }
  // Walking beyond a title bar removes support on this step, not a frame later.
  if (!ball && next.ground && !support(next, world)) next.ground = null
  if (ball && next.ground === 'floor') next.vx *= Math.pow(0.985, dt * 60)
  if (ball) next.angle += (next.x - body.x) / radius
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
