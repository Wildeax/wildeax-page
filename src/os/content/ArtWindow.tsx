import { useI18n } from '@/i18n'

/**
 * Placeholder tiles until real artwork lands in src/assets/img/art/. They are
 * visibly placeholders on purpose: a fake-looking gallery is worse than an
 * honest empty one.
 */
const TILE_COUNT = 6

export function ArtWindow() {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">{t('os.art.heading')}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: TILE_COUNT }, (_, i) => (
          <div
            key={i}
            className="grid aspect-square place-items-center rounded border border-dashed border-brand-400/25 bg-brand-400/5 p-1 text-center font-mono text-[10px] leading-tight text-zinc-600"
          >
            {t('os.art.placeholder')}
          </div>
        ))}
      </div>
    </div>
  )
}
