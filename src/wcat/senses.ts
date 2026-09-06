import { CAT_SIZE } from './physics'
import type { Body, Sample } from './physics'

export interface Signals { teasedAt?: number; pettedAt?: number; pokedAt?: number }
export interface Motion { points: Sample[]; teasedAt: number; pettedAt: number }

export function createMotion(): Motion {
  return { points: [], teasedAt: -Infinity, pettedAt: -Infinity }
}

function onHead(point: Sample, body: Body): boolean {
  return Math.abs(point.x - body.x) <= 24 && point.y >= body.y - CAT_SIZE && point.y <= body.y - 19
}

// Only unpressed mouse/pen movement reaches this recognizer. Keep a short,
// bounded history so ordinary navigation never leaves a queued-up pounce.
export function observe(previous: Motion, point: Sample, body: Body): Motion {
  const last = previous.points.at(-1)
  const continuous = last && point.at - last.at <= 0.3
  const points = [...(continuous ? previous.points.filter((p) => point.at - p.at <= 1.2) : []), point].slice(-80)
  const motion = { ...previous, points }
  if (body.form !== 'cat' || !body.ground) return { ...motion, points: [] }

  const head: Sample[] = []
  for (let i = points.length - 1; i >= 0; i--) {
    if (!onHead(points[i], body) || point.at - points[i].at > 0.7) break
    head.unshift(points[i])
  }
  if (head.length > 1) {
    let travel = 0
    let gentle = true
    for (let i = 1; i < head.length; i++) {
      const dx = Math.abs(head[i].x - head[i - 1].x)
      const dt = head[i].at - head[i - 1].at
      travel += dx
      if (dt <= 0 || Math.hypot(dx, head[i].y - head[i - 1].y) / dt > 450) gentle = false
    }
    if (gentle && travel >= 24 && point.at - head[0].at >= 0.12) motion.pettedAt = point.at
  }

  const nearToy = (p: Sample) => Math.hypot(p.x - body.x, p.y - body.y) <= 240
    && Math.abs(p.y - body.y) <= 100 && !onHead(p, body)
  if (!points.every(nearToy) || points.length < 4 || point.at - motion.pettedAt < 0.8) return motion
  let anchor = points[0]
  let direction: { x: number; y: number } | null = null
  let turns = 0
  let travel = 0
  for (const p of points.slice(1)) {
    const dx = p.x - anchor.x
    const dy = p.y - anchor.y
    const length = Math.hypot(dx, dy)
    if (length < 8) continue // Sensor jitter is not a change of direction.
    const dt = p.at - anchor.at
    if (dt <= 0 || length / dt > 1500) return motion
    const next = { x: dx / length, y: dy / length }
    if (direction && direction.x * next.x + direction.y * next.y < -0.45) turns++
    direction = next
    anchor = p
    travel += length
  }
  if (turns >= 2 && travel >= 48 && point.at - points[0].at >= 0.18) motion.teasedAt = point.at
  return motion
}
