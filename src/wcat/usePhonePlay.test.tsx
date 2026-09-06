// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { usePhonePlay } from './usePhonePlay'

const permission = vi.fn()
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('DeviceOrientationEvent', { requestPermission: permission })
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  permission.mockReset().mockResolvedValue('granted')
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const orient = (gamma: number | null, beta: number | null = 60) => {
  const event = new Event('deviceorientation')
  Object.assign(event, { beta, gamma })
  act(() => { window.dispatchEvent(event) })
}

it('requests permission only from the control, calibrates, and removes sensor access on disable', async () => {
  const view = renderHook(() => usePhonePlay(true))
  orient(30)
  expect(permission).not.toHaveBeenCalled()
  expect(view.result.current.input.current.tilt.x).toBe(0)
  await act(async () => { await view.result.current.toggle() })
  expect(permission).toHaveBeenCalledTimes(1)
  expect(view.result.current.status).toBe('waiting')
  orient(10)
  expect(view.result.current.status).toBe('on')
  expect(view.result.current.input.current.tilt.x).toBe(0)
  orient(30)
  expect(view.result.current.input.current.tilt.x).toBeGreaterThan(0)
  act(() => view.result.current.recenter())
  orient(30)
  expect(view.result.current.input.current.tilt.x).toBe(0)
  await act(async () => { await view.result.current.toggle() })
  orient(50)
  expect(view.result.current.status).toBe('off')
  expect(view.result.current.input.current.tilt.x).toBe(0)
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('handles permission denial and continues to accept touch petting', async () => {
  permission.mockResolvedValue('denied')
  const { result } = renderHook(() => usePhonePlay(true))
  await act(async () => { await result.current.toggle() })
  expect(result.current.status).toBe('denied')
  act(() => result.current.pet())
  expect(result.current.input.current.petAt).toBeGreaterThan(-Infinity)
  expect(result.current.input.current.activeUntil).toBeGreaterThan(0)
  orient(80)
  expect(result.current.input.current.tilt.x).toBe(0)
})

it('supports browsers with orientation events but no explicit permission method', async () => {
  vi.stubGlobal('DeviceOrientationEvent', class {})
  const { result } = renderHook(() => usePhonePlay(true))
  await act(async () => { await result.current.toggle() })
  orient(0); orient(25)
  expect(result.current.status).toBe('on')
  expect(result.current.input.current.tilt.x).toBeGreaterThan(0)
  expect(permission).not.toHaveBeenCalled()
})

it('handles a rejected permission request without breaking touch play', async () => {
  permission.mockRejectedValue(new Error('NotAllowedError'))
  const { result } = renderHook(() => usePhonePlay(true))
  await act(async () => { await result.current.toggle() })
  expect(result.current.status).toBe('denied')
  act(() => result.current.pet())
  expect(result.current.input.current.petAt).toBeGreaterThan(-Infinity)
})

it('reports missing sensor data instead of leaving an enabled-looking dead control', async () => {
  const { result } = renderHook(() => usePhonePlay(true))
  await act(async () => { await result.current.toggle() })
  orient(null)
  orient(NaN)
  act(() => vi.advanceTimersByTime(4500))
  expect(result.current.status).toBe('unavailable')
  expect(result.current.input.current.tilt.x).toBe(0)
})

it('ignores a permission promise that resolves after unmount', async () => {
  let grant!: (value: string) => void
  permission.mockImplementation(() => new Promise((resolve) => { grant = resolve }))
  const view = renderHook(() => usePhonePlay(true))
  let pending!: Promise<void>
  act(() => { pending = view.result.current.toggle() })
  const input = view.result.current.input
  view.unmount()
  await act(async () => { grant('granted'); await pending })
  orient(0); orient(40)
  expect(input.current.tilt.x).toBe(0)
  expect(vi.getTimerCount()).toBe(0)
})

it('pauses in hidden tabs and recalibrates when the page returns', async () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  const { result } = renderHook(() => usePhonePlay(true))
  await act(async () => { await result.current.toggle() })
  orient(0); orient(40)
  expect(result.current.input.current.tilt.x).toBeGreaterThan(0)
  hidden.mockReturnValue(true)
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  orient(-40)
  expect(result.current.input.current.tilt.x).toBe(0)
  hidden.mockReturnValue(false)
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  orient(-40)
  expect(result.current.input.current.tilt.x).toBe(0)
})

it.each(['insecure', 'missing', 'reduced'])('does not ask for sensors when %s', async (reason) => {
  if (reason === 'insecure') vi.stubGlobal('isSecureContext', false)
  if (reason === 'missing') vi.stubGlobal('DeviceOrientationEvent', undefined)
  if (reason === 'reduced') vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  const { result } = renderHook(() => usePhonePlay(true))
  await act(async () => { await result.current.toggle() })
  expect(permission).not.toHaveBeenCalled()
  expect(result.current.status).toBe(reason === 'reduced' ? 'reduced' : 'unavailable')
})
