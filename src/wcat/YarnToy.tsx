import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exceedsDragThreshold, LONG_PRESS_MS } from '@/play/drag'
import { BALL_SIZE, clamp, throwVelocity } from './physics'
import type { Sample } from './physics'
import { createYarn, releaseYarn, stepYarn, stringPath } from './yarn'
import type { YarnRef } from './yarn'
import { readWorld } from './world'

interface Props { model: YarnRef; mobile: boolean; label: string; help: string }

export function YarnToy({ model, mobile, label, help }: Props) {
  const [dock, setDock] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState(false)
  const remove = useCallback(() => setActive(false), [])
  useEffect(() => { setDock(document.querySelector<HTMLElement>('[data-sticker-dock]')) }, [])
  return <>
    {dock && createPortal(<button type="button" data-yarn-toggle aria-label={label} title={help} aria-pressed={active}
      onClick={() => setActive((value) => !value)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); remove() }}
      className={`flex h-11 w-11 items-center justify-center rounded-xl text-3xl leading-none transition ${active ? 'bg-brand-400/30 ring-2 ring-brand-400' : 'hover:bg-white/10'}`}>
      <span aria-hidden="true">🧶</span>
    </button>, dock)}
    {active && <YarnBall model={model} mobile={mobile} help={help} onRemove={remove} />}
  </>
}

interface Drag { id: number; touch: boolean; active: boolean; origin: Sample; samples: Sample[]; dx: number; dy: number }

function YarnBall({ model, mobile, help, onRemove }: Omit<Props, 'label'> & { onRemove: () => void }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLButtonElement>(null)
  const stringRef = useRef<SVGPathElement>(null)
  useEffect(() => {
    const layer = layerRef.current!
    const el = ballRef.current!
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let reduced = media?.matches ?? false
    let world = readWorld(layer, mobile, reduced)
    const clock = () => performance.now() / 1000
    model.current = createYarn(world, clock())
    let previousTime = clock()
    let frame = 0
    let drag: Drag | null = null
    let keyboardHeld = false
    let holdTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false
    const sample = (e: PointerEvent): Sample => ({ x: e.clientX - world.left, y: e.clientY - world.top, at: clock() })
    function paint() {
      const yarn = model.current
      if (!yarn || disposed) return
      el.style.transform = `translate(${yarn.body.x - 18}px, ${yarn.body.y - 36}px)`
      el.style.setProperty('--yarn-roll', `${yarn.body.angle}rad`)
      el.dataset.held = String(yarn.held)
      el.setAttribute('aria-pressed', String(yarn.held))
      el.style.visibility = 'visible'
      stringRef.current?.setAttribute('d', stringPath(yarn))
    }
    function lift() {
      if (!model.current) return
      model.current = { ...model.current, held: true, body: { ...model.current.body, vx: 0, vy: 0, ground: null } }
      if (drag) { drag.active = true; el.setPointerCapture(drag.id) }
      paint()
    }
    function finish(cancel = false) {
      clearTimeout(holdTimer)
      const current = drag
      drag = null
      keyboardHeld = false
      if (current && el.hasPointerCapture(current.id)) el.releasePointerCapture(current.id)
      if (model.current?.held) model.current = releaseYarn(model.current, current ? throwVelocity(current.samples) : { vx: 0, vy: 0 }, clock(), world, cancel)
      paint()
    }
    function down(e: PointerEvent) {
      if (e.button !== 0 || !e.isPrimary || drag || keyboardHeld || !model.current) return
      e.stopPropagation()
      if (e.pointerType !== 'touch') e.preventDefault()
      world = readWorld(layer, mobile, reduced)
      const origin = sample(e)
      drag = { id: e.pointerId, touch: e.pointerType === 'touch', active: false, origin, samples: [origin], dx: model.current.body.x - origin.x, dy: model.current.body.y - origin.y }
      if (drag.touch) holdTimer = setTimeout(lift, LONG_PRESS_MS)
      else el.setPointerCapture(e.pointerId)
    }
    function move(e: PointerEvent) {
      if (!drag || drag.id !== e.pointerId || !model.current) return
      const point = sample(e)
      if (!drag.active) {
        if (!exceedsDragThreshold(drag.origin, point)) return
        if (drag.touch) { finish(true); return }
        lift()
      }
      e.preventDefault()
      drag.samples = [...drag.samples.filter((p) => p.at >= point.at - 0.08), point]
      model.current.body.x = clamp(point.x + drag.dx, 18, world.width - 18)
      model.current.body.y = clamp(point.y + drag.dy, BALL_SIZE, world.floor)
      paint()
    }
    function up(e: PointerEvent) {
      if (drag?.id !== e.pointerId) return
      drag.samples.push(sample(e))
      finish()
    }
    function cancelPointer(e: PointerEvent) { if (drag?.id === e.pointerId) finish(true) }
    function cancel() { finish(true) }
    function touch(e: TouchEvent) { if (drag?.active && e.cancelable) e.preventDefault() }
    function noNative(e: Event) { e.preventDefault() }
    function remove(e: Event) { e.preventDefault(); e.stopPropagation(); finish(true); onRemove() }
    function key(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') { remove(e); return }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation()
        if (e.repeat || drag) return
        if (keyboardHeld) finish()
        else { keyboardHeld = true; lift() }
      } else if (keyboardHeld && e.key.startsWith('Arrow') && model.current) {
        e.preventDefault(); e.stopPropagation()
        const delta = e.shiftKey ? 60 : 24
        const body = model.current.body
        body.x = clamp(body.x + (e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0), 18, world.width - 18)
        body.y = clamp(body.y + (e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0), BALL_SIZE, world.floor)
        paint()
      } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(true) }
    }
    function tick(timestamp: number) {
      if (disposed || document.hidden || !model.current) return
      const now = timestamp / 1000
      world = readWorld(layer, mobile, reduced)
      model.current = stepYarn(model.current, Math.min(0.25, Math.max(0, now - previousTime)), world)
      previousTime = now
      paint()
      frame = requestAnimationFrame(tick)
    }
    function visibility() {
      cancelAnimationFrame(frame)
      finish(true)
      previousTime = clock()
      if (!document.hidden) frame = requestAnimationFrame(tick)
    }
    function motion() { reduced = media?.matches ?? false; if (reduced) finish(true) }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancelPointer)
    el.addEventListener('lostpointercapture', cancelPointer)
    el.addEventListener('touchmove', touch, { passive: false })
    el.addEventListener('contextmenu', remove)
    el.addEventListener('dragstart', noNative)
    el.addEventListener('keydown', key)
    el.addEventListener('blur', cancel)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', visibility)
    media?.addEventListener('change', motion)
    paint()
    frame = requestAnimationFrame(tick)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      finish(true)
      model.current = null
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancelPointer)
      el.removeEventListener('lostpointercapture', cancelPointer)
      el.removeEventListener('touchmove', touch)
      el.removeEventListener('contextmenu', remove)
      el.removeEventListener('dragstart', noNative)
      el.removeEventListener('keydown', key)
      el.removeEventListener('blur', cancel)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', visibility)
      media?.removeEventListener('change', motion)
    }
  }, [mobile, model, onRemove])
  return <div ref={layerRef} className={`wcat-yarn-layer${mobile ? ' wcat-mobile' : ''}`} data-yarn-layer>
    <svg className="wcat-string" aria-hidden="true"><path ref={stringRef} fill="none" stroke="#dba79a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <button ref={ballRef} type="button" className="wcat-yarn" data-yarn aria-label={help} title={help} aria-keyshortcuts="Space Enter ArrowUp ArrowDown ArrowLeft ArrowRight Escape Delete">
      <span aria-hidden="true">🧶</span>
    </button>
  </div>
}
