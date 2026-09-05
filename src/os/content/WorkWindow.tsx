import { useI18n } from '@/i18n'
import { PROJECTS } from '@/os/projects'
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
        {PROJECTS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className="flex w-full items-center justify-between gap-3 rounded border border-white/5 px-2 py-2 text-left transition hover:border-brand-400/40 hover:bg-brand-400/10"
            >
              <span className="font-mono text-[13px] text-zinc-200">{t(p.nameKey)}</span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                {t('os.work.open')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
