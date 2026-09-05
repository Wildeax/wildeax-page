import arenaIcon from '@/assets/img/arena/logo-icon x512.png'
import swIcon from '@/assets/img/sw/SW white transperent.png'
import minesweeperIcon from '@/assets/img/minesweeper/minesweeper_icon.png'

/**
 * Without a cap the room grows forever and page load degrades every month with
 * no corresponding bug to notice.
 */
export const STICKER_CAP = 300

export type StickerKind =
  | { id: string; label: string; glyph: string }
  | { id: string; label: string; src: string }

export interface PlacedSticker {
  id: string
  /** Matches a StickerKind id. */
  kind: string
  x: number
  y: number
  rotation: number
  scale: number
  placedAt: number
}

/**
 * The palette is the whole vocabulary a visitor has. It is deliberately a fixed
 * set: there is no text field and no brush anywhere in this feature, which is
 * what removes the moderation burden. Adding kinds here is safe. Adding a way
 * for visitors to supply their own content is not.
 */
export const STICKER_KINDS: readonly StickerKind[] = [
  { id: 'star', label: 'Star', glyph: '⭐' },
  { id: 'fire', label: 'Fire', glyph: '🔥' },
  { id: 'heart', label: 'Heart', glyph: '💜' },
  { id: 'skull', label: 'Skull', glyph: '💀' },
  { id: 'alien', label: 'Alien', glyph: '👾' },
  { id: 'bolt', label: 'Bolt', glyph: '⚡' },
  { id: 'eye', label: 'Eye', glyph: '👁️' },
  { id: 'sparkle', label: 'Sparkles', glyph: '✨' },
  { id: 'arena', label: 'Arena Assistant', src: arenaIcon },
  { id: 'splitwars', label: 'Splitwars', src: swIcon },
  { id: 'sweepr', label: 'Sweepr98', src: minesweeperIcon },
]

/**
 * Whichever client places a sticker is the one that evicts the oldest, since
 * every client holds the same shared state. Two simultaneous placements can
 * push the room to 301 briefly; the next placement corrects it. Coordinating a
 * single authority costs more than that is worth for a decoration count.
 */
export function addSticker(
  list: readonly PlacedSticker[],
  sticker: PlacedSticker,
  cap: number = STICKER_CAP,
): PlacedSticker[] {
  const next = [...list, sticker]
  if (next.length <= cap) return next

  const oldest = next.reduce((a, b) => (a.placedAt <= b.placedAt ? a : b))
  return next.filter((s) => s.id !== oldest.id)
}
