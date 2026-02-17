import { useEffect, useState } from 'react'
import arenaLogo from '@/assets/img/arena/logo x512.png'
import { useI18n } from '@/i18n'
import ScrambledText from '@/reactbits/ScrambledText'

interface LatestRelease {
  version: string
  releaseDate: string
}

const ArenaAssistant = () => {
  const { t, version } = useI18n()
  const [release, setRelease] = useState<LatestRelease | null>(null)

  useEffect(() => {
    const fetchLatestRelease = async () => {
      try {
        const response = await fetch('/api/arena-release')
        const text = await response.text()
        // Parse simple YAML format
        const versionMatch = text.match(/^version:\s*(.+)$/m)
        const dateMatch = text.match(/^releaseDate:\s*'?(.+?)'?$/m)
        
        if (versionMatch) {
          setRelease({
            version: versionMatch[1].trim(),
            releaseDate: dateMatch?.[1]?.trim() || ''
          })
        }
      } catch (error) {
        console.error('Failed to fetch latest release:', error)
      }
    }
    fetchLatestRelease()
  }, [])

  // Download via proxy endpoint that redirects to server
  const downloadUrl = '/api/arena-download'

  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Local sub‑nav */}
      <header className="sticky top-0 z-20 border-b border-gray-700/60 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/70 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-12 sm:h-14 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
            <span className="inline-block">←</span>
            <ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.back')}</ScrambledText>
          </a>
          <div className="flex items-center gap-3">
            {release && (
              <span className="text-xs text-gray-400 font-mono">v{release.version}</span>
            )}
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center rounded-md bg-sky-600/90 hover:bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              <ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.nav.download')}</ScrambledText>
            </a>
          </div>
        </div>
      </header>
      {/* Local gradient accents matching app palette */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-gradient-to-br from-sky-700/30 via-blue-600/20 to-indigo-700/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-tl from-fuchsia-700/25 via-purple-700/15 to-sky-700/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(2,132,199,0.08),transparent_60%)]" />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-sky-600/30 blur-2xl scale-110" />
            <div className="rounded-full p-1 bg-gradient-to-br from-yellow-600/60 via-sky-700/60 to-indigo-700/60 ring-1 ring-black/40 shadow-[0_0_40px_rgba(2,132,199,0.25)]">
              <img src={arenaLogo} alt={`${t('nav.arena')} logo`} className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full bg-gray-900" />
            </div>
          </div>
          <ScrambledText className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight" duration={0.4} speed={0.7} triggerKey={version}>{t('arena.title')}</ScrambledText>
          <ScrambledText className="mt-4 text-gray-300 max-w-2xl" duration={0.4} speed={0.7} triggerKey={version}>{t('arena.tagline')}</ScrambledText>

          <div id="download" className="mt-8 flex flex-col items-center">
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 font-semibold shadow-lg shadow-sky-900/30 hover:from-sky-500 hover:to-indigo-500 transition-colors"
            >
              <ScrambledText as="span" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.download')}</ScrambledText>
              {release && <span className="ml-2 text-sky-200 text-sm">v{release.version}</span>}
            </a>
            <ScrambledText className="mt-2 text-xs text-gray-400" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.note')}</ScrambledText>
          </div>
        </div>

        {/* Feature cards */}
        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-gray-800/80 border border-gray-700/80 p-6 backdrop-blur supports-[backdrop-filter]:bg-gray-800/60">
            <ScrambledText className="font-semibold text-gray-100" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.card1.title')}</ScrambledText>
            <ScrambledText className="mt-2 text-sm text-gray-300" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.card1.desc')}</ScrambledText>
          </div>
          <div className="rounded-xl bg-gray-800/80 border border-gray-700/80 p-6 backdrop-blur supports-[backdrop-filter]:bg-gray-800/60">
            <ScrambledText className="font-semibold text-gray-100" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.card2.title')}</ScrambledText>
            <ScrambledText className="mt-2 text-sm text-gray-300" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.card2.desc')}</ScrambledText>
          </div>
          <div className="rounded-xl bg-gray-800/80 border border-gray-700/80 p-6 backdrop-blur supports-[backdrop-filter]:bg-gray-800/60">
            <ScrambledText className="font-semibold text-gray-100" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.card3.title')}</ScrambledText>
            <ScrambledText className="mt-2 text-sm text-gray-300" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.card3.desc')}</ScrambledText>
          </div>
          <div className="rounded-xl bg-gray-800/80 border border-gray-700/80 p-6 backdrop-blur supports-[backdrop-filter]:bg-gray-800/60">
            <ScrambledText className="font-semibold text-gray-100" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.card4.title')}</ScrambledText>
            <ScrambledText className="mt-2 text-sm text-gray-300" duration={0.35} speed={0.7} triggerKey={version}>{t('arena.card4.desc')}</ScrambledText>
          </div>
        </section>
      </main>
    </div>
  )
}

export default ArenaAssistant
