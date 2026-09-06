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
  it('sleeps instead of starting an overdue icon visit after a stalled frame', () => {
    render(<div data-desktop><button data-icon="art">Art</button><div data-window="art" hidden><div data-wcat-room="art" /></div><Wcat label="wcat" /></div>)
    vi.spyOn(performance, 'now').mockReturnValue(46000)
    act(() => vi.advanceTimersByTime(32))
    expect(cat().dataset.mode).toBe('nap')
  })

  it('visits an icon, lives in its opened window, and returns to the badge on close', () => {
    const view = render(<div data-desktop><button data-icon="art">Art</button><div data-window="art" hidden><div data-wcat-room="art" /></div><Wcat label="wcat" /></div>)
    for (let i = 0; i < 45 && !view.container.querySelector('[data-cat-resident]'); i++) act(() => vi.advanceTimersByTime(1000))
    expect(view.container.querySelector('[data-icon="art"] [data-cat-resident="art"]')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'wcat' })).toBeNull()
    const win = view.container.querySelector<HTMLElement>('[data-window]')!
    win.hidden = false
    act(() => vi.advanceTimersByTime(32))
    expect(cat().closest('[data-wcat-room]')).toBeTruthy()
    expect(view.container.querySelectorAll('[data-wcat]')).toHaveLength(1)
    win.hidden = true
    act(() => vi.advanceTimersByTime(32))
    expect(screen.queryByRole('button', { name: 'wcat' })).toBeNull()
    expect(view.container.querySelector('[data-cat-resident]')).toBeTruthy()
    win.hidden = false
    act(() => vi.advanceTimersByTime(32))
    expect(cat().closest('[data-wcat-room]')).toBeTruthy()
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('lets a visitor bring the cat back by dragging outside its room', () => {
    const view = render(<div data-desktop><button data-icon="art">Art</button><div data-window="art" hidden><div data-wcat-room="art" /></div><Wcat label="wcat" /></div>)
    for (let i = 0; i < 45 && !view.container.querySelector('[data-cat-resident]'); i++) act(() => vi.advanceTimersByTime(1000))
    view.container.querySelector<HTMLElement>('[data-window]')!.hidden = false
    act(() => vi.advanceTimersByTime(32))
    expect(cat().closest('[data-wcat-room]')).toBeTruthy()
    press()
    move(840, 300)
    act(() => vi.advanceTimersByTime(120))
    fireEvent.pointerUp(cat(), { pointerId: 1, clientX: 840, clientY: 300 })
    act(() => vi.advanceTimersByTime(32))
    expect(cat().closest('[data-wcat-room]')).toBeNull()
    expect(view.container.querySelector('[data-cat-resident]')).toBeNull()
    expect(view.container.querySelectorAll('[data-wcat]')).toHaveLength(1)
  })

  it('keeps sleeping eyes still when a distant pointer moves', () => {
    render(<Wcat label="wcat" />)
    act(() => vi.advanceTimersByTime(46000))
    expect(cat().dataset.mode).toBe('nap')
    fireEvent.pointerMove(window, { pointerType: 'mouse', clientX: 790, clientY: 100 })
    act(() => vi.advanceTimersByTime(32))
    expect(cat().dataset.mode).toBe('nap')
    expect(cat().style.getPropertyValue('--wcat-eye-x')).toBe('0px')
    expect(cat().style.getPropertyValue('--wcat-eye-y')).toBe('0px')
  })

  it('shows sleep marks and takes a drowsy moment before reacting to a wake-up poke', () => {
    render(<Wcat label="wcat" />)
    act(() => vi.advanceTimersByTime(46000))
    expect(cat().dataset.mode).toBe('nap')
    expect(cat().querySelector('.wcat-sleep')?.textContent).toBe('zZZ')
    expect(cat().querySelector('.wcat-sleep')?.getAttribute('aria-hidden')).toBe('true')
    fireEvent.click(cat(), { detail: 0 })
    expect(cat().dataset.mode).toBe('wake')
    act(() => vi.advanceTimersByTime(400))
    expect(cat().dataset.mode).toBe('wake')
    expect(cat().style.getPropertyValue('--wcat-eye-x')).toBe('0px')
    act(() => vi.advanceTimersByTime(300))
    expect(cat().dataset.mode).toBe('poke')
    act(() => vi.advanceTimersByTime(700))
    expect(cat().dataset.mode).toBe('sit')
  })

  it('puts sleep marks on the inward side at the right viewport edge', () => {
    render(<Wcat mobile label="wcat" />)
    fireEvent.keyDown(cat(), { key: ' ' })
    for (let i = 0; i < 15; i++) fireEvent.keyDown(cat(), { key: 'ArrowRight', shiftKey: true })
    fireEvent.keyDown(cat(), { key: 'Escape' })
    act(() => vi.advanceTimersByTime(46000))
    expect(cat().dataset.mode).toBe('nap')
    expect(cat().dataset.sleepSide).toBe('left')
  })

  it.each(['mouse', 'touch'])('pokes on a %s click or tap without lifting', (type) => {
    render(<Wcat label="wcat" mobile={type === 'touch'} />)
    press(type)
    fireEvent.pointerUp(cat(), { pointerId: 1, pointerType: type, clientX: 280, clientY: 578 })
    expect(cat().dataset.mode).toBe('poke')
    expect(cat().dataset.form).toBe('cat')
    expect(cat().getAttribute('aria-pressed')).toBe('false')
    act(() => vi.advanceTimersByTime(800))
    expect(cat().dataset.mode).toBe('sit')
  })

  it('pets from slow head strokes, then rests with neutral eyes', () => {
    render(<Wcat label="wcat" />)
    for (const x of [266, 276, 286, 296, 286, 276, 266, 276, 286, 296]) {
      fireEvent.pointerMove(cat(), { pointerType: 'mouse', clientX: x, clientY: 570, buttons: 0 })
      act(() => vi.advanceTimersByTime(100))
    }
    expect(cat().dataset.mode).toBe('pet')
    expect(cat().style.getPropertyValue('--wcat-eye-x')).toBe('0px')
    expect(cat().style.getPropertyValue('--wcat-eye-y')).toBe('0px')
    act(() => vi.advanceTimersByTime(1600))
    expect(cat().dataset.mode).toBe('sit')
  })

  it('does not mistake a single slow pass across the head for petting', () => {
    render(<Wcat label="wcat" />)
    for (const x of [266, 276, 286, 296]) {
      fireEvent.pointerMove(cat(), { pointerType: 'mouse', clientX: x, clientY: 570, buttons: 0 })
      act(() => vi.advanceTimersByTime(150))
    }
    expect(cat().dataset.mode).not.toBe('pet')
  })

  it('gently sets a held cat on a window and allows another lift', () => {
    const view = render(<div><div data-window="window"><div data-drag-handle /></div><Wcat label="wcat" /></div>)
    const handle = view.container.querySelector<HTMLElement>('[data-drag-handle]')!
    vi.spyOn(handle, 'getBoundingClientRect').mockReturnValue(new DOMRect(300, 350, 400, 33))
    press()
    move(400, 330)
    act(() => vi.advanceTimersByTime(160))
    expect(view.container.querySelector<HTMLElement>('.wcat-landing')?.style.visibility).toBe('visible')
    fireEvent.pointerUp(cat(), { pointerId: 1, clientX: 400, clientY: 330 })
    act(() => vi.advanceTimersByTime(1000))
    expect(cat().dataset.form).toBe('cat')
    expect(cat().dataset.ground).toBe('window')
    expect(cat().style.transform).toContain('306px')
    fireEvent.pointerDown(cat(), { pointerId: 2, pointerType: 'mouse', button: 0, isPrimary: true, clientX: 400, clientY: 328 })
    fireEvent.pointerMove(cat(), { pointerId: 2, pointerType: 'mouse', clientX: 450, clientY: 250 })
    expect(cat().dataset.form).toBe('ball')
  })

  it('gets briefly dizzy after a hard bouncing throw, then recovers', () => {
    render(<Wcat label="wcat" />)
    press()
    act(() => vi.advanceTimersByTime(16))
    move(600, 450)
    fireEvent.pointerUp(cat(), { pointerId: 1, clientX: 600, clientY: 450 })
    for (let i = 0; i < 160 && cat().dataset.form === 'ball'; i++) act(() => vi.advanceTimersByTime(100))
    expect(cat().dataset.form).toBe('cat')
    expect(cat().dataset.mode).toBe('dizzy')
    expect(cat().querySelectorAll('.wcat-eye-spiral')).toHaveLength(2)
    act(() => vi.advanceTimersByTime(3500))
    expect(cat().dataset.mode).toBe('sit')
  })

  it('bends the vector tail over time and holds it still with reduced motion', () => {
    const view = render(<Wcat label="wcat" />)
    const tail = cat().querySelector('.wcat-tail path')
    const first = tail?.getAttribute('d')
    act(() => vi.advanceTimersByTime(600))
    expect(tail?.getAttribute('d')).not.toBe(first)
    view.unmount()
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    render(<Wcat label="wcat" />)
    const stillTail = cat().querySelector('.wcat-tail path')
    const still = stillTail?.getAttribute('d')
    expect(still).toBeTruthy()
    act(() => vi.advanceTimersByTime(1000))
    expect(stillTail?.getAttribute('d')).toBe(still)
  })

  it('does not turn a canceled touch swipe into a poke', () => {
    render(<Wcat mobile label="wcat" />)
    press('touch')
    move(280, 550, 'touch')
    fireEvent.pointerUp(cat(), { pointerId: 1, pointerType: 'touch' })
    expect(cat().dataset.mode).toBe('sit')
  })

  it('turns real nearby pointer reversals into a crouch and one pounce', () => {
    render(<Wcat label="wcat" />)
    const modes = new Set<string>()
    for (const x of [360, 390, 360, 390]) {
      fireEvent.pointerMove(window, { pointerType: 'mouse', isPrimary: true, clientX: x, clientY: 580, buttons: 0 })
      act(() => vi.advanceTimersByTime(120))
      modes.add(cat().dataset.mode!)
    }
    for (let i = 0; i < 30; i++) {
      act(() => vi.advanceTimersByTime(50))
      modes.add(cat().dataset.mode!)
    }
    expect([...modes]).toEqual(expect.arrayContaining(['stalk', 'crouch', 'pounce']))
    expect(cat().dataset.mode).toBe('sit')
    expect(cat().dataset.ground).toBe('floor')
  })

  it('does not hunt movement made while dragging something else', () => {
    render(<Wcat label="wcat" />)
    for (const x of [360, 390, 360, 390]) {
      fireEvent.pointerMove(window, { pointerType: 'mouse', clientX: x, clientY: 580, buttons: 1 })
      act(() => vi.advanceTimersByTime(120))
    }
    expect(cat().dataset.mode).toBe('sit')
  })

  it('lets keyboard and assistive button activation poke the cat', () => {
    render(<Wcat label="wcat" />)
    fireEvent.keyDown(cat(), { key: 'Enter' })
    expect(cat().dataset.mode).toBe('poke')
    act(() => vi.advanceTimersByTime(800))
    fireEvent.click(cat(), { detail: 0 })
    expect(cat().dataset.mode).toBe('poke')
  })

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

  it('finishes unrolling on the floor without a cursor-triggered jump', () => {
    const view = render(<div><div data-window="window"><div data-drag-handle /></div><Wcat label="wcat" /></div>)
    const handle = view.container.querySelector<HTMLElement>('[data-drag-handle]')!
    vi.spyOn(handle, 'getBoundingClientRect').mockReturnValue(new DOMRect(300, 450, 500, 33))
    press()
    act(() => vi.advanceTimersByTime(16))
    move(500, 340)
    act(() => vi.advanceTimersByTime(100))
    fireEvent.pointerUp(cat(), { pointerId: 1, clientX: 500, clientY: 340 })
    act(() => vi.advanceTimersByTime(4000))
    expect(cat().dataset.form).toBe('cat')
    expect(cat().dataset.ground).toBe('floor')
    expect(cat().dataset.mode).toBe('sit')
  })
})
