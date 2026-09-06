import { useEffect, useState } from 'react'
import { PlayableSurface } from '@/play/PlayableSurface'
import { useSharedList } from '@/play/sync'
import { addSticker, STICKER_KINDS } from '@/play/stickers'
import type { PlacedSticker, StickerKind } from '@/play/stickers'
import { useIsDesktop } from '@/os/useIsDesktop'
import { useI18n } from '@/i18n'

const EMPTY: PlacedSticker[] = []

function renderKind(kind: StickerKind) {
  return 'glyph' in kind ? (
    <span className="text-3xl leading-none">{kind.glyph}</span>
  ) : (
    <img src={kind.src} alt="" className="h-8 w-8 object-contain" />
  )
}

function kindById(id: string): StickerKind | undefined {
  return STICKER_KINDS.find((k) => k.id === id)
}

export function StickerLayer() {
  const isDesktop = useIsDesktop()
  // Remount the subscription on rotation/resizing: a list from the previous
  // layout must never be written into the new layout's collection.
  return <StickerScene key={isDesktop ? 'desktop' : 'mobile'} isDesktop={isDesktop} />
}

function StickerScene({ isDesktop }: { isDesktop: boolean }) {
  const { t } = useI18n()
  // Keep the existing desktop collection. Old out-of-bounds placements are
  // clipped, not deleted; phones start with an independent shared canvas.
  const [stickers, setStickers] = useSharedList<PlacedSticker>(isDesktop ? 'wildeax-stickers' : 'wildeax-stickers-mobile', EMPTY)
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [erasing, setErasing] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelected(null); setErasing(false); setOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const placed = Array.isArray(stickers) ? stickers : EMPTY

  return (
    <>
      {/* Mobile stickers use document coordinates; desktop uses its viewport.
          Neither layer may enlarge the page, including legacy remote data. */}
      <div data-sticker-layer data-sticker-scope={isDesktop ? 'desktop' : 'mobile'}
        className={`pointer-events-none inset-0 z-30 overflow-clip ${isDesktop ? 'fixed' : 'absolute'}`}
        aria-hidden={erasing ? undefined : true}>
        {placed.map((s) => {
          const kind = kindById(s.kind)
          if (!kind) return null
          // Each sticker is a PlayableSurface at the layer origin with its
          // position carried in the transform, so it gets the same click
          // threshold, long-press and bounds clamp as a window. Moves write
          // straight back into the shared list. Replacing the whole array per
          // pointer move is chatty but fine at the 300 cap.
          return (
            <div key={s.id} data-sticker={s.id} data-sticker-kind={s.kind} className="pointer-events-auto absolute left-0 top-0"
              role={erasing ? 'button' : undefined}
              tabIndex={erasing ? 0 : undefined}
              aria-label={erasing ? `${t('os.play.erase')}: ${kind.label}` : undefined}
              onClick={erasing ? () => setStickers(placed.filter((sticker) => sticker.id !== s.id)) : undefined}
              onKeyDown={erasing ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setStickers(placed.filter((sticker) => sticker.id !== s.id))
                }
              } : undefined}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setStickers(placed.filter((sticker) => sticker.id !== s.id))
              }}>
              <PlayableSurface
                caps={erasing ? [] : ['move']}
                transform={{ x: s.x, y: s.y, rotation: s.rotation, scale: s.scale }}
                onTransform={(next) =>
                  setStickers(placed.map((p) => (p.id === s.id ? { ...p, x: next.x, y: next.y } : p)))
                }
              >
                {renderKind(kind)}
              </PlayableSurface>
            </div>
          )
        })}
      </div>

      {/* Placement surface, live only while a sticker is selected, so it never
          intercepts a click meant for the site itself. */}
      {selected && (
        <button
          type="button"
          className="fixed inset-0 z-20 cursor-crosshair"
          aria-label="Place sticker"
          onClick={(e) => {
            if (!kindById(selected)) return
            setStickers(
              addSticker(placed, {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                kind: selected,
                x: Math.max(8, Math.min(window.innerWidth - 40, e.clientX - 16)),
                y: Math.max(8, Math.min((isDesktop ? window.innerHeight : document.documentElement.scrollHeight) - 40,
                  e.clientY + (isDesktop ? 0 : window.scrollY) - 16)),
                rotation: Math.round((Math.random() - 0.5) * 40),
                scale: 1,
                placedAt: Date.now(),
              }),
            )
            setSelected(null)
          }}
        />
      )}

      <div className={isDesktop ? 'contents' : 'mobile-play-tools'} data-mobile-tools={!isDesktop ? true : undefined}>
      <div className={isDesktop ? 'contents' : 'mobile-sticker-picker'}
        style={!isDesktop && !open ? { display: 'none' } : undefined} id="play-panel">
      <div data-sticker-dock className={isDesktop ? 'fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 flex-wrap justify-center gap-1 rounded-2xl border border-white/10 bg-black/60 p-2 backdrop-blur' : 'mobile-sticker-strip'}>
        {STICKER_KINDS.map((kind) => (
          <button
            key={kind.id}
            type="button"
            title={kind.label}
            aria-label={kind.label}
            aria-pressed={selected === kind.id}
            onClick={() => { setSelected(selected === kind.id ? null : kind.id); setErasing(false); if (!isDesktop) setOpen(false) }}
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
              selected === kind.id ? 'bg-brand-400/30 ring-2 ring-brand-400' : 'hover:bg-white/10'
            }`}
          >
            {renderKind(kind)}
          </button>
        ))}
      {!isDesktop && <button type="button" className="min-h-11 rounded-xl border border-white/15 px-3 text-xs"
        onClick={() => { setErasing(true); setSelected(null); setOpen(false) }}>{t('os.play.erase')}</button>}
      </div>
      </div>

      {!isDesktop && (selected || erasing) && (
        <div className="phone-placement-message flex items-center gap-3 p-2 pl-3">
          <p role="status" className="text-xs leading-relaxed">{t(erasing ? 'os.play.erasing' : 'os.play.placing')}</p>
          <button type="button" className="min-h-11 shrink-0 rounded-xl border border-white/20 px-3 text-sm"
            onClick={() => { setSelected(null); setErasing(false) }}>{t(erasing ? 'os.play.done' : 'os.play.cancel')}</button>
        </div>
      )}
      {!isDesktop && <div className="mobile-play-row">
        <button type="button" className="phone-tool" aria-label={t('os.play.open')}
          aria-expanded={open} aria-controls="play-panel" onClick={() => { setSelected(null); setErasing(false); setOpen(!open) }}>
          <span aria-hidden="true" className="text-xl">✦</span><span>{t('os.play.open')}</span>
        </button>
        {/* This dock stays visible while the sticker strip opens and closes. */}
        <div data-wcat-controls className="contents" />
      </div>}
      </div>
    </>
  )
}
