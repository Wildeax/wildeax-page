import { useI18n } from '@/i18n'
import { usePresence } from '@/play'
import { windowById } from '@/os/registry'
import type { WindowId } from '@/os/types'

export interface TaskbarProps {
  open: readonly WindowId[]
  onSelect: (id: WindowId) => void
}

export function Taskbar({ open, onSelect }: TaskbarProps) {
  const { t, lang, setLang } = useI18n()
  const { count } = usePresence()

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-11 items-center gap-2 border-t border-brand-400/25 bg-black/70 px-2 backdrop-blur">
      <span className="hidden shrink-0 rounded border border-brand-400/40 bg-brand-400/10 px-3 py-1 font-mono text-xs text-brand-200 sm:inline">
        WILDEAX OS
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {open.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="flex shrink-0 items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-300 transition hover:bg-white/10"
          >
            <span aria-hidden="true">{windowById(id).glyph}</span>
            {t(windowById(id).titleKey)}
          </button>
        ))}
      </div>

      {/* Hidden below two people: "1 here now" advertises that the shared
          feature is dead, which is worse than saying nothing. */}
      {count >= 2 && (
        <span className="shrink-0 font-mono text-[11px] text-brand-300">
          {count} {t('os.taskbar.here')}
        </span>
      )}

      <button
        type="button"
        aria-label="Switch language"
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-300 transition hover:bg-white/10"
      >
        {lang === 'en' ? 'ES' : 'EN'}
      </button>
    </div>
  )
}
