/* eslint-disable react-refresh/only-export-components --
 * This file deliberately exports both components (PlayRoot, Playable) and hooks
 * (usePresence, useSharedList). Splitting them would mean two files importing
 * playhtml, which is the one thing this seam exists to prevent. The cost is
 * losing Fast Refresh for this file during development, which is worth it.
 */
import { Component, useEffect, useRef } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { PlayProvider, usePageData, usePlayContext, useUsers, withSharedState } from '@playhtml/react'
import { PlayableSurface } from '@/play/PlayableSurface'
import { ROOM } from '@/play/room'
import { IDENTITY_TRANSFORM } from '@/play/types'
import type { Capability, Transform } from '@/play/types'

// This file is the ONLY module permitted to import playhtml. Swapping the
// backend for a self-hosted PartyKit server (initOptions.host) or a Cloudflare
// Durable Object means rewriting this file and nothing else. An ESLint rule
// enforces it.

export interface PlayableProps {
  id: string
  caps: readonly Capability[]
  children: ReactNode
  /** Forwarded to PlayableSurface: restrict drag starts to this selector. */
  handle?: string
  /**
   * Bump to reset the shared transform to identity, for everyone. The
   * desktop's Refresh uses it to put icons back where they were authored.
   */
  resetSignal?: number
}

interface PlayableBodyProps {
  data: Transform
  setData: (t: Transform) => void
  caps: readonly Capability[]
  handle?: string
  resetSignal?: number
  children: ReactNode
}

/**
 * The rendered half of a shared Playable. A component rather than an inline
 * render function so the reset effect is an ordinary hook.
 */
function PlayableBody({ data, setData, caps, handle, resetSignal, children }: PlayableBodyProps) {
  const seen = useRef(resetSignal)
  useEffect(() => {
    if (resetSignal === undefined || resetSignal === seen.current) return
    seen.current = resetSignal
    setData(IDENTITY_TRANSFORM)
  }, [resetSignal, setData])

  return (
    <PlayableSurface caps={caps} transform={data} onTransform={setData} handle={handle}>
      {children}
    </PlayableSurface>
  )
}

/**
 * Drag is ours rather than playhtml's CanMoveElement. CanMoveElement has bounds
 * support, but its drag starts on mousedown/touchstart immediately with
 * preventDefault and has no click threshold or touch long-press. On a page
 * where every element is movable, that means links fight drags and a phone
 * cannot scroll.
 */
const SharedPlayable = withSharedState(
  (props: PlayableProps) => ({ defaultData: IDENTITY_TRANSFORM, id: props.id }),
  ({ data, setData }: { data: Transform; setData: (t: Transform) => void }, props: PlayableProps) => (
    <PlayableBody
      data={data}
      setData={setData}
      caps={props.caps}
      handle={props.handle}
      resetSignal={props.resetSignal}
    >
      {/* playhtml's HOC walks the REACT ELEMENT TREE it is handed, not rendered
          DOM, for the first host element to clone its id and ref onto. It has
          to be right here in the HOC's own JSX: hidden inside PlayableBody's
          render it is invisible to that walk, which then recurses into the
          child component (DesktopIcon) and clobbers its id. The test "keeps
          each desktop icon id intact" is what caught that. */}
      <div data-play-anchor>{props.children}</div>
    </PlayableBody>
  ),
)

/**
 * The play layer is strictly additive. If playhtml fails to initialise, the
 * page renders its authored layout with no spinner, no banner and no thrown
 * error. The toy degrades; the portfolio does not.
 */
class PlayBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[play] disabled, rendering static layout', error, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function Playable({ id, caps, children, handle, resetSignal }: PlayableProps) {
  return (
    <PlayBoundary
      fallback={
        <PlayableSurface caps={[]} transform={IDENTITY_TRANSFORM} onTransform={() => {}}>
          {children}
        </PlayableSurface>
      }
    >
      <SharedPlayable id={id} caps={caps} handle={handle} resetSignal={resetSignal}>
        {children}
      </SharedPlayable>
    </PlayBoundary>
  )
}

export function PlayRoot({ children, pathname }: { children: ReactNode; pathname: string }) {
  // Other people's cursors are ambient motion the visitor did not ask for.
  // Dragging still works under reduced motion, because that is user-initiated.
  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <PlayBoundary fallback={children}>
      <PlayProvider
        pathname={pathname}
        initOptions={{
          room: ROOM,
          // ROOM namespaces the persisted data. The cursor room is a separate
          // enum ("page" | "domain" | "section"); "domain" shows cursors across
          // the whole site. Cursors are ephemeral, so a ROOM bump does not need
          // to touch them.
          cursors: { enabled: !reducedMotion, room: 'domain', container: '#play-cursors' },
        }}
      >
        {children}
      </PlayProvider>
    </PlayBoundary>
  )
}

export function usePresence(): { count: number; myColor: string | undefined } {
  const ctx = usePlayContext()
  const users = useUsers()

  if (ctx.isProviderMissing) return { count: 0, myColor: undefined }
  return {
    count: users.length,
    myColor: ctx.getMyPlayerIdentity()?.playerStyle?.colorPalette?.[0],
  }
}

/**
 * Shared state for one named collection, for callers that are not a Playable.
 * Wraps playhtml's usePageData so StickerLayer does not import playhtml.
 */
export function useSharedList<T>(name: string, initial: T[]) {
  return usePageData<T[]>(name, initial)
}
