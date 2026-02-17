import SpotlightCard from '@/reactbits/SpotlightCard'
import wildeaxImg from '@/assets/img/wildeax portrait2.jpg'
import { useI18n } from '@/i18n'
import ScrambledText from '@/reactbits/ScrambledText'

const About = () => {
  const { t, version } = useI18n()
  return (
    <section id="about" className="relative py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SpotlightCard>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-center">
            <div className="md:col-span-2">
              <ScrambledText className="text-xl font-bold text-zinc-100" duration={0.35} speed={0.7} triggerKey={version}>{t('about.title')}</ScrambledText>
              <ScrambledText className="mt-3 text-zinc-400" duration={0.35} speed={0.7} triggerKey={version}>{t('about.body')}</ScrambledText>
              <div className="mt-3">
                <ScrambledText as="span" className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200" duration={0.35} speed={0.7} triggerKey={version}>
                  {t('about.badge.ceo')}
                </ScrambledText>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-300">
                <ScrambledText as="span" className="rounded-full border border-white/10 bg-white/5 px-3 py-1" duration={0.35} speed={0.7} triggerKey={version}>{t('about.chip.unity')}</ScrambledText>
                <ScrambledText as="span" className="rounded-full border border-white/10 bg-white/5 px-3 py-1" duration={0.35} speed={0.7} triggerKey={version}>{t('about.chip.shaders')}</ScrambledText>
                <ScrambledText as="span" className="rounded-full border border-white/10 bg-white/5 px-3 py-1" duration={0.35} speed={0.7} triggerKey={version}>{t('about.chip.gameplay')}</ScrambledText>
                <ScrambledText as="span" className="rounded-full border border-white/10 bg-white/5 px-3 py-1" duration={0.35} speed={0.7} triggerKey={version}>{t('about.chip.tools')}</ScrambledText>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 aspect-square overflow-hidden max-w-[320px] md:max-w-none mx-auto">
              <img
                src={wildeaxImg}
                alt="Wildeax portrait"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </SpotlightCard>
      </div>
    </section>
  )
}

export default About
