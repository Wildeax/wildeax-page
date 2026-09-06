import { useEffect, useReducer, useRef, useState } from 'react'
import type {
  AnimationEvent,
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import { useI18n } from '@/i18n'
import { Playable } from '@/play'
import { DesktopIcon } from '@/os/DesktopIcon'
import { Taskbar } from '@/os/Taskbar'
import { Window } from '@/os/Window'
import { DESKTOP_ICON_IDS, WINDOWS } from '@/os/registry'
import { PROJECTS } from '@/os/projects'
import { initialOsState, isMinimized, isVisible, osReducer, zIndexOf } from '@/os/windowState'
import { useIsDesktop } from '@/os/useIsDesktop'
import { normalizeRect, selectIntersecting } from '@/os/marquee'
import type { Point } from '@/os/marquee'
import type { WindowDef, WindowId } from '@/os/types'
import { ArtWindow } from '@/os/content/ArtWindow'
import { ContactWindow } from '@/os/content/ContactWindow'
import { MeWindow } from '@/os/content/MeWindow'
import { ProjectWindow } from '@/os/content/ProjectWindow'
import { ReadmeWindow } from '@/os/content/ReadmeWindow'
import { WorkWindow } from '@/os/content/WorkWindow'
import { Wcat } from '@/wcat/Wcat'

type FlightKind = 'open' | 'close' | 'minimize' | 'restore'

/**
 * A window mid-animation. The state change it represents is dispatched on
 * animationend, so a minimized window is only hidden once it has visibly gone,
 * and a restored one is visible for the whole of its return.
 *
 * Keyed per window. Tracking a single flight meant minimizing A and then
 * closing B inside 440ms dropped A's animationend, and A snapped back.
 */
interface Flight {
  kind: FlightKind
  dx: number
  dy: number
}

type Flights = Partial<Record<WindowId, Flight>>

/** Rubber-band selection in progress, in desktop-root coordinates. */
interface Marquee {
  origin: Point
  current: Point
}

/** left-3 + w-24 on the icon list, plus a gutter. */
const ICON_COLUMN_WIDTH = 120
const TASKBAR_HEIGHT = 44

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Offset from a window's centre to its taskbar button's centre. Measured on
 * the box inside the drag transform, so it reflects where the window actually
 * is after being dragged, and the box keeps its explicit size while the dialog
 * inside is hidden, which is exactly when a restore needs it.
 */
function dockOffset(id: WindowId): { dx: number; dy: number } {
  const win = document.querySelector(`[data-win-box="${id}"]`)?.getBoundingClientRect()
  const task = document.querySelector(`[data-task="${id}"]`)?.getBoundingClientRect()
  if (!win || !task) return { dx: 0, dy: window.innerHeight }
  return {
    dx: task.left + task.width / 2 - (win.left + win.width / 2),
    dy: task.top + task.height / 2 - (win.top + win.height / 2),
  }
}

/**
 * Authored positions are tuned for 1280x720 and up. On anything smaller, pull
 * a window back inside the viewport rather than let it start behind the
 * taskbar or off the right edge. Only the authored anchor moves; the shared
 * drag offset from Playable sits on top of it unchanged.
 */
function placeWithinViewport(w: WindowDef): { left: number; top: number } {
  if (typeof window === 'undefined') return { left: w.x, top: w.y }
  const maxLeft = window.innerWidth - w.width - 8
  const maxTop = window.innerHeight - TASKBAR_HEIGHT - w.height - 8
  return {
    left: Math.max(ICON_COLUMN_WIDTH, Math.min(w.x, maxLeft)),
    top: Math.max(8, Math.min(w.y, maxTop)),
  }
}

function bodyFor(id: WindowId, openWindow: (id: WindowId) => void): ReactNode {
  switch (id) {
    case 'readme':
      return <ReadmeWindow />
    case 'work':
      return <WorkWindow onOpen={openWindow} />
    case 'art':
      return <ArtWindow />
    case 'me':
      return <MeWindow />
    case 'contact':
      return <ContactWindow />
    default: {
      const project = PROJECTS.find((p) => p.id === id)
      return project ? <ProjectWindow project={project} /> : null
    }
  }
}

export function Desktop() {
  const { t } = useI18n()
  const isDesktop = useIsDesktop()
  const [state, dispatch] = useReducer(osReducer, WINDOWS, initialOsState)
  const [flights, setFlights] = useState<Flights>({})
  const reduced = prefersReducedMotion()

  // Wallpaper interactions. All per visitor except the icon reset, which
  // travels through Playable's shared transform like any other drag.
  const rootRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<WindowId>>(() => new Set())
  const [menu, setMenu] = useState<Point | null>(null)
  const [iconReset, setIconReset] = useState(0)

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  function startFlight(id: WindowId, flight: Flight) {
    setFlights((current) => ({ ...current, [id]: flight }))
  }

  function endFlight(id: WindowId) {
    setFlights((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function restoreWindow(id: WindowId) {
    // Measure before dispatch: the wrapper has a rect while hidden, and this
    // is where the reverse flight starts from.
    const off = dockOffset(id)
    dispatch({ type: 'restore', id })
    if (!reduced) startFlight(id, { kind: 'restore', ...off })
  }

  function openWindow(id: WindowId) {
    if (!isDesktop) {
      const card = document.getElementById(`mobile-${id}`)
      card?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
      card?.focus({ preventScroll: true })
      return
    }
    if (isMinimized(state, id)) return restoreWindow(id)
    const wasVisible = isVisible(state, id)
    dispatch({ type: 'open', id })
    if (!wasVisible && !reduced) startFlight(id, { kind: 'open', dx: 0, dy: 0 })
  }

  function closeWindow(id: WindowId) {
    if (reduced) return dispatch({ type: 'close', id })
    startFlight(id, { kind: 'close', dx: 0, dy: 0 })
  }

  function minimizeWindow(id: WindowId) {
    if (reduced) return dispatch({ type: 'minimize', id })
    startFlight(id, { kind: 'minimize', ...dockOffset(id) })
  }

  function selectTask(id: WindowId) {
    if (isMinimized(state, id)) restoreWindow(id)
    else dispatch({ type: 'focus', id })
  }

  function onFlightEnd(id: WindowId) {
    return (e: AnimationEvent<HTMLDivElement>) => {
      // Children may animate too; only the wrapper's own animation counts.
      if (e.target !== e.currentTarget) return
      const flight = flights[id]
      if (!flight) return
      if (flight.kind === 'minimize') dispatch({ type: 'minimize', id })
      if (flight.kind === 'close') dispatch({ type: 'close', id })
      endFlight(id)
    }
  }

  /** Pointer position relative to the desktop root, which the marquee is drawn in. */
  function rootPoint(e: { clientX: number; clientY: number }): Point {
    const r = rootRef.current?.getBoundingClientRect()
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
  }

  function onRootPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Only a press on bare wallpaper. Windows, icons, stickers and the taskbar
    // all stop this by being the target themselves.
    if (e.target !== e.currentTarget || e.button !== 0) return
    setMenu(null)
    setSelected(new Set())
    const p = rootPoint(e)
    setMarquee({ origin: p, current: p })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onRootPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!marquee || !rootRef.current) return
    const current = rootPoint(e)
    const band = normalizeRect(marquee.origin, current)
    const root = rootRef.current.getBoundingClientRect()
    const icons = [...rootRef.current.querySelectorAll<HTMLElement>('[data-icon]')].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        id: el.dataset.icon as WindowId,
        rect: { x: r.left - root.left, y: r.top - root.top, width: r.width, height: r.height },
      }
    })
    setSelected(new Set(selectIntersecting(band, icons)))
    setMarquee({ origin: marquee.origin, current })
  }

  function onRootPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!marquee) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setMarquee(null)
  }

  function onRootContextMenu(e: ReactMouseEvent<HTMLDivElement>) {
    // Right-click on a window, link or icon keeps the browser's own menu.
    if (e.target !== e.currentTarget) return
    e.preventDefault()
    setMenu(rootPoint(e))
  }

  function refreshIcons() {
    setIconReset((n) => n + 1)
    setSelected(new Set())
    setMenu(null)
  }

  if (!isDesktop) {
    return (
      <main data-mobile className="mobile-page relative z-10 mx-auto flex max-w-xl flex-col gap-4">
        <MobileHeader onNavigate={openWindow} />
        <Wcat mobile label={t('os.phone.catHelp')} toyLabel={t('os.wcat.yarn')} toyHelp={t('os.phone.yarnHelp')}
          phoneLabels={{ yarn: t('os.phone.yarn'), pet: t('os.phone.pet'), tilt: t('os.phone.tilt'),
            enable: t('os.phone.enable'), disable: t('os.phone.disable'), recenter: t('os.phone.recenter'), off: '',
            asking: t('os.phone.asking'), waiting: t('os.phone.waiting'), on: t('os.phone.on'),
            denied: t('os.phone.denied'), unavailable: t('os.phone.unavailable'), reduced: t('os.phone.reduced') }} />
        {WINDOWS.map((w) => (
          <section key={w.id} id={`mobile-${w.id}`} data-window={w.id} data-mobile-card
            tabIndex={-1} aria-labelledby={`mobile-title-${w.id}`}
            className="mobile-card rounded-xl border border-brand-400/25 bg-[#0b0e12]/95 shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
            <h2 id={`mobile-title-${w.id}`} className="rounded-t-xl border-b border-brand-400/20 bg-gradient-to-r from-brand-400/10 to-violet-500/10 px-4 py-3 font-mono text-xs tracking-wide text-brand-200">{t(w.titleKey)}</h2>
            <div className="mobile-card-content px-4 py-4 text-sm text-zinc-300">{bodyFor(w.id, openWindow)}</div>
          </section>
        ))}
      </main>
    )
  }

  const band = marquee ? normalizeRect(marquee.origin, marquee.current) : null

  return (
    <div
      ref={rootRef}
      data-desktop
      className="relative z-10 h-screen overflow-hidden"
      onPointerDown={onRootPointerDown}
      onPointerMove={onRootPointerMove}
      onPointerUp={onRootPointerUp}
      onPointerCancel={onRootPointerUp}
      onContextMenu={onRootContextMenu}
    >
      <ul className="absolute left-3 top-3 z-[5] flex w-24 flex-col gap-1">
        {DESKTOP_ICON_IDS.map((id) => {
          const def = WINDOWS.find((w) => w.id === id)
          if (!def) return null
          return (
            <li key={id}>
              <Playable id={`icon-${id}`} caps={['move']} resetSignal={iconReset}>
                <DesktopIcon
                  id={id}
                  label={t(def.titleKey)}
                  glyph={def.glyph}
                  iconSrc={def.iconSrc}
                  selected={selected.has(id)}
                  pop={iconReset}
                  onOpen={() => openWindow(id)}
                />
              </Playable>
            </li>
          )
        })}
      </ul>

      {/* Above icons, below windows: it is drawn on empty wallpaper. */}
      {band && (
        <div
          data-marquee
          aria-hidden="true"
          className="pointer-events-none absolute z-[8] border border-brand-400/70 bg-brand-400/10"
          style={{ left: band.x, top: band.y, width: band.width, height: band.height }}
        />
      )}

      {WINDOWS.map((w) => {
        const shown = isVisible(state, w.id)
        const inFlight = flights[w.id]
        const anchor = placeWithinViewport(w)
        // z-index lives on the wrapper, OUTSIDE PlayableSurface. The surface
        // always has a transform, which is its own stacking context, so a
        // z-index inside it can never order one window over another.
        const wrapperStyle: CSSProperties = {
          left: anchor.left,
          top: anchor.top,
          zIndex: shown ? zIndexOf(state, w.id) : undefined,
          // visibility rather than display: the box inside keeps its explicit
          // width and height, so dockOffset can still measure where a restore
          // flight starts, while nothing paints and nothing intercepts a
          // pointer meant for the wallpaper behind it.
          visibility: shown ? undefined : 'hidden',
          // The wrapper's own box stays at the authored anchor after the window
          // inside is dragged away, leaving an empty, transparent rectangle
          // that still wins hit-testing over whatever sits beneath it at a
          // lower z-index. Found in Chromium: splitwars's empty wrapper was
          // swallowing every press on work.exe's title bar.
          pointerEvents: 'none',
        }
        // The flight animates the box INSIDE the surface's drag transform, not
        // the wrapper. Once a window has been dragged, the wrapper's border box
        // is still at the authored anchor while the visible window sits at the
        // drag offset. clip-path and transform-origin on the wrapper then cut
        // and scale against the wrong rectangle: a window dragged far enough
        // was clipped to nothing on the first frame and simply vanished.
        const boxStyle: CSSProperties & Record<`--${string}`, string> = {
          width: w.width,
          height: w.height,
          // Re-enable what the wrapper turned off, on the thing that is drawn.
          pointerEvents: 'auto',
          '--dock-dx': `${inFlight?.dx ?? 0}px`,
          '--dock-dy': `${inFlight?.dy ?? 0}px`,
        }
        return (
          <div key={w.id} data-win-wrapper={w.id} className="absolute" style={wrapperStyle}>
            <Playable id={`win-${w.id}`} caps={['move']} handle="[data-drag-handle]">
              <div
                data-win-box={w.id}
                className={inFlight ? `os-flight-${inFlight.kind}` : undefined}
                style={boxStyle}
                onAnimationEnd={onFlightEnd(w.id)}
              >
                <Window
                  id={w.id}
                  title={t(w.titleKey)}
                  hidden={!shown}
                  onClose={() => closeWindow(w.id)}
                  onFocus={() => dispatch({ type: 'focus', id: w.id })}
                  onMinimize={() => minimizeWindow(w.id)}
                >
                  {bodyFor(w.id, openWindow)}
                </Window>
              </div>
            </Playable>
          </div>
        )
      })}

      {menu && (
        <>
          {/* Click anywhere else, or right-click again, closes the menu. Above
              the taskbar so nothing can sit on top of an open menu. */}
          <button
            type="button"
            aria-label={t('os.menu.close')}
            className="fixed inset-0 z-[59] cursor-default"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu(null)
            }}
          />
          <div
            role="menu"
            data-context-menu
            className="absolute z-[60] min-w-[168px] rounded-md border border-brand-400/30 bg-[#0b0e12]/95 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.6)] backdrop-blur"
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              role="menuitem"
              type="button"
              onClick={refreshIcons}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-mono text-[12px] text-zinc-200 transition hover:bg-brand-400/15 hover:text-brand-100"
            >
              <span aria-hidden="true">↻</span>
              {t('os.menu.refresh')}
            </button>
          </div>
        </>
      )}

      <Wcat label={t('os.wcat.help')} insideLabel={t('os.wcat.inside')} toyLabel={t('os.wcat.yarn')} toyHelp={t('os.wcat.yarnHelp')} />
      <div data-taskbar>
        <Taskbar open={state.open} minimized={state.minimized} onSelect={selectTask} />
      </div>
    </div>
  )
}

function MobileHeader({ onNavigate }: { onNavigate: (id: WindowId) => void }) {
  const { lang, setLang, t } = useI18n()
  return (
    <header className="mobile-header sticky z-40 -mx-1 rounded-b-xl border-b border-brand-400/15 bg-[#0b0e12]/95 px-1 backdrop-blur">
      <div className="flex items-center justify-between">
      <h1 className="font-mono text-sm tracking-widest text-brand-300">WILDEAX OS</h1>
      <button
        type="button"
        aria-label="Switch language"
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        className="grid h-11 min-w-11 place-items-center rounded-lg border border-white/10 bg-white/5 px-3 font-mono text-xs text-zinc-200"
      >
        {lang === 'en' ? 'ES' : 'EN'}
      </button>
      </div>
      <nav aria-label={t('os.mobile.sections')} className="flex justify-between gap-1 py-1">
        {(['readme', 'work', 'art', 'contact'] as const).map((id) => <a key={id} href={`#mobile-${id}`}
          onClick={(e) => { e.preventDefault(); onNavigate(id) }}
          className="flex min-h-11 items-center rounded-lg px-3 font-mono text-xs text-zinc-300 hover:bg-brand-400/10 hover:text-brand-200">
          {t(`os.mobile.${id}`)}
        </a>)}
      </nav>
    </header>
  )
}
