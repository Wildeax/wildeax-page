// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { PlayableSurface } from '@/play/PlayableSurface'
import { IDENTITY_TRANSFORM } from '@/play/types'

afterEach(cleanup)

/** jsdom performs no layout, so rects and document scroll size must be faked. */
function givePage(
  el: HTMLElement,
  rect: { left: number; top: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
) {
  el.getBoundingClientRect = () =>
    ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => '',
    }) as DOMRect
  Object.defineProperty(document.documentElement, 'scrollWidth', {
    configurable: true,
    value: pageWidth,
  })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: pageHeight,
  })
}

describe('PlayableSurface', () => {
  it('renders its children', () => {
    render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={() => {}}>
        <a href="/somewhere">Contact</a>
      </PlayableSurface>,
    )
    expect(screen.getByText('Contact')).toBeTruthy()
  })

  it('applies the transform as a CSS transform', () => {
    const { container } = render(
      <PlayableSurface
        caps={['move']}
        transform={{ x: 12, y: 34, rotation: 90, scale: 2 }}
        onTransform={() => {}}
      >
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.transform).toContain('translate(12px, 34px)')
    expect(el.style.transform).toContain('rotate(90deg)')
    expect(el.style.transform).toContain('scale(2)')
  })

  it('does not report a transform for movement under the threshold', () => {
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 3, clientY: 0 })
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 3, clientY: 0 })
    expect(onTransform).not.toHaveBeenCalled()
  })

  it('reports the dragged offset once past the threshold', () => {
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    // jsdom lays nothing out: every rect is 0x0 and the document has no scroll
    // size, so the bounds clamp would pin any drag to the origin and the
    // assertion would prove nothing. Give it a page and an element to work in.
    givePage(el, { left: 100, top: 100, width: 50, height: 50 }, 1000, 800)

    fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 40, clientY: 20 })
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 40, clientY: 20 })

    expect(onTransform).toHaveBeenCalledWith({ x: 40, y: 20, rotation: 0, scale: 1 })
  })

  it('clamps a drag that would leave the document', () => {
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    givePage(el, { left: 100, top: 100, width: 50, height: 50 }, 1000, 800)

    fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 9000, clientY: 0 })

    // 1000 - 100 - 50 = 850 is as far right as the element can go.
    expect(onTransform).toHaveBeenLastCalledWith({ x: 850, y: 0, rotation: 0, scale: 1 })
  })

  it('does not start a drag from a button inside it, so the click still lands', () => {
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <button type="button">close</button>
      </PlayableSurface>,
    )
    const surface = container.firstElementChild as HTMLElement
    givePage(surface, { left: 100, top: 100, width: 50, height: 50 }, 1000, 800)
    const button = surface.querySelector('button')!
    // A real click on a small button usually moves a few pixels. Without the
    // cancel selector that is a 40px drag and the click never fires.
    fireEvent.pointerDown(button, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 40, clientY: 20 })
    fireEvent.pointerUp(button, { pointerId: 1, clientX: 40, clientY: 20 })
    expect(onTransform).not.toHaveBeenCalled()
  })

  it('refuses native drag-and-drop, so an image inside cannot hijack the gesture', () => {
    const { container } = render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={() => {}}>
        <img src="/x.png" alt="" />
      </PlayableSurface>,
    )
    const img = container.querySelector('img')!
    const evt = new Event('dragstart', { bubbles: true, cancelable: true })
    img.dispatchEvent(evt)
    expect(evt.defaultPrevented).toBe(true)
  })

  it('ignores drags when move is not among its capabilities', () => {
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={[]} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 40, clientY: 20 })
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 40, clientY: 20 })
    expect(onTransform).not.toHaveBeenCalled()
  })

  it('does not lift on touch before the long press elapses', () => {
    vi.useFakeTimers()
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    vi.advanceTimersByTime(100)
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 40, clientY: 20 })
    expect(onTransform).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
