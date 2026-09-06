import { useI18n } from '@/i18n'
import portrait from '@/assets/img/wildeax portrait2.jpg'

export function MeWindow() {
  const { t } = useI18n()
  return (
    <figure className="space-y-2">
      <img
        src={portrait}
        alt="Wildeax"
        loading="lazy"
        className="w-full rounded border border-white/10 object-cover"
      />
      <figcaption className="font-mono text-[11px] text-zinc-500">{t('os.me.caption')}</figcaption>
    </figure>
  )
}
