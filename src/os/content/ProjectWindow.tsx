import { useI18n } from '@/i18n'
import type { Project } from '@/os/projects'
import { windowById } from '@/os/registry'

export interface ProjectWindowProps {
  project: Project
}

export function ProjectWindow({ project }: ProjectWindowProps) {
  const { t } = useI18n()
  const def = windowById(project.id)
  const host = project.href ? new URL(project.href).host : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-brand-400/25 bg-white/5 shadow-[0_0_18px_rgba(34,211,238,0.18)]">
          {def.iconSrc ? (
            <img src={def.iconSrc} alt="" className="h-11 w-11 object-contain" />
          ) : (
            <span aria-hidden="true" className="text-3xl leading-none">
              {def.glyph}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-mono text-sm text-brand-200">{t(project.nameKey)}</h2>
          {host && <p className="truncate font-mono text-[11px] text-zinc-500">{host}</p>}
        </div>
      </div>

      <p className="text-[13px] leading-relaxed">{t(project.descKey)}</p>

      <div className="space-y-1.5">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{t('os.project.stackLabel')}</h3>
        {/* One image for the whole stack, from the same source the GitHub
            profile uses. The text stays as alt and tooltip, so the icons are
            never the only copy of the information. */}
        <img
          src={`https://skillicons.dev/icons?i=${project.stackIcons}&theme=dark`}
          alt={t(project.stackKey)}
          title={t(project.stackKey)}
          loading="lazy"
          className="h-9 max-w-full object-contain object-left"
        />
      </div>

      {project.href && (
        <a
          href={project.href}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded border border-brand-400/40 bg-brand-400/10 px-3 py-1.5 font-mono text-[11px] text-brand-200 transition hover:bg-brand-400/20"
        >
          {t('os.project.visit')} →
        </a>
      )}
    </div>
  )
}
