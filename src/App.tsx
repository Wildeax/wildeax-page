// no default React import needed in React 17+ JSX runtime
import { Navbar, Hero, Features, About, Contact, Footer } from '@/components'
import { Routes, Route } from 'react-router-dom'
import Links from '@/pages/Links'
import BlobCursor from '@/reactbits/BlobCursor'
import Aurora from '@/reactbits/Aurora'
import Particles from '@/reactbits/Particles'
import NotFound from '@/pages/NotFound'

function App() {
  return (
    <div className="min-h-screen bg-[#0b0e12] text-zinc-200 antialiased overflow-x-hidden relative">
      {/* Background layers (now inside stacking context and visible) */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Aurora WebGL */}
        <div className="absolute inset-0 opacity-80">
          <Aurora colorStops={["#0ea5e9", "#7c3aed", "#0ea5e9"]} amplitude={1.3} blend={0.7} />
        </div>
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid [background-size:24px_24px] opacity-[0.05]" />
        {/* Particles */}
        <Particles className="absolute inset-0" particleCount={160} particleSpread={9} speed={0.1} alphaParticles particleBaseSize={110} sizeRandomness={0.8} cameraDistance={26} />
      </div>

      {/* Interactive fluid cursor */}
      <BlobCursor />

      <Navbar>
        {/* Hide theme toggle for now */}
      </Navbar>

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

      <Footer />
    </div>
  )
}

export default App
