import type { WindowId } from '@/os/types'

export interface DesktopIconProps {
  id: WindowId
  label: string
  glyph: string
  iconSrc?: string
  /** Inside the rubber-band selection. Visual only, per visitor. */
  selected?: boolean
  /** Bump to replay the entrance animation. Refresh uses it. */
  pop?: number
  onOpen: () => void
}

export function DesktopIcon({ id, label, glyph, iconSrc, selected = false, pop = 0, onOpen }: DesktopIconProps) {
  return (
    <button
      type="button"
      data-icon={id}
      data-selected={selected || undefined}
      onClick={onOpen}
      className={`group flex w-20 flex-col items-center gap-1 rounded p-2 text-center transition hover:bg-brand-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
        selected ? 'bg-brand-400/20 ring-1 ring-brand-400/60' : ''
      }`}
    >
      {/* Keyed on pop: a new key remounts the span and the CSS animation plays
          again, with no state and nothing to clean up. */}
      <span
        key={pop}
        aria-hidden="true"
        className="os-pop grid h-11 w-11 place-items-center transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-110 group-active:scale-95"
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt=""
            className="h-11 w-11 rounded-lg border border-white/10 object-cover shadow-[0_0_12px_rgba(34,211,238,0.25)]"
          />
        ) : (
          <span className="text-3xl leading-none drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">{glyph}</span>
        )}
      </span>
      <span className="font-mono text-[11px] leading-tight text-zinc-300">{label}</span>
    </button>
  )
}
