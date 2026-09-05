import { useI18n } from '@/i18n'
import { Scramble } from '@/os/Scramble'

/**
 * Each paragraph decodes on mount and again on language switch, since the
 * translated text changes and Scramble replays on a new `text`.
 */
export function ReadmeWindow() {
  const { t } = useI18n()
  return (
    <div className="space-y-3 font-mono text-[13px] leading-relaxed">
      <Scramble className="text-brand-200" text={t('os.readme.p1')} duration={550} />
      <Scramble text={t('os.readme.p2')} duration={800} />
      <Scramble className="text-zinc-400" text={t('os.readme.p3')} duration={550} />
    </div>
  )
}
