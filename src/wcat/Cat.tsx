import { useEffect, useRef, useState } from 'react'
import { exceedsDragThreshold, LONG_PRESS_MS } from '@/play/drag'
import { createBrain, gaze, think } from './brain'
import { createMotion, observe } from './senses'
import { BALL_SIZE, CAT_SIZE, REST_SECONDS, clamp, createBody, placeGently, releaseBody, shouldBeDizzy, sizeOf, step, throwVelocity } from './physics'
import type { Body, Sample } from './physics'
import { readWorld } from './world'
import { easeTail, tailPath, tailPose } from './tail'
import { createVisit, readIcons, roomFor, visitIcon } from './exploration'
import { createPlay, playWithYarn } from './toy-brain'
import { batYarn } from './yarn'
import type { YarnRef } from './yarn'

interface Gesture {
  id: number
  touch: boolean
  active: boolean
  origin: Sample
  offsetX: number
  offsetY: number
  samples: Sample[]
}

interface CatProps {
  mobile?: boolean
  label: string
  toy: YarnRef
  roomId?: string
  initialBody?: Body
  visited: ReadonlySet<string>
  onEnter: (id: string) => void
  onHide: () => void
  onExit: (body: Body) => void
}

export function Cat({ mobile = false, label, toy, roomId, initialBody, visited, onEnter, onHide, onExit }: CatProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const catRef = useRef<HTMLButtonElement>(null)
  const tailRef = useRef<SVGPathElement>(null)
  const landingRef = useRef<HTMLSpanElement>(null)
  const [appearance, setAppearance] = useState({ form: 'cat', mode: 'sit', held: false })

  useEffect(() => {
    const layer = layerRef.current!
    const el = catRef.current!
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let reduced = media?.matches ?? false
    const root = layer.closest<HTMLElement>('[data-desktop]') ?? layer.parentElement!
    const localWorld = () => readWorld(layer, mobile || !!roomId, reduced, !!roomId)
    let world = localWorld()
    const clock = () => performance.now() / 1000
    let body = initialBody ? { ...initialBody } : createBody(world)
    if (roomId && !initialBody) body.x = world.width * 0.75
    let brain = createBrain(clock(), Math.random)
    let visit = createVisit(clock(), Math.random)
    let play = createPlay()
    let entering = 0
    let pointer = { x: 0, y: 0, movedAt: clock(), inside: false, pressed: false }
    let motion = createMotion()
    let pokedAt = -Infinity
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
    let tail = tailPose('sit', clock(), reduced)
    let lastPaintAt = clock()
    const held = () => !!gesture?.active || keyboardHeld

    function paint(now: number) {
      const size = sizeOf(body)
      el.style.transform = `translate3d(${body.x - size / 2}px, ${body.y - size}px, 0)`
      el.style.setProperty('--wcat-facing', String(brain.facing))
      el.style.setProperty('--wcat-roll', `${body.form === 'ball' ? body.angle : 0}rad`)
      el.style.setProperty('--wcat-enter', String(entering))
      const eyes = gaze(brain, body, now, reduced)
      el.style.setProperty('--wcat-eye-x', `${eyes.x}px`)
      el.style.setProperty('--wcat-eye-y', `${eyes.y}px`)
      el.dataset.attention = String(!reduced && !mobile && now < brain.attentionUntil)
      el.dataset.toyInterest = String(play.phase !== 'rest' && now < play.until)
      const targetTail = tailPose(brain.mode, now, reduced)
      tail = reduced ? targetTail : easeTail(tail, targetTail, now - lastPaintAt)
      tailRef.current?.setAttribute('d', tailPath(tail))
      lastPaintAt = now
      const lastSample = gesture?.samples.at(-1)
      const velocity = gesture && lastSample ? throwVelocity([...gesture.samples, { ...lastSample, at: now }]) : { vx: 0, vy: 0 }
      const landing = held() ? placeGently(body, velocity, world) : null
      landingRef.current!.style.visibility = landing ? 'visible' : 'hidden'
      if (landing) landingRef.current!.style.transform = `translate3d(${landing.x - 24}px, ${landing.y - 1}px, 0)`
      el.dataset.blink = String(!reduced && now < blinkUntil)
      el.dataset.squash = String(!reduced && now < squashUntil)
      el.dataset.ground = body.ground ?? ''
      el.dataset.sleepSide = body.x > world.width - 100 ? 'left' : 'right'
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
      play = { ...play, phase: 'rest', nextAt: clock() + 8 }
      visit = createVisit(clock(), Math.random)
      entering = 0
      motion = createMotion()
      body = { ...body, form: 'ball', vx: 0, vy: 0, ground: null, rest: 0, launchSpeed: 0, fastTurns: 0, hardImpacts: 0 }
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
        const velocity = !cancel && current ? throwVelocity(current.samples) : { vx: 0, vy: 0 }
        world = localWorld()
        const release = current?.samples.at(-1)
        if (!disposed && !cancel && roomId && release && (release.x < 0 || release.x > world.width || release.y < 0 || release.y > layer.getBoundingClientRect().height)) {
          const desktop = root.getBoundingClientRect()
          onExit({ ...releaseBody(body, velocity, world, false), x: release.x + world.left - desktop.left, y: release.y + world.top - desktop.top + BALL_SIZE / 2 })
          return
        }
        body = releaseBody(body, velocity, world, !cancel)
        if (body.form === 'cat') {
          brain = createBrain(clock(), Math.random)
          brain.until = Math.max(brain.until, clock() + 5)
          brain.lookAfter = clock() + 1
        }
        pointer.movedAt = clock()
        motion = createMotion()
      } else if (current && !cancel) {
        poke()
      }
      if (!disposed) paint(clock())
    }

    function sample(e: PointerEvent): Sample {
      return { x: e.clientX - world.left, y: e.clientY - world.top, at: clock() }
    }

    function decide(now: number) {
      const blocked = mobile || reduced || !!roomId || held() || !!gesture ||
        ['pet', 'poke', 'dizzy', 'nap', 'wake', 'peek', 'inspect', 'enter'].includes(brain.mode) ||
        now - Math.max(pokedAt, motion.pettedAt) < 0.3
      const playing = playWithYarn(play, body, toy.current, world, now, blocked, Math.random)
      play = playing.play
      body = playing.body
      if (playing.mode) {
        brain = { ...brain, mode: playing.mode, facing: playing.facing, target: playing.target,
          lookUntil: now + 0.3, awakeAt: now, huntAfter: now + 5, attentionUntil: 0 }
        if (playing.swat && toy.current && !toy.current.held) toy.current = batYarn(toy.current, playing.swat, now)
        return
      }
      if (playing.ended) {
        const reactedAt = brain.reactedAt
        const facing = brain.facing === 1 ? -1 : 1
        brain = { ...createBrain(now, Math.random), facing, reactedAt, until: now + 3, lookAfter: now + 4 }
      }
      ({ body, brain } = think(brain, body, { now, world, pointer, mobile, random: Math.random,
        signals: { teasedAt: motion.teasedAt, pettedAt: motion.pettedAt, pokedAt } }))
    }

    function poke() {
      if (disposed || held() || gesture || body.form !== 'cat') return
      pokedAt = clock()
      visit = createVisit(pokedAt, Math.random)
      entering = 0
      motion = createMotion()
      decide(pokedAt)
      paint(pokedAt)
    }

    function onClick(e: MouseEvent) {
      e.stopPropagation()
      // Native pointer clicks already reacted on release. A click without
      // pointer detail is keyboard/assistive activation of the button.
      if (e.detail === 0) poke()
    }

    function onDown(e: PointerEvent) {
      if (e.button !== 0 || !e.isPrimary || gesture || keyboardHeld) return
      e.stopPropagation()
      // Suppress compatibility mousedown/text selection for mouse and pen.
      // Touch keeps its default so a swipe can scroll before the hold.
      if (e.pointerType !== 'touch') e.preventDefault()
      world = localWorld()
      const origin = sample(e)
      gesture = { id: e.pointerId, touch: e.pointerType === 'touch', active: false, origin, offsetX: body.x - origin.x, offsetY: body.y - BALL_SIZE / 2 - origin.y, samples: [origin] }
      motion = createMotion()
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
      const point = sample(e)
      gesture.samples.push(point)
      finish(!gesture.active && exceedsDragThreshold(gesture.origin, point))
    }
    function onCancel(e: PointerEvent) { if (gesture?.id === e.pointerId) finish(true) }
    function cancel() { finish(true) }
    function noNativeDrag(e: Event) { e.preventDefault() }
    // touch-action is fixed for a gesture. Cancel the native touchmove only
    // after the hold; changing touch-action at that point would be too late.
    function onTouchMove(e: TouchEvent) { if (gesture?.active && e.cancelable) e.preventDefault() }
    function onPointer(e: PointerEvent) {
      if (e.pointerType === 'touch' || e.isPrimary === false) return
      const p = sample(e)
      if (pointer.x !== p.x || pointer.y !== p.y) pointer.movedAt = p.at
      pointer = { ...pointer, x: p.x, y: p.y, pressed: !!e.buttons, inside: p.x >= 0 && p.x <= world.width && p.y >= 0 && p.y <= world.floor }
      if (!gesture && !held() && !e.buttons && pointer.inside) motion = observe(motion, p, body)
      else motion = createMotion()
    }
    function onLeave() { pointer.inside = false; motion = createMotion() }

    function onKey(e: KeyboardEvent) {
      if (['Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.stopPropagation()
      if (e.key === 'Enter' && !keyboardHeld) {
        e.preventDefault()
        if (!e.repeat) poke()
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (e.repeat || gesture) return
        if (keyboardHeld) finish()
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
      if (roomId && roomFor(root, roomId) !== layer.parentElement) { onHide(); return }
      world = localWorld()
      const wasVisiting = visit.phase !== 'idle'
      const toyReady = toy.current && !toy.current.held && now - toy.current.thrownAt < 2 && now >= play.nextAt
      const busy = mobile || reduced || !!roomId || !!gesture || held() || pointer.pressed || play.phase !== 'rest' || toyReady ||
        (!wasVisiting && now - Math.max(pointer.movedAt, brain.awakeAt) >= 45) ||
        !['sit', 'walk', 'inspect', 'enter'].includes(brain.mode) ||
        (pointer.inside && now - pointer.movedAt < 1 && Math.hypot(pointer.x - body.x, pointer.y - body.y) < 80)
      if (!busy && (wasVisiting || now >= visit.nextAt)) {
        const icons = readIcons(root, world)
        const openWindows = [...root.querySelectorAll<HTMLElement>('[data-window]:not([hidden])')].filter((win) => getComputedStyle(win).visibility !== 'hidden' && !win.closest('.os-flight-close, .os-flight-minimize')).length
        visit = visitIcon(visit, body, icons, now, false, Math.random, visited, openWindows)
      } else if (wasVisiting) visit = createVisit(now, Math.random)
      entering = 0
      if (wasVisiting && visit.phase === 'idle') brain = createBrain(now, Math.random)
      if (visit.phase !== 'idle' && visit.target) {
        brain.mode = visit.phase === 'hop' ? 'enter' : 'inspect'
        brain.target = { x: visit.target.x, y: visit.target.y }
        brain.facing = visit.target.x >= body.x ? 1 : -1
        brain.lookUntil = visit.until
        brain.attentionUntil = 0
        body.vx = 0
        if (visit.phase === 'hop') {
          entering = clamp((now - visit.startedAt) / (visit.until - visit.startedAt), 0, 1)
          if (entering >= 1) { onEnter(visit.target.id); return }
          const travel = entering * entering * (3 - 2 * entering)
          body.x = visit.origin.x + (visit.target.x - visit.origin.x) * travel
          body.y = visit.origin.y + (visit.target.y - visit.origin.y) * travel - Math.sin(entering * Math.PI) * 70
          body.ground = null
        }
      }
      if (!held()) {
        // A mouse press pins the cat until the threshold or release so it
        // cannot walk away while somebody is trying to pick it up.
        if (!gesture && visit.phase === 'idle') decide(now)
        else body.vx = 0
        const airborne = !body.ground
        if (visit.phase !== 'hop') body = step(body, dt, world)
        if (airborne && body.ground) squashUntil = now + 0.12
        if (body.form === 'ball' && body.rest >= REST_SECONDS) {
          const dizzy = shouldBeDizzy(body, reduced)
          body = { ...body, form: 'cat', vx: 0, vy: 0, angle: 0, rest: 0, x: clamp(body.x, CAT_SIZE / 2, world.width - CAT_SIZE / 2) }
          // Start a fresh rest and discard movement made during the throw.
          brain = createBrain(now, Math.random)
          if (dizzy) { brain.mode = 'dizzy'; brain.until = now + 3; brain.lookAfter = now + 6 }
          motion = createMotion()
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
      motion = createMotion()
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
    el.addEventListener('click', onClick)
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
      el.removeEventListener('click', onClick)
      el.removeEventListener('blur', cancel)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      media?.removeEventListener('change', onMotion)
    }
  }, [mobile, roomId, initialBody, toy, visited, onEnter, onHide, onExit])

  return (
    <div ref={layerRef} className={`wcat-layer${mobile ? ' wcat-mobile' : ''}`} data-wcat-layer>
      <span ref={landingRef} className="wcat-landing" aria-hidden="true" />
      <button ref={catRef} type="button" className="wcat" data-wcat data-form={appearance.form} data-mode={appearance.mode}
        data-held={appearance.held} aria-label={label} title={label} aria-pressed={appearance.held}
        aria-keyshortcuts="Space Enter ArrowUp ArrowDown ArrowLeft ArrowRight Escape">
        <span className="wcat-art" aria-hidden="true">
          <span className="wcat-silhouette">
            <svg className="wcat-tail" viewBox="0 0 52 54" focusable="false"><path ref={tailRef} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="wcat-body" />
            <span className="wcat-ear wcat-ear-left" /><span className="wcat-ear wcat-ear-right" />
          </span>
          <span className="wcat-face"><span className="wcat-eyes">{[0, 1].map((eye) => (
            <span key={eye}><svg className="wcat-eye-spiral" viewBox="0 0 20 20" focusable="false"><path d="M10 10c-2-2-4 1-2 3s7 1 7-4S9 1 5 4s-5 9-1 13 11 1 13-2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg></span>
          ))}</span><span className="wcat-mouth" /></span>
        </span>
        <span className="wcat-sleep" aria-hidden="true"><span>z</span><span>Z</span><span>Z</span></span>
      </button>
    </div>
  )
}
