// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Wcat } from './Wcat'

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  vi.stubGlobal('innerWidth', 800)
  vi.stubGlobal('innerHeight', 644)
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { x: 0, y: 0, left: 0, top: 0, width: 800, height: 644, right: 800, bottom: 644, toJSON: () => ({}) }
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

const cat = () => screen.getByRole('button', { name: 'wcat' })
function press(type = 'mouse') {
  fireEvent.pointerDown(cat(), { pointerId: 1, pointerType: type, button: 0, isPrimary: true, clientX: 280, clientY: 578 })
}
function move(x = 340, y = 400, pointerType = 'mouse') {
  fireEvent.pointerMove(cat(), { pointerId: 1, pointerType, clientX: x, clientY: y })
}

describe('wcat interaction', () => {
  it('lifts only after the mouse threshold and becomes a cat after settling', () => {
    render(<Wcat label="wcat" />)
    expect(cat().dataset.form).toBe('cat')
    press()
    move(282, 578)
    expect(cat().dataset.form).toBe('cat')
    move()
    expect(cat().dataset.form).toBe('ball')
    expect(cat().getAttribute('aria-pressed')).toBe('true')
    act(() => vi.advanceTimersByTime(100))
    fireEvent.pointerUp(cat(), { pointerId: 1, clientX: 340, clientY: 400 })
    act(() => vi.advanceTimersByTime(4000))
    expect(cat().dataset.form).toBe('cat')
    expect(cat().dataset.ground).toBe('floor')
  })

  it('waits for a touch hold and lets a preceding swipe cancel it', () => {
    render(<Wcat mobile label="wcat" />)
    press('touch')
    act(() => vi.advanceTimersByTime(200))
    expect(cat().dataset.form).toBe('cat')
    move(280, 550, 'touch')
    act(() => vi.advanceTimersByTime(100))
    expect(cat().dataset.form).toBe('cat')
    press('touch')
    act(() => vi.advanceTimersByTime(260))
    expect(cat().dataset.form).toBe('ball')
    expect(cat().getAttribute('aria-pressed')).toBe('true')
  })

  it('ignores secondary pointers and cancels safely on lost capture', () => {
    render(<Wcat label="wcat" />)
    press()
    move()
    fireEvent.pointerUp(cat(), { pointerId: 2 })
    expect(cat().getAttribute('aria-pressed')).toBe('true')
    fireEvent.lostPointerCapture(cat(), { pointerId: 1 })
    expect(cat().getAttribute('aria-pressed')).toBe('false')
    act(() => vi.advanceTimersByTime(4000))
    expect(cat().dataset.form).toBe('cat')
  })

  it('does not query window platforms on mobile', () => {
    const queries = vi.spyOn(Element.prototype, 'querySelectorAll')
    render(<Wcat mobile label="wcat" />)
    act(() => vi.advanceTimersByTime(1000))
    expect(queries.mock.calls.some(([selector]) => selector.includes('data-window'))).toBe(false)
    expect(cat().dataset.ground).toBe('floor')
    expect(cat().dataset.mode).toBe('sit')
  })

  it('drops straight down under reduced motion and stays seated', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    render(<Wcat label="wcat" />)
    press()
    act(() => vi.advanceTimersByTime(16))
    move()
    fireEvent.pointerUp(cat(), { pointerId: 1, clientX: 340, clientY: 400 })
    act(() => vi.advanceTimersByTime(2000))
    expect(cat().dataset.form).toBe('cat')
    expect(cat().style.transform).toContain('318px')
    act(() => vi.advanceTimersByTime(10000))
    expect(cat().dataset.mode).toBe('sit')
  })

  it('can lift, move, and drop using the keyboard', () => {
    render(<Wcat label="wcat" />)
    fireEvent.keyDown(cat(), { key: ' ' })
    expect(cat().dataset.form).toBe('ball')
    const before = cat().style.transform
    fireEvent.keyDown(cat(), { key: 'ArrowUp' })
    expect(cat().style.transform).not.toBe(before)
    fireEvent.keyDown(cat(), { key: 'Escape' })
    expect(cat().getAttribute('aria-pressed')).toBe('false')
  })

  it('cleans up a pending hold and the animation loop on unmount', () => {
    const view = render(<Wcat mobile label="wcat" />)
    press('touch')
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('still settles on time when rendering at ten frames per second', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 100))
    render(<Wcat label="wcat" />)
    press()
    move()
    fireEvent.pointerCancel(cat(), { pointerId: 1 })
    act(() => vi.advanceTimersByTime(4000))
    expect(cat().dataset.form).toBe('cat')
    expect(cat().dataset.ground).toBe('floor')
  })

  it('finishes unrolling on the floor before following the pointer onto a window', () => {
    const view = render(<div><div data-window="window"><div data-drag-handle /></div><Wcat label="wcat" /></div>)
    const handle = view.container.querySelector<HTMLElement>('[data-drag-handle]')!
    vi.spyOn(handle, 'getBoundingClientRect').mockReturnValue(new DOMRect(300, 450, 500, 33))
    press()
    act(() => vi.advanceTimersByTime(16))
    move(500, 430)
    act(() => vi.advanceTimersByTime(100))
    fireEvent.pointerUp(cat(), { pointerId: 1, clientX: 500, clientY: 430 })
    act(() => vi.advanceTimersByTime(4000))
    expect(cat().dataset.form).toBe('cat')
    expect(cat().dataset.ground).toBe('floor')
    expect(cat().dataset.mode).toBe('sit')
  })
})
