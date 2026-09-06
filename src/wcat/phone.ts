import { clamp } from './physics'

export interface TiltSample { x: number; y: number; at: number }
export interface PhoneInput { tilt: TiltSample; petAt: number; activeUntil: number }
export interface PhoneRef { current: PhoneInput }
export interface Orientation { beta: number; gamma: number; angle: number }
export const ZERO_TILT: TiltSample = { x: 0, y: 0, at: -Infinity }

/** Calibrated screen-space angles, with a dead zone and bounded strength. */
export function tiltFromAngles(sample: Orientation, neutral: Orientation): { x: number; y: number } {
  if (![sample.beta, sample.gamma, sample.angle, neutral.beta, neutral.gamma].every(Number.isFinite) || sample.angle !== neutral.angle) return { x: 0, y: 0 }
  const radians = sample.angle * Math.PI / 180
  const delta = (value: number, base: number) => ((value - base + 540) % 360) - 180
  const beta = delta(sample.beta, neutral.beta), gamma = delta(sample.gamma, neutral.gamma)
  const strength = (value: number) => Math.sign(value) * clamp((Math.abs(value) - 3) / 25, 0, 1)
  return { x: strength(gamma * Math.cos(radians) + beta * Math.sin(radians)), y: strength(beta * Math.cos(radians) - gamma * Math.sin(radians)) }
}

export function phoneTilt(phone: PhoneRef | undefined, now: number): { x: number; y: number } {
  const sample = phone?.current.tilt
  return sample && now - sample.at < 0.75 ? sample : { x: 0, y: 0 }
}
