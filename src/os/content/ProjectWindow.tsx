import { useI18n } from '@/i18n'
import type { Project } from '@/os/projects'

export interface ProjectWindowProps {
  project: Project
}

export function ProjectWindow({ project }: ProjectWindowProps) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed">{t(project.descKey)}</p>

      <div className="space-y-1">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          {t('os.project.stackLabel')}
        </h3>
        <p className="font-mono text-[11px] leading-relaxed text-zinc-400">{t(project.stackKey)}</p>
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
