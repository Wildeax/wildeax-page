import { useI18n } from '@/i18n'
import ScrambledText from '@/reactbits/ScrambledText'

const Contact = () => {
  const { t, version } = useI18n()
  return (
    <section id="contact" className="relative py-16 md:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <ScrambledText className="text-2xl font-bold text-zinc-100" duration={0.35} speed={0.7} triggerKey={version}>{t('contact.title')}</ScrambledText>
        <ScrambledText className="mt-2 text-zinc-400" duration={0.35} speed={0.7} triggerKey={version}>{t('contact.sub')}</ScrambledText>

        <div className="mt-8 space-y-3">
          <a href="mailto:projects@wildeax.com" className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 font-semibold text-zinc-200 transition-colors">
            <ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('contact.email')}</ScrambledText>
          </a>
          <div className="flex items-center justify-center gap-4 text-sm">
            <a className="text-zinc-300 hover:text-zinc-100 underline" href="https://www.linkedin.com/in/wildeax/" target="_blank" rel="noreferrer"><ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('contact.linkedin')}</ScrambledText></a>
            <span className="text-zinc-600">/</span>
            <a className="text-zinc-300 hover:text-zinc-100 underline" href="https://x.com/Wildeax_" target="_blank" rel="noreferrer"><ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('contact.x')}</ScrambledText></a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
