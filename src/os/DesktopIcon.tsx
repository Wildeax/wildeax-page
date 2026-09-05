import type { WindowId } from '@/os/types'

export interface DesktopIconProps {
  id: WindowId
  label: string
  glyph: string
  onOpen: () => void
}

export function DesktopIcon({ id, label, glyph, onOpen }: DesktopIconProps) {
  return (
    <button
      type="button"
      data-icon={id}
      onClick={onOpen}
      className="flex w-20 flex-col items-center gap-1 rounded p-2 text-center transition hover:bg-brand-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <span aria-hidden="true" className="text-3xl leading-none drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">
        {glyph}
      </span>
      <span className="font-mono text-[11px] leading-tight text-zinc-300">{label}</span>
    </button>
  )
}
