import { useI18n } from '@/i18n'
import { useLocation } from 'react-router-dom'
import ScrambledText from '@/reactbits/ScrambledText'

const Footer = () => {
  const { t, version } = useI18n()
  const location = useLocation()
  const isLinksPage = location.pathname === '/links'
  const footerClass = isLinksPage
    ? 'relative py-6 md:py-8'
    : 'relative py-8 md:py-10 border-t border-white/5'
  return (
    <footer className={footerClass}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        <p className="text-sm text-zinc-400">© {new Date().getFullYear()} Wildeax. <ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('footer.rights')}</ScrambledText>.</p>
        {isLinksPage ? null : (
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-sm">
            <a className="text-zinc-400 hover:text-zinc-200" href="#about"><ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('footer.about')}</ScrambledText></a>
            <a className="text-zinc-400 hover:text-zinc-200" href="#features"><ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('footer.features')}</ScrambledText></a>
            <a className="text-zinc-400 hover:text-zinc-200" href="#contact"><ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('footer.contact')}</ScrambledText></a>
            <a className="text-zinc-400 hover:text-zinc-200" href="mailto:projects@wildeax.com"><ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('footer.email')}</ScrambledText></a>
            <a className="text-zinc-400 hover:text-zinc-200" href="https://www.linkedin.com/in/wildeax/" target="_blank" rel="noreferrer"><ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('footer.linkedin')}</ScrambledText></a>
            <a className="text-zinc-400 hover:text-zinc-200" href="https://x.com/Wildeax_" target="_blank" rel="noreferrer"><ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('footer.x')}</ScrambledText></a>
          </div>
        )}
      </div>
    </footer>
  )
}

export default Footer
