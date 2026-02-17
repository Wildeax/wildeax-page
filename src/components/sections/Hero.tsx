import SpotlightCard from '@/reactbits/SpotlightCard'
import TextPressure from '@/reactbits/TextPressure'
import { useI18n } from '@/i18n'
import ScrambledText from '@/reactbits/ScrambledText'

const Hero = () => {
  const { t, version } = useI18n()
  return (
    <section id="home" className="relative py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10 md:gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
            <ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('hero.badge')}</ScrambledText>
          </div>
          <div className="relative mt-6 h-[96px] sm:h-[120px] md:h-[180px] z-50 overflow-hidden">
            <TextPressure
              text="Wildeax"
              className="w-full"
              textColor="#e6fbff"
              stroke={false}
              scale={false}
              minFontSize={36}
              flex={false}
              width={false}
              italic={false}
              weight={true}
              alpha={false}
            />
          </div>
          <ScrambledText className="mt-4 text-zinc-400 max-w-xl leading-relaxed" duration={0.4} speed={0.7} triggerKey={version}>
            {t('hero.tagline')}
          </ScrambledText>

          <div className="mt-6 sm:mt-8 flex flex-wrap gap-3">
            <a
              role="button"
              aria-disabled="true"
              title={t('contact.comingSoon')}
              className="inline-flex items-center justify-center rounded-lg bg-white/10 text-zinc-300 px-5 py-3 font-semibold cursor-not-allowed pointer-events-none"
            >
              <ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('hero.btn.start')}</ScrambledText>
            </a>
            <a
              role="button"
              aria-disabled="true"
              title={t('contact.comingSoon')}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-semibold text-zinc-400 cursor-not-allowed pointer-events-none"
            >
              <ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('hero.btn.explore')}</ScrambledText>
            </a>
          </div>
        </div>

        <div className="relative mt-8 md:mt-0">
          <SpotlightCard>
            <ScrambledText as="h3" className="text-lg font-semibold text-zinc-100" duration={0.35} speed={0.7} triggerKey={version}>{t('ethos.title')}</ScrambledText>
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              <ScrambledText duration={0.35} speed={0.7} triggerKey={version}>{t('ethos.point1')}</ScrambledText>
              <ScrambledText duration={0.35} speed={0.7} triggerKey={version}>{t('ethos.point2')}</ScrambledText>
              <ScrambledText duration={0.35} speed={0.7} triggerKey={version}>{t('ethos.point3')}</ScrambledText>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  )
}

export default Hero
