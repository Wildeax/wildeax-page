import type { KeyboardEvent, ReactNode } from 'react'
import type { WindowId } from '@/os/types'

export interface WindowProps {
  id: WindowId
  title: string
  /** Closed windows stay mounted and hidden so crawlers still read them. */
  hidden: boolean
  onClose: () => void
  onFocus: () => void
  /** Absent on mobile, where windows are always-expanded cards. */
  onMinimize?: () => void
  children: ReactNode
}

export function Window({ id, title, hidden, onClose, onFocus, onMinimize, children }: WindowProps) {
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
      // The hidden attribute alone does not work here. Tailwind preflight's
      // [hidden]{display:none} and the .flex class below have equal specificity
      // and .flex comes later, so it won, and every closed window was drawn.
      // An inline style outranks both.
      style={{ display: hidden ? 'none' : undefined }}
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-brand-400/30 bg-[#0b0e12]/95 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_48px_rgba(0,0,0,0.6)] backdrop-blur"
    >
      {/* The drag handle. Only the title bar moves the window, so text in the
          body can be selected the way it can in any real OS. */}
      <div
        data-drag-handle
        className="flex shrink-0 cursor-grab select-none items-center justify-between gap-2 border-b border-brand-400/25 bg-gradient-to-r from-brand-400/15 to-violet-500/15 px-3 py-1.5 active:cursor-grabbing"
      >
        <span className="truncate font-mono text-xs tracking-wide text-brand-200">{title}</span>
        <div className="flex shrink-0 items-center gap-1">
          {onMinimize && (
            <button
              type="button"
              aria-label={`Minimize ${title}`}
              onClick={onMinimize}
              className="grid h-5 w-5 place-items-center rounded border border-white/15 text-xs leading-none text-zinc-300 transition hover:bg-amber-400/70 hover:text-black"
            >
              –
            </button>
          )}
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="grid h-5 w-5 place-items-center rounded border border-white/15 text-xs leading-none text-zinc-300 transition hover:bg-red-500/70 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto px-4 py-3 text-sm text-zinc-300">{children}</div>
        <div data-wcat-room={id} className="pointer-events-none absolute inset-0 overflow-hidden" />
      </div>
    </div>
  )
}
