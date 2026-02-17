import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrambleTextPlugin)

export interface ScrambledTextProps {
  duration?: number
  speed?: number
  scrambleChars?: string
  className?: string
  style?: React.CSSProperties
  triggerKey?: any
  as?: keyof React.JSX.IntrinsicElements
  children: React.ReactNode
}

const ScrambledText: React.FC<ScrambledTextProps> = ({
  duration = 0.5,
  speed = 0.7,
  scrambleChars = '.:',
  className = '',
  style = {},
  triggerKey,
  as = 'div',
  children,
}) => {
  const rootRef = useRef<HTMLElement | null>(null)
  const mountedRef = useRef(false)
  const lastKeyRef = useRef<any>(undefined)

  useEffect(() => {
    // Only animate when triggerKey actually changes after first mount
    if (!mountedRef.current) {
      mountedRef.current = true
      lastKeyRef.current = triggerKey
      return
    }
    if (lastKeyRef.current === triggerKey) return
    lastKeyRef.current = triggerKey
    if (!rootRef.current) return

    gsap.killTweensOf(rootRef.current)
    gsap.to(rootRef.current, {
      duration,
      scrambleText: {
        text: rootRef.current.textContent || '',
        chars: scrambleChars,
        speed,
      } as any,
      ease: 'none',
    } as any)
  }, [triggerKey, duration, speed, scrambleChars])

  const Component = as as any

  return (
    <Component ref={rootRef as any} className={className} style={style}>
      {children}
    </Component>
  )
}

export default ScrambledText
