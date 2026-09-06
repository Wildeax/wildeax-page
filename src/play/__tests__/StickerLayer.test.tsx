// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, createEvent, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StickerLayer } from '@/play/StickerLayer'
import { STICKER_KINDS } from '@/play/stickers'
import type { PlacedSticker } from '@/play/stickers'

const initial: PlacedSticker[] = ['one', 'two'].map((id, index) => ({ id, kind: 'star', x: 100 + index * 100, y: 100, rotation: 0, scale: 1, placedAt: index }))
vi.mock('@/play/sync', () => ({ useSharedList: () => useState(initial) }))
afterEach(cleanup)

describe('placed sticker removal', () => {
  it('right-click removes only that instance and suppresses the context menu', () => {
    const outside = vi.fn()
    const view = render(<div onContextMenu={outside}><StickerLayer /></div>)
    const first = view.container.querySelector('[data-sticker="one"]')!
    expect(first).toBeTruthy()
    const context = createEvent.contextMenu(first.querySelector('span')!, { button: 2, bubbles: true, cancelable: true })
    fireEvent(first.querySelector('span')!, context)
    expect(context.defaultPrevented).toBe(true)
    expect(outside).not.toHaveBeenCalled()
    expect(view.container.querySelector('[data-sticker="one"]')).toBeNull()
    expect(view.container.querySelector('[data-sticker="two"]')).toBeTruthy()
    expect(view.container.querySelectorAll('[data-sticker-dock] button')).toHaveLength(STICKER_KINDS.length)
  })

  it('left-click and right-clicking the palette do not delete placed stickers', () => {
    const view = render(<StickerLayer />)
    const first = view.container.querySelector('[data-sticker="one"]')!
    expect(first).toBeTruthy()
    fireEvent.click(first)
    fireEvent.contextMenu(view.container.querySelector('[data-sticker-dock] button')!)
    expect(view.container.querySelectorAll('[data-sticker]')).toHaveLength(2)
  })
})
