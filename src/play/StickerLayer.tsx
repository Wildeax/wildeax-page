import { useState } from 'react'
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
          return (
            <div
              key={s.id}
              className="absolute"
              style={{
                left: s.x,
                top: s.y,
                transform: `rotate(${s.rotation}deg) scale(${s.scale})`,
              }}
            >
              {renderKind(kind)}
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
      <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-wrap justify-center gap-1 rounded-2xl border border-white/10 bg-black/60 p-2 backdrop-blur">
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
