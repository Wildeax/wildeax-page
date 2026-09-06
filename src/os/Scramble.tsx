import { useEffect, useState } from 'react'

/**
 * Decodes text left to right over `duration` ms, showing random glyphs for the
 * part not yet revealed. Re-runs whenever `text` changes, which is how a
 * language switch replays it.
 *
 * This exists instead of reactbits/ScrambledText because that component pulls
 * gsap, and gsap alone is ~85KB in the main chunk. A requestAnimationFrame
 * loop is all the effect needs.
 */
const GLYPHS = '!<>-_/[]{}=+*^?#░▒▓█'

export interface ScrambleProps {
  text: string
  className?: string
  duration?: number
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function Scramble({ text, className, duration = 650 }: ScrambleProps) {
  // Starts as the real text so the first paint, and any crawler, reads it.
  const [shown, setShown] = useState(text)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(text)
      return
    }
    let raf = 0
    const start = performance.now()
    // Read the clock here rather than trusting the frame timestamp. jsdom's
    // rAF timestamp is on a different clock from performance.now(), which sent
    // progress negative and made slice() and the loop misbehave; browsers agree
    // on the clock but there is no reason to depend on it.
    const tick = () => {
      const progress = Math.max(0, Math.min(1, (performance.now() - start) / duration))
      const revealed = Math.floor(progress * text.length)
      let next = text.slice(0, revealed)
      for (let i = revealed; i < text.length; i++) {
        next += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      }
      setShown(next)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, duration])

  return <p className={className}>{shown}</p>
}
