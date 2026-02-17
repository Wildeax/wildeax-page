import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'

interface BlobCursorProps {
  color?: string
  size?: number
  intensity?: number
  blur?: number
}

const BlobCursor = ({ color = '#06b6d4', size = 220, intensity = 0.18, blur = 24 }: BlobCursorProps) => {
  const mouseX = useMotionValue(-9999)
  const mouseY = useMotionValue(-9999)

  const x = useSpring(mouseX, { stiffness: 120, damping: 18, mass: 0.4 })
  const y = useSpring(mouseY, { stiffness: 120, damping: 18, mass: 0.4 })

  const scale = useSpring(1, { stiffness: 200, damping: 20 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - size / 2)
      mouseY.set(e.clientY - size / 2)
    }
    const onDown = () => scale.set(0.92)
    const onUp = () => scale.set(1)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
    }
  }, [mouseX, mouseY, scale, size])

  const bg = useTransform(scale, (s) => {
    const alpha = Math.min(0.6, intensity * s)
    return `radial-gradient(circle at 50% 50%, ${hexToRgba(color, alpha)}, rgba(0,0,0,0) 60%)`
  })

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 mix-blend-screen"
      style={{
        x,
        y,
        width: size,
        height: size,
        borderRadius: size,
        filter: `blur(${blur}px)`,
        background: bg as unknown as string,
      }}
    />
  )
}

function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default BlobCursor
