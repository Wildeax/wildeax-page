// no default React import needed in React 17+ JSX runtime
import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Aurora from '@/reactbits/Aurora'
import { PlayRoot } from '@/play'
import { StickerLayer } from '@/play/StickerLayer'
import { Desktop } from '@/os/Desktop'
import { useIsDesktop } from '@/os/useIsDesktop'
import { useMediaQuery } from '@/os/useMediaQuery'

// Split out so `three` (AsciiCanvasText, used only by NotFound) and
// `react-icons` (used only by Links) leave the main chunk.
const Links = lazy(() => import('@/pages/Links'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function App() {
  const { pathname } = useLocation()
  const isDesktop = useIsDesktop()
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return (
    <PlayRoot pathname={pathname}>
      <div className={`relative min-h-screen bg-[#0b0e12] text-zinc-200 antialiased ${isDesktop && pathname === '/' ? 'h-dvh overflow-clip' : ''}`}>
        {/* Wallpaper */}
        <div className="pointer-events-none fixed inset-0 z-0">
          {!isDesktop || reduced ? (
            // Phones keep the colors without a continuous WebGL animation.
            <div data-static-wallpaper className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(14,165,233,0.35),transparent),radial-gradient(60%_60%_at_80%_90%,rgba(124,58,237,0.3),transparent)]" />
          ) : (
            <div className="absolute inset-0 opacity-80">
              <Aurora colorStops={['#0ea5e9', '#7c3aed', '#0ea5e9']} amplitude={1.3} blend={0.7} />
            </div>
          )}
          <div className="absolute inset-0 bg-grid [background-size:24px_24px] opacity-[0.05]" />
          {/* Scanlines */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)',
            }}
          />
        </div>

        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Desktop />} />
            <Route
              path="/links"
              element={
                <div className="relative z-10">
                  <Links />
                </div>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        <StickerLayer />
        {/* Remote document coordinates can exceed a phone's width. Clip the
            cursor layer so those cursors never enlarge its layout viewport. */}
        <div id="play-cursors" aria-hidden="true" className="pointer-events-none absolute inset-0 z-[70] overflow-hidden" />
      </div>
    </PlayRoot>
  )
}

export default App
