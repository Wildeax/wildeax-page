import type { KeyboardEvent, ReactNode } from 'react'
import type { WindowId } from '@/os/types'

export interface WindowProps {
  id: WindowId
  title: string
  zIndex: number
  /** Closed windows stay mounted and hidden so crawlers still read them. */
  hidden: boolean
  onClose: () => void
  onFocus: () => void
  children: ReactNode
}

export function Window({ id, title, zIndex, hidden, onClose, onFocus, children }: WindowProps) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      role="dialog"
      aria-label={title}
      data-window={id}
      hidden={hidden}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onMouseDown={onFocus}
      style={{ zIndex: hidden ? undefined : zIndex }}
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-brand-400/30 bg-[#0b0e12]/95 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_48px_rgba(0,0,0,0.6)] backdrop-blur"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-brand-400/25 bg-gradient-to-r from-brand-400/15 to-violet-500/15 px-3 py-1.5">
        <span className="truncate font-mono text-xs tracking-wide text-brand-200">{title}</span>
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
          className="grid h-5 w-5 shrink-0 place-items-center rounded border border-white/15 text-xs text-zinc-300 transition hover:bg-red-500/70 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm text-zinc-300">{children}</div>
    </div>
  )
}
