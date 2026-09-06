import { useEffect, useState } from 'react'
import { PlayableSurface } from '@/play/PlayableSurface'
import { useSharedList } from '@/play/sync'
import { addSticker, STICKER_KINDS } from '@/play/stickers'
import type { PlacedSticker, StickerKind } from '@/play/stickers'

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
  const [stickers, setStickers] = useSharedList<PlacedSticker>('wildeax-stickers', EMPTY)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const placed = Array.isArray(stickers) ? stickers : EMPTY

  return (
    <>
      {/* Placed stickers live in DOCUMENT coordinates, so this container is
          absolute inside the page wrapper rather than fixed to the viewport.
          Fixed would pin every sticker to the window and drag them along as
          the page scrolls. aria-hidden because they carry no information a
          screen reader needs, and announcing 300 of them is hostile. */}
      <div className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        {placed.map((s) => {
          const kind = kindById(s.kind)
          if (!kind) return null
          // Each sticker is a PlayableSurface at the layer origin with its
          // position carried in the transform, so it gets the same click
          // threshold, long-press and bounds clamp as a window. Moves write
          // straight back into the shared list. Replacing the whole array per
          // pointer move is chatty but fine at the 300 cap.
          return (
            <div key={s.id} className="pointer-events-auto absolute left-0 top-0">
              <PlayableSurface
                caps={['move']}
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
                // Viewport coords plus scroll offset, because the layer above
                // positions in document space.
                x: e.clientX + window.scrollX - 16,
                y: e.clientY + window.scrollY - 16,
                rotation: Math.round((Math.random() - 0.5) * 40),
                scale: 1,
                placedAt: Date.now(),
              }),
            )
            setSelected(null)
          }}
        />
      )}

      {/* Palette dock. */}
      <div data-sticker-dock className="fixed bottom-16 left-1/2 z-40 flex md:bottom-24 -translate-x-1/2 flex-wrap justify-center gap-1 rounded-2xl border border-white/10 bg-black/60 p-2 backdrop-blur">
        {STICKER_KINDS.map((kind) => (
          <button
            key={kind.id}
            type="button"
            title={kind.label}
            aria-label={kind.label}
            aria-pressed={selected === kind.id}
            onClick={() => setSelected(selected === kind.id ? null : kind.id)}
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
              selected === kind.id ? 'bg-brand-400/30 ring-2 ring-brand-400' : 'hover:bg-white/10'
            }`}
          >
            {renderKind(kind)}
          </button>
        ))}
      </div>
    </>
  )
}
