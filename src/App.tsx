// no default React import needed in React 17+ JSX runtime
import { lazy, Suspense } from 'react'
import { Navbar, Hero, Features, About, Contact, Footer } from '@/components'
import { Routes, Route, useLocation } from 'react-router-dom'
import Aurora from '@/reactbits/Aurora'
import { PlayRoot } from '@/play'
import { StickerLayer } from '@/play/StickerLayer'
import { PresenceBadge } from '@/components/PresenceBadge'

// Split out so `three` (AsciiCanvasText, used only by NotFound) and
// `react-icons` (used only by Links) leave the main chunk. Both were being
// downloaded by every visitor to the home page.
const Links = lazy(() => import('@/pages/Links'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function App() {
  const { pathname } = useLocation()
  return (
    <PlayRoot pathname={pathname}>
      <div className="min-h-screen bg-[#0b0e12] text-zinc-200 antialiased overflow-x-hidden relative">
        {/* Background layers (now inside stacking context and visible) */}
        <div className="pointer-events-none fixed inset-0 z-0">
          {/* Aurora WebGL */}
          <div className="absolute inset-0 opacity-80">
            <Aurora colorStops={["#0ea5e9", "#7c3aed", "#0ea5e9"]} amplitude={1.3} blend={0.7} />
          </div>
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-grid [background-size:24px_24px] opacity-[0.05]" />
        </div>


        <Navbar>
          {/* Hide theme toggle for now */}
        </Navbar>

        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={
              <main>
                <Hero />
                <Features />
                <About />
                <Contact />
              </main>
            } />
            <Route path="/links" element={
              <div className="relative z-10">
                <Links />
              </div>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        <Footer />
        <StickerLayer />
        <PresenceBadge />
      </div>
    </PlayRoot>
  )
}

export default App
