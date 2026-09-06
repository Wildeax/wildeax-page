import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { usePresence } from '@/play'
import { windowById } from '@/os/registry'
import type { WindowId } from '@/os/types'

export interface TaskbarProps {
  open: readonly WindowId[]
  minimized: readonly WindowId[]
  onSelect: (id: WindowId) => void
}

function TaskIcon({ id }: { id: WindowId }) {
  const def = windowById(id)
  return def.iconSrc ? (
    <img src={def.iconSrc} alt="" className="h-4 w-4 rounded-sm object-cover" />
  ) : (
    <span aria-hidden="true">{def.glyph}</span>
  )
}

function Clock() {
  const { lang } = useI18n()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <time
      dateTime={now.toISOString()}
      className="hidden shrink-0 font-mono text-[11px] tabular-nums text-zinc-400 sm:inline"
    >
      {now.toLocaleTimeString(lang === 'es' ? 'es-CO' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
    </time>
  )
}

export function Taskbar({ open, minimized, onSelect }: TaskbarProps) {
  const { t, lang, setLang } = useI18n()
  const { count } = usePresence()

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-11 items-center gap-2 border-t border-brand-400/25 bg-black/70 px-2 backdrop-blur">
      <span className="hidden shrink-0 rounded border border-brand-400/40 bg-brand-400/10 px-3 py-1 font-mono text-xs text-brand-200 sm:inline">
        WILDEAX OS
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {open.map((id) => {
          const isMin = minimized.includes(id)
          return (
            <button
              key={id}
              type="button"
              data-task={id}
              data-minimized={isMin || undefined}
              onClick={() => onSelect(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded border px-2 py-1 font-mono text-[11px] transition hover:bg-white/10 ${
                isMin
                  ? 'border-dashed border-white/15 bg-transparent text-zinc-500'
                  : 'border-white/10 bg-white/5 text-zinc-300'
              }`}
            >
              <TaskIcon id={id} />
              {t(windowById(id).titleKey)}
            </button>
          )
        })}
      </div>

      {/* Hidden below two people: "1 here now" advertises that the shared
          feature is dead, which is worse than saying nothing. */}
      {count >= 2 && (
        <span className="shrink-0 font-mono text-[11px] text-brand-300">
          {count} {t('os.taskbar.here')}
        </span>
      )}

      <Clock />

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
