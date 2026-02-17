import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import arenaIcon from '@/assets/img/arena/logo-icon x512.png'
import swIcon from '@/assets/img/sw/SW white transperent.png'
import minesweeperIcon from '@/assets/img/minesweeper/minesweeper_icon.png'
import ScrambledText from '@/reactbits/ScrambledText'
import { featureFlags } from '@/config/featureFlags'

interface NavbarProps {
  children?: React.ReactNode
}

const Navbar = ({ children }: NavbarProps) => {
  const { lang, setLang, t, version } = useI18n()
  return (
    <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-black/30 border-b border-white/5 pt-[env(safe-area-inset-top)]">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between">
        <Link to="/" className="group inline-flex items-center gap-2">
          <span className="relative inline-grid">
            <span className="absolute inset-0 rounded-md bg-gradient-to-br from-brand-400/30 to-violet-500/30 blur-xl group-hover:blur-2xl transition-all"></span>
            <span className="relative rounded-md bg-gradient-to-br from-brand-400 to-violet-500 bg-clip-text text-transparent font-extrabold text-lg sm:text-xl">Wildeax</span>
          </span>
          <ScrambledText as="span" className="ml-2 hidden sm:inline text-xs text-zinc-400 tracking-wide" duration={0.35} speed={0.7} triggerKey={version}>{t('nav.tagline')}</ScrambledText>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/links" title="Links" className="hidden sm:inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-xs text-zinc-300 hover:bg-white/10">
            Links
          </Link>
          <a href="https://splitwars.com/" target="_blank" rel="noreferrer" title={t('nav.splitwars')}>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <img src={swIcon} alt={t('nav.splitwars')} className="h-5 w-5" />
            </span>
          </a>
          <a href="https://minesweeper.wildeax.com/" target="_blank" rel="noreferrer" title={t('nav.minesweeper')}>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <img src={minesweeperIcon} alt={t('nav.minesweeper')} className="h-5 w-5" />
            </span>
          </a>
          {featureFlags.showArenaAssistantLink ? (
            <a href="https://arena-assistant.com" target="_blank" rel="noreferrer" title={t('nav.arena')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <img src={arenaIcon} alt={t('nav.arena')} className="h-5 w-5" />
            </a>
          ) : null}
          <div className="ml-3 pl-3 border-l border-white/10">
            <button
              aria-label="Switch language"
              className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-zinc-300 hover:bg-white/10"
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
          {children}
        </div>
      </nav>
    </header>
  )
}

export default Navbar
