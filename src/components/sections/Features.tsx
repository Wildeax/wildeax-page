import SpotlightCard from '@/reactbits/SpotlightCard'
import { useI18n } from '@/i18n'
import ScrambledText from '@/reactbits/ScrambledText'

const Features = () => {
  const { t, version } = useI18n()
  const features = [
  {
    title: t('features.generalist.title'),
    desc: t('features.generalist.desc'),
    icon: (
      <svg className="h-5 w-5 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a1 1 0 0 1 1 1v1.1a7 7 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 8a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/>
      </svg>
    )
  },
  {
    title: t('features.graphics.title'),
    desc: t('features.graphics.desc'),
    icon: (
      <svg className="h-5 w-5 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 5h18v4H3zM7 11h10v4H7zM10 17h4v4h-4z"/>
      </svg>
    )
  },
  {
    title: t('features.arch.title'),
    desc: t('features.arch.desc'),
    icon: (
      <svg className="h-5 w-5 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 1 7l11 5 9-4.09V17h2V7L12 2Zm0 7L3.74 6.17 12 2l8.26 4.17L12 9Z"/>
      </svg>
    )
  },
  {
    title: t('features.educator.title'),
    desc: t('features.educator.desc'),
    icon: (
      <svg className="h-5 w-5 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 6h16v4H4zM4 12h10v4H4z"/>
      </svg>
    )
  },
]
  return (
    <section className="relative py-16 md:py-20" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrambledText className="text-2xl font-bold text-zinc-100" duration={0.35} speed={0.7} triggerKey={version}>{t('features.heading')}</ScrambledText>
        <ScrambledText className="mt-2 text-zinc-400" duration={0.35} speed={0.7} triggerKey={version}>{t('features.sub')}</ScrambledText>
        <div className="mt-8 md:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {features.map((f) => (
            <SpotlightCard key={f.title}>
              <div className="flex items-start gap-3">
                {f.icon}
                <div>
                  <ScrambledText as="h3" className="font-semibold text-zinc-100" duration={0.35} speed={0.7} triggerKey={version}>{f.title}</ScrambledText>
                  <ScrambledText as="p" className="mt-1 text-sm text-zinc-400" duration={0.35} speed={0.7} triggerKey={version}>{f.desc}</ScrambledText>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
