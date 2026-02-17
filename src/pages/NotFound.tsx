import { Link } from 'react-router-dom'
import AsciiCanvasText from '@/reactbits/AsciiCanvasText'
import ScrambledText from '@/reactbits/ScrambledText'
import { useI18n } from '@/i18n'

export default function NotFound() {
  const { t, version } = useI18n()
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-6 px-4 relative">
      <div className="relative h-[200px] w-full max-w-4xl">
        <AsciiCanvasText text="404" asciiFontSize={8} textFontSize={200} enableWaves={true} />
      </div>
      <ScrambledText className="text-zinc-300 max-w-xl" duration={0.4} speed={0.7} triggerKey={version}>
        {t('notfound.message')}
      </ScrambledText>
      <Link
        to="/"
        className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 font-semibold text-zinc-200 transition-colors"
      >
        {t('notfound.back')}
      </Link>
    </div>
  )
}



