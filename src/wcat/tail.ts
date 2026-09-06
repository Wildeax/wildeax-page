// Two joined cubic curves. The root stays attached; the middle and tip bend
// independently. Coordinates are local to the small SVG, not the desktop.
export type TailPose = readonly number[]

export function tailPose(mode: string, now: number, reduced = false): TailPose {
  const t = reduced ? 0 : now
  const sway = Math.sin(t * 1.6)
  const flick = Math.sin(t * 8) * Math.pow(Math.max(0, Math.sin(t * 0.7)), 8)
  switch (mode) {
    case 'enter':
    case 'nap': return [25, 49, 13, 49, 18, 45, 29, 43, 31, 47]
    case 'wake': return [26, 48, 13, 44, 15, 35, 20, 28, 13, 28]
    case 'pet': return [26, 48, 13, 40, 15 + sway, 23, 23, 9, 12 + sway * 3, 11]
    case 'poke': return [27, 46, 16, 35, 16, 21, 23, 5, 11, 8]
    case 'stalk':
    case 'crouch': return [26, 49, 12, 47, 8, 40, 6, 36, 11 + Math.sin(t * 14) * 2.8, 34]
    case 'walk':
    case 'follow': return [24, 48, 9, 43, 10, 32 + Math.sin(t * 7) * 3, 9, 23, 6 + Math.sin(t * 7 - 0.7) * 3, 25]
    case 'jump':
    case 'pounce':
    case 'fall': return [22, 47, 9, 45, 5, 36, 9, 30, 3, 29]
    case 'inspect':
    case 'peek': return [25, 48, 10, 37, 12, 25, 19, 14, 11 + sway, 17]
    case 'dizzy': return [24, 48, 10 + sway * 3, 41, 14 + sway * 2, 31, 20 + sway * 5, 21, 7 + sway * 5, 25 + sway * 5]
    default: return [24, 48, 10 + sway * 2, 40, 14 + sway, 28, 20, 16, 8 + sway * 4 + flick * 2, 20 + sway * 2]
  }
}

export function easeTail(previous: TailPose, target: TailPose, dt: number): TailPose {
  const amount = 1 - Math.exp(-12 * Math.max(0, dt))
  return target.map((value, i) => previous[i] + (value - previous[i]) * amount)
}

export function tailPath(pose: TailPose): string {
  const values = pose.map((n) => n.toFixed(2))
  return `M40 44 C${values.slice(0, 6).join(' ')} S${values.slice(6).join(' ')}`
}
