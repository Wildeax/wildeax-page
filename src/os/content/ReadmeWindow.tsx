import { useI18n } from '@/i18n'

export function ReadmeWindow() {
  const { t } = useI18n()
  return (
    <div className="space-y-3 font-mono text-[13px] leading-relaxed">
      <p className="text-brand-200">{t('os.readme.p1')}</p>
      <p>{t('os.readme.p2')}</p>
      <p className="text-zinc-400">{t('os.readme.p3')}</p>
    </div>
  )
}
