// Flat, constant-width ink. The base sits behind the body at the rear hip.
// Only the outer bend swishes; no moving root, underside loop or depth turn.
export type TailPose = readonly number[]

export function tailPose(mode: string, now: number, reduced = false): TailPose {
  const t = reduced ? 0 : now
  const sway = Math.sin(t * 1.6)
  const flick = Math.sin(t * 8) * Math.pow(Math.max(0, Math.sin(t * 0.7)), 8)
  switch (mode) {
    case 'enter':
    case 'nap': return [30, 30, 15, 34, 10, 31, 6, 27, 5, 30]
    case 'wake': return [30, 30, 14, 33, 12, 26, 15, 22, 8, 21]
    case 'pet': return [30, 30, 12, 32, 12, 18, 19 + sway, 7, 9 + sway * 2, 10]
    case 'poke': return [30, 30, 13, 30, 12, 17, 18, 4, 8, 7]
    case 'stalk':
    case 'crouch': return [30, 30, 14, 33, 8, 29, 6, 23, 5 + Math.sin(t * 12) * 1.5, 25]
    case 'walk':
    case 'follow': return [30, 30, 13, 33, 10, 23, 12, 14, 6 + Math.sin(t * 5) * 2, 17]
    case 'jump':
    case 'pounce':
    case 'fall': return [30, 30, 15, 32, 8, 25, 6, 20, 3, 22]
    case 'inspect':
    case 'peek': return [30, 30, 13, 32, 12, 22, 19, 13, 10 + sway, 16]
    case 'dizzy': return [30, 30, 13, 33, 10, 26, 12 + sway * 2, 19, 5 + sway * 2.5, 23]
    default: return [30, 30, 13, 33, 12, 24, 16 + sway, 14, 8 + sway * 2 + flick, 17]
  }
}

export function easeTail(previous: TailPose, target: TailPose, dt: number): TailPose {
  const amount = 1 - Math.exp(-12 * Math.max(0, dt))
  return target.map((value, i) => previous[i] + (value - previous[i]) * amount)
}

export function tailPath(pose: TailPose): string {
  const values = pose.map((n) => n.toFixed(2))
  return `M40 30 C${values.slice(0, 6).join(' ')} S${values.slice(6).join(' ')}`
}
