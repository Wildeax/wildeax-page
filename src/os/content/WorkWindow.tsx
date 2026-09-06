import { useI18n } from '@/i18n'
import { PROJECTS } from '@/os/projects'
import { windowById } from '@/os/registry'
import type { WindowId } from '@/os/types'

export interface WorkWindowProps {
  onOpen: (id: WindowId) => void
}

export function WorkWindow({ onOpen }: WorkWindowProps) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">{t('os.work.heading')}</h2>
      <ul className="space-y-1">
        {PROJECTS.map((p) => {
          const def = windowById(p.id)
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="group flex w-full items-center gap-3 rounded border border-white/5 px-2 py-2 text-left transition hover:border-brand-400/40 hover:bg-brand-400/10"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-white/5 transition-transform group-hover:scale-110">
                  {def.iconSrc ? (
                    <img src={def.iconSrc} alt="" className="h-6 w-6 object-contain" />
                  ) : (
                    <span aria-hidden="true" className="text-lg leading-none">
                      {def.glyph}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-200">{t(p.nameKey)}</span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-zinc-600 transition group-hover:text-brand-300">
                  {t('os.work.open')} →
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
