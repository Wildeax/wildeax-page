import { useCallback, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '@/os/useMediaQuery'
import { tiltFromAngles, ZERO_TILT } from './phone'
import type { Orientation, PhoneInput } from './phone'

export type TiltStatus = 'off' | 'asking' | 'waiting' | 'on' | 'denied' | 'unavailable' | 'reduced'
type PermissionEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<PermissionState> }

export function usePhonePlay(mobile: boolean) {
  const input = useRef<PhoneInput>({ tilt: ZERO_TILT, petAt: -Infinity, activeUntil: 0 })
  const neutral = useRef<Orientation | null>(null)
  const attempt = useRef(0)
  const [status, setStatus] = useState<TiltStatus>('off')
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const enabled = mobile && !reduced && (status === 'waiting' || status === 'on')
  const recenter = useCallback(() => { neutral.current = null; input.current.tilt = ZERO_TILT }, [])
  const pet = useCallback(() => {
    const now = performance.now() / 1000
    input.current.petAt = now
    input.current.activeUntil = now + 30
  }, [])

  useEffect(() => () => { attempt.current++; input.current.tilt = ZERO_TILT }, [])

  const toggle = useCallback(async () => {
    const id = ++attempt.current
    recenter()
    if (enabled || status === 'asking') { setStatus('off'); return }
    if (!mobile || reduced) return
    const source = window.DeviceOrientationEvent as PermissionEvent | undefined
    if (!window.isSecureContext || !source) { setStatus('unavailable'); return }
    setStatus('asking')
    try {
      // No await before this call. iOS requires the originating user gesture.
      const result = source.requestPermission ? await source.requestPermission() : 'granted'
      if (id !== attempt.current) return
      setStatus(result === 'granted' ? 'waiting' : 'denied')
    } catch {
      if (id === attempt.current) setStatus('denied')
    }
  }, [enabled, mobile, recenter, reduced, status])

  useEffect(() => {
    if (!enabled) return
    let timeout: ReturnType<typeof setTimeout>
    const changed = (event: DeviceOrientationEvent) => {
      if (document.hidden || event.beta === null || event.gamma === null || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return
      clearTimeout(timeout)
      const angle = screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0
      const sample = { beta: event.beta, gamma: event.gamma, angle }
      if (!neutral.current || neutral.current.angle !== angle) { neutral.current = sample; input.current.tilt = ZERO_TILT }
      const target = tiltFromAngles(sample, neutral.current)
      const old = input.current.tilt
      const now = performance.now() / 1000
      const mix = old.at === -Infinity ? 1 : 0.2
      input.current.tilt = { x: old.x + (target.x - old.x) * mix, y: old.y + (target.y - old.y) * mix, at: now }
      if (Math.abs(target.x) + Math.abs(target.y) > 0.2) input.current.activeUntil = now + 20
      setStatus('on')
    }
    const visibility = () => {
      window.removeEventListener('deviceorientation', changed)
      clearTimeout(timeout)
      recenter()
      if (document.hidden) return
      setStatus('waiting')
      window.addEventListener('deviceorientation', changed, { passive: true })
      timeout = setTimeout(() => setStatus('unavailable'), 4000)
    }
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('deviceorientation', changed)
      document.removeEventListener('visibilitychange', visibility)
      recenter()
    }
  }, [enabled, recenter])

  return { input, status: reduced ? 'reduced' as const : status, toggle, recenter, pet }
}
