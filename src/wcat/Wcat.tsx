import { useEffect, useRef, useState } from 'react'
import { exceedsDragThreshold, LONG_PRESS_MS } from '@/play/drag'
import { createBrain, think } from './brain'
import { BALL_SIZE, CAT_SIZE, REST_SECONDS, clamp, createBody, sizeOf, step, throwVelocity } from './physics'
import type { Sample } from './physics'
import { readWorld } from './world'

interface Gesture {
  id: number
  touch: boolean
  active: boolean
  origin: Sample
  offsetX: number
  offsetY: number
  samples: Sample[]
}

export function Wcat({ mobile = false, label }: { mobile?: boolean; label: string }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const catRef = useRef<HTMLButtonElement>(null)
  const [appearance, setAppearance] = useState({ form: 'cat', mode: 'sit', held: false })

  useEffect(() => {
    const layer = layerRef.current!
    const el = catRef.current!
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let reduced = media?.matches ?? false
    let world = readWorld(layer, mobile, reduced)
    const clock = () => performance.now() / 1000
    let body = createBody(world)
    let brain = createBrain(clock(), Math.random)
    let pointer = { x: 0, y: 0, movedAt: clock(), inside: false }
    let gesture: Gesture | null = null
    let keyboardHeld = false
    let holdTimer: ReturnType<typeof setTimeout> | undefined
    let frame = 0
    let previousTime = clock()
    let blinkAt = clock() + 3 + Math.random() * 3
    let blinkUntil = 0
    let squashUntil = 0
    let painted = ''
    let disposed = false
    const held = () => !!gesture?.active || keyboardHeld

    function paint(now: number) {
      const size = sizeOf(body)
      el.style.transform = `translate3d(${body.x - size / 2}px, ${body.y - size}px, 0)`
      el.style.setProperty('--wcat-facing', String(brain.facing))
      el.style.setProperty('--wcat-roll', `${body.form === 'ball' ? body.angle : 0}rad`)
      const dx = pointer.inside && !reduced ? clamp((pointer.x - body.x) / 100, -2, 2) : 0
      const dy = pointer.inside && !reduced ? clamp((pointer.y - body.y) / 100, -2, 2) : 0
      el.style.setProperty('--wcat-eye-x', `${dx}px`)
      el.style.setProperty('--wcat-eye-y', `${dy}px`)
      el.dataset.blink = String(!reduced && now < blinkUntil)
      el.dataset.squash = String(!reduced && now < squashUntil)
      el.dataset.ground = body.ground ?? ''
      el.style.visibility = 'visible'
      const key = `${body.form}:${brain.mode}:${held()}`
      if (painted !== key) {
        painted = key
        setAppearance({ form: body.form, mode: brain.mode, held: held() })
      }
    }

    function clearHold() {
      clearTimeout(holdTimer)
      holdTimer = undefined
    }

    function lift() {
      body = { ...body, form: 'ball', vx: 0, vy: 0, ground: null, rest: 0 }
      brain.mode = 'ball'
      if (gesture) {
        gesture.active = true
        el.setPointerCapture(gesture.id)
      }
      paint(clock())
    }

    function finish(cancel = false) {
      clearHold()
      const current = gesture
      const wasHeld = held()
      gesture = null
      keyboardHeld = false
      if (current && el.hasPointerCapture(current.id)) el.releasePointerCapture(current.id)
      if (wasHeld) {
        const velocity = !cancel && !reduced && current ? throwVelocity(current.samples) : { vx: 0, vy: 0 }
        body = { ...body, ...velocity, ground: null, rest: 0 }
        pointer.movedAt = clock()
      }
      if (!disposed) paint(clock())
    }

    function sample(e: PointerEvent): Sample {
      return { x: e.clientX - world.left, y: e.clientY - world.top, at: clock() }
    }

    function onDown(e: PointerEvent) {
      if (e.button !== 0 || !e.isPrimary || gesture || keyboardHeld) return
      e.stopPropagation()
      // Suppress compatibility mousedown/text selection for mouse and pen.
      // Touch keeps its default so a swipe can scroll before the hold.
      if (e.pointerType !== 'touch') e.preventDefault()
      world = readWorld(layer, mobile, reduced)
      const origin = sample(e)
      gesture = { id: e.pointerId, touch: e.pointerType === 'touch', active: false, origin, offsetX: body.x - origin.x, offsetY: body.y - BALL_SIZE / 2 - origin.y, samples: [origin] }
      if (brain.mode === 'nap') { brain = createBrain(clock(), Math.random); paint(clock()) }
      if (gesture.touch) holdTimer = setTimeout(lift, LONG_PRESS_MS)
      else el.setPointerCapture(e.pointerId)
    }

    function onMove(e: PointerEvent) {
      if (!gesture || gesture.id !== e.pointerId) return
      const point = sample(e)
      if (!gesture.active) {
        if (!exceedsDragThreshold(gesture.origin, point)) return
        if (gesture.touch) { finish(true); return }
        lift()
      }
      e.preventDefault()
      gesture.samples = [...gesture.samples.filter((p) => p.at >= point.at - 0.08), point]
      body.x = clamp(point.x + gesture.offsetX, BALL_SIZE / 2, world.width - BALL_SIZE / 2)
      body.y = clamp(point.y + gesture.offsetY + BALL_SIZE / 2, BALL_SIZE, world.floor)
      paint(clock())
    }

    function onUp(e: PointerEvent) {
      if (gesture?.id !== e.pointerId) return
      gesture.samples.push(sample(e))
      finish()
    }
    function onCancel(e: PointerEvent) { if (gesture?.id === e.pointerId) finish(true) }
    function cancel() { finish(true) }
    function noNativeDrag(e: Event) { e.preventDefault() }
    // touch-action is fixed for a gesture. Cancel the native touchmove only
    // after the hold; changing touch-action at that point would be too late.
    function onTouchMove(e: TouchEvent) { if (gesture?.active && e.cancelable) e.preventDefault() }
    function onPointer(e: PointerEvent) {
      const p = sample(e)
      if (pointer.x !== p.x || pointer.y !== p.y) pointer.movedAt = p.at
      pointer = { ...pointer, x: p.x, y: p.y, inside: p.x >= 0 && p.x <= world.width && p.y >= 0 && p.y <= world.floor }
    }
    function onLeave() { pointer.inside = false }

    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (e.repeat || gesture) return
        if (keyboardHeld) finish(true)
        else { keyboardHeld = true; lift() }
      } else if (keyboardHeld && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const delta = e.shiftKey ? 60 : 24
        body.x = clamp(body.x + (e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0), BALL_SIZE / 2, world.width - BALL_SIZE / 2)
        body.y = clamp(body.y + (e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0), BALL_SIZE, world.floor)
        paint(clock())
      } else if (e.key === 'Escape' && held()) { e.preventDefault(); finish(true) }
    }

    function tick(timestamp: number) {
      if (disposed || document.hidden) return
      const now = timestamp / 1000
      // Physics substeps at 120 Hz, so a slow rendered frame can catch up.
      // Hidden tabs pause below; cap only stalls longer than a quarter second.
      const dt = Math.min(0.25, Math.max(0, now - previousTime))
      previousTime = now
      world = readWorld(layer, mobile, reduced)
      if (!held()) {
        // A mouse press pins the cat until the threshold or release so it
        // cannot walk away while somebody is trying to pick it up.
        if (!gesture) ({ body, brain } = think(brain, body, { now, world, pointer, mobile, random: Math.random }))
        else body.vx = 0
        const airborne = !body.ground
        body = step(body, dt, world)
        if (airborne && body.ground) squashUntil = now + 0.12
        if (body.form === 'ball' && body.rest >= REST_SECONDS) {
          body = { ...body, form: 'cat', vx: 0, vy: 0, angle: 0, rest: 0, x: clamp(body.x, CAT_SIZE / 2, world.width - CAT_SIZE / 2) }
          brain = createBrain(now, Math.random)
        }
      } else {
        body.x = clamp(body.x, BALL_SIZE / 2, world.width - BALL_SIZE / 2)
        body.y = clamp(body.y, BALL_SIZE, world.floor)
      }
      if (now >= blinkAt) { blinkUntil = now + 0.12; blinkAt = now + 3 + Math.random() * 3 }
      paint(now)
      frame = requestAnimationFrame(tick)
    }

    function onVisibility() {
      cancelAnimationFrame(frame)
      finish(true)
      previousTime = clock()
      if (!document.hidden) frame = requestAnimationFrame(tick)
    }
    function onMotion() { reduced = media?.matches ?? false; if (reduced) finish(true) }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    el.addEventListener('lostpointercapture', onCancel)
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('contextmenu', noNativeDrag)
    el.addEventListener('dragstart', noNativeDrag)
    el.addEventListener('keydown', onKey)
    el.addEventListener('blur', cancel)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('blur', cancel)
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    media?.addEventListener('change', onMotion)
    paint(clock())
    frame = requestAnimationFrame(tick)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      finish(true)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      el.removeEventListener('lostpointercapture', onCancel)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('contextmenu', noNativeDrag)
      el.removeEventListener('dragstart', noNativeDrag)
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('blur', cancel)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      media?.removeEventListener('change', onMotion)
    }
  }, [mobile])

  return (
    <div ref={layerRef} className={`wcat-layer${mobile ? ' wcat-mobile' : ''}`} data-wcat-layer>
      <button ref={catRef} type="button" className="wcat" data-wcat data-form={appearance.form} data-mode={appearance.mode}
        data-held={appearance.held} aria-label={label} title={label} aria-pressed={appearance.held}
        aria-keyshortcuts="Space Enter ArrowUp ArrowDown ArrowLeft ArrowRight Escape">
        <span className="wcat-art" aria-hidden="true">
          <span className="wcat-silhouette"><span className="wcat-tail" /><span className="wcat-ear wcat-ear-left" /><span className="wcat-ear wcat-ear-right" /></span>
          <span className="wcat-face"><span className="wcat-eyes"><span /><span /></span><span className="wcat-mouth" /></span>
        </span>
      </button>
    </div>
  )
}
