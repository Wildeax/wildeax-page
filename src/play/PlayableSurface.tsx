import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { clampToBounds, exceedsDragThreshold, LONG_PRESS_MS } from '@/play/drag'
import type { Capability, Point, Transform } from '@/play/types'

export interface PlayableSurfaceProps {
  caps: readonly Capability[]
  transform: Transform
  onTransform: (t: Transform) => void
  children: ReactNode
  /**
   * CSS selector. When set, only a press inside a matching descendant starts
   * a drag; presses elsewhere are left alone, so text in a window body can be
   * selected. Windows pass their title bar. Icons and stickers pass nothing
   * and drag from anywhere, which is right for them.
   */
  handle?: string
}

interface DragState {
  pointerId: number
  touch: boolean
  origin: Point
  startTransform: Transform
  /** False until the threshold is crossed, or until the touch long-press fires. */
  active: boolean
}

/**
 * A press on any of these is a click, never a drag. Every drag library has the
 * same escape hatch (react-draggable calls it `cancel`). Without it a press on
 * a close button that moves 5px, which is most real clicks, drags the window
 * and the click never fires.
 */
const NO_DRAG_SELECTOR = 'button, a, input, select, textarea, [data-no-drag]'

/**
 * The opposite escape hatch. A desktop icon IS a button and IS the thing you
 * drag, so it opts back in. The click threshold still separates a click from a
 * drag: under 5px opens it, over 5px moves it and the click never fires.
 */
const DRAG_OK_SELECTOR = '[data-drag-ok]'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Applies a shared Transform to its child and turns pointer input back into
 * one. Imports nothing from playhtml so it can be tested alone and so the
 * offline path in sync.tsx can render it inert.
 */
export function PlayableSurface({ caps, transform, onTransform, children, handle }: PlayableSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lifted, setLifted] = useState(false)

  const canMove = caps.includes('move')
  const reducedMotion = prefersReducedMotion()

  const clearLongPress = useCallback(() => {
    if (longPress.current !== null) {
      clearTimeout(longPress.current)
      longPress.current = null
    }
  }, [])

  useEffect(() => clearLongPress, [clearLongPress])

  useEffect(() => {
    const el = ref.current!
    const onTouchMove = (e: TouchEvent) => {
      // touch-action cannot be changed after a gesture starts. Keep swipes
      // native until the hold, then stop the browser taking over this drag.
      if (drag.current?.touch && drag.current.active && e.touches.length === 1 && e.cancelable) e.preventDefault()
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canMove || e.button !== 0 || e.isPrimary === false) return
      const target = e.target as Element
      if (target.closest(NO_DRAG_SELECTOR) && !target.closest(DRAG_OK_SELECTOR)) return
      if (handle && !target.closest(handle)) return
      const pointerId = e.pointerId
      drag.current = {
        pointerId,
        touch: e.pointerType === 'touch',
        origin: { x: e.clientX, y: e.clientY },
        startTransform: transform,
        // Mouse and pen arm immediately and wait for the 5px threshold. Touch
        // waits for a hold, so a normal swipe still scrolls the page.
        active: e.pointerType !== 'touch',
      }
      if (e.pointerType === 'touch') {
        longPress.current = setTimeout(() => {
          if (drag.current && drag.current.pointerId === pointerId) {
            drag.current.active = true
            setLifted(true)
            ref.current?.setPointerCapture(pointerId)
          }
        }, LONG_PRESS_MS)
      }
    },
    [canMove, handle, transform],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current
      if (!state || state.pointerId !== e.pointerId) return

      const current = { x: e.clientX, y: e.clientY }
      if (!state.active) {
        // A touch that moves before the hold elapses is a scroll, not a drag.
        if (exceedsDragThreshold(state.origin, current)) {
          clearLongPress()
          drag.current = null
        }
        return
      }
      if (!exceedsDragThreshold(state.origin, current)) return

      const el = ref.current
      if (!el) return

      if (!el.hasPointerCapture(e.pointerId)) {
        el.setPointerCapture(e.pointerId)
        setLifted(true)
      }

      const rect = el.getBoundingClientRect()
      const page = {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }
      const desired = {
        x: state.startTransform.x + (current.x - state.origin.x),
        y: state.startTransform.y + (current.y - state.origin.y),
      }
      // getBoundingClientRect already includes the current transform, so undo
      // it to recover the element's authored position before clamping.
      const authored = {
        left: rect.left + window.scrollX - transform.x,
        top: rect.top + window.scrollY - transform.y,
        width: rect.width,
        height: rect.height,
      }
      const clamped = clampToBounds(desired, authored, page)
      onTransform({ ...state.startTransform, x: clamped.x, y: clamped.y })
    },
    [clearLongPress, onTransform, transform.x, transform.y],
  )

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      clearLongPress()
      if (ref.current?.hasPointerCapture(e.pointerId)) {
        ref.current.releasePointerCapture(e.pointerId)
      }
      drag.current = null
      setLifted(false)
    },
    [clearLongPress],
  )

  // Images and links start the browser's own drag-and-drop on press, which
  // fires pointercancel and kills our gesture. A window that is mostly a photo
  // becomes undraggable. Refusing native drag here covers every descendant.
  const onDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (canMove) e.preventDefault()
    },
    [canMove],
  )

  const css = `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragStart={onDragStart}
      style={{
        transform: css,
        touchAction: canMove ? 'pan-y' : undefined,
        // Once lifted, stop text selection from growing under the pointer.
        userSelect: lifted ? 'none' : undefined,
        // The settle animation is ambient motion nobody asked for.
        transition: lifted || reducedMotion ? 'none' : 'transform 120ms ease-out',
        zIndex: lifted ? 40 : undefined,
        position: lifted ? 'relative' : undefined,
        filter: lifted ? 'drop-shadow(0 12px 24px rgba(0,0,0,0.45))' : undefined,
      }}
    >
      {children}
    </div>
  )
}
