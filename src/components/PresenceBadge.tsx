import { usePresence } from '@/play'

/**
 * Renders nothing when alone. A badge reading "1 here" tells a visitor the
 * shared thing is dead, which is worse than saying nothing.
 */
export function PresenceBadge() {
  const { count } = usePresence()
  if (count < 2) return null

  return (
    <div className="fixed right-4 top-20 z-40 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
      {count} here now
    </div>
  )
}
