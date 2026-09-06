import { useReducer, useState } from 'react'
import type { AnimationEvent, CSSProperties, ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { Playable } from '@/play'
import { DesktopIcon } from '@/os/DesktopIcon'
import { Taskbar } from '@/os/Taskbar'
import { Window } from '@/os/Window'
import { DESKTOP_ICON_IDS, WINDOWS } from '@/os/registry'
import { PROJECTS } from '@/os/projects'
import { initialOsState, isMinimized, isVisible, osReducer, zIndexOf } from '@/os/windowState'
import { useIsDesktop } from '@/os/useIsDesktop'
import type { WindowDef, WindowId } from '@/os/types'
import { ArtWindow } from '@/os/content/ArtWindow'
import { ContactWindow } from '@/os/content/ContactWindow'
import { MeWindow } from '@/os/content/MeWindow'
import { ProjectWindow } from '@/os/content/ProjectWindow'
import { ReadmeWindow } from '@/os/content/ReadmeWindow'
import { WorkWindow } from '@/os/content/WorkWindow'

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

/** left-3 + w-24 on the icon list, plus a gutter. */
const ICON_COLUMN_WIDTH = 120
const TASKBAR_HEIGHT = 44

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

  // On mobile every window is already expanded, so WorkWindow's row buttons
  // dispatch an open for something already visible. Harmless, and cheaper than
  // a second code path; revisit only if it confuses anyone.
  if (!isDesktop) {
    return (
      <div className="relative z-10 mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
        <MobileHeader />
        {WINDOWS.map((w) => (
          <div key={w.id} className="h-[min(70vh,520px)]">
            <Window id={w.id} title={t(w.titleKey)} hidden={false} onClose={() => {}} onFocus={() => {}}>
              {bodyFor(w.id, openWindow)}
            </Window>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative z-10 h-screen overflow-hidden">
      <ul className="absolute left-3 top-3 z-[5] flex w-24 flex-col gap-1">
        {DESKTOP_ICON_IDS.map((id) => {
          const def = WINDOWS.find((w) => w.id === id)
          if (!def) return null
          return (
            <li key={id}>
              <Playable id={`icon-${id}`} caps={['move']}>
                <DesktopIcon
                  id={id}
                  label={t(def.titleKey)}
                  glyph={def.glyph}
                  iconSrc={def.iconSrc}
                  onOpen={() => openWindow(id)}
                />
              </Playable>
            </li>
          )
        })}
      </ul>

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
            <Playable id={`win-${w.id}`} caps={['move']}>
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

      <div data-taskbar>
        <Taskbar open={state.open} minimized={state.minimized} onSelect={selectTask} />
      </div>
    </div>
  )
}

function MobileHeader() {
  const { lang, setLang } = useI18n()
  return (
    <header className="flex items-center justify-between">
      <span className="font-mono text-sm tracking-widest text-brand-300">WILDEAX OS</span>
      <button
        type="button"
        aria-label="Switch language"
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-300"
      >
        {lang === 'en' ? 'ES' : 'EN'}
      </button>
    </header>
  )
}
