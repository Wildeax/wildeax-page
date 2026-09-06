// @vitest-environment jsdom
import { useState } from 'react'
import type { ReactNode } from 'react'
import { act, cleanup, createEvent, fireEvent, render as renderView, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StickerLayer } from '@/play/StickerLayer'
import { STICKER_KINDS } from '@/play/stickers'
import type { PlacedSticker } from '@/play/stickers'
import { I18nProvider } from '@/i18n'

const initial: PlacedSticker[] = ['one', 'two'].map((id, index) => ({ id, kind: 'star', x: 100 + index * 100, y: 100, rotation: 0, scale: 1, placedAt: index }))
const names = vi.hoisted(() => [] as string[])
vi.mock('@/play/sync', () => ({ useSharedList: (name: string) => { names.push(name); return useState(initial) } }))
const render = (children: ReactNode) => renderView(<I18nProvider>{children}</I18nProvider>)
afterEach(() => { cleanup(); names.length = 0; vi.unstubAllGlobals() })

describe('mobile stickers', () => {
  function mobile() {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  }
  it('uses a separate collection from desktop and resets on a layout switch', () => {
    let desktop = true
    let change = () => {}
    vi.stubGlobal('matchMedia', () => ({ get matches() { return desktop }, addEventListener(_: string, callback: () => void) { change = callback }, removeEventListener() {} }))
    const view = render(<StickerLayer />)
    expect(names).toContain('wildeax-stickers')
    desktop = false
    // The media subscription is the actual layout switch path.
    act(() => change())
    expect(names).toContain('wildeax-stickers-mobile')
    expect(view.container.querySelector('[data-sticker-layer]')?.getAttribute('data-sticker-scope')).toBe('mobile')
  })
  it('keeps the tray closed until requested and lets touch users cancel placement', () => {
    mobile()
    const view = render(<StickerLayer />)
    expect(screen.queryByRole('button', { name: 'Star' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    fireEvent.click(screen.getByRole('button', { name: 'Star' }))
    expect(screen.getByRole('button', { name: 'Place sticker' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('button', { name: 'Place sticker' })).toBeNull()
    expect(view.container.querySelectorAll('[data-sticker]')).toHaveLength(2)
  })
  it('removes only the tapped sticker while the touch eraser is active', () => {
    mobile()
    const view = render(<StickerLayer />)
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove stickers' }))
    fireEvent.click(view.container.querySelector('[data-sticker="one"]')!)
    expect(view.container.querySelector('[data-sticker="one"]')).toBeNull()
    expect(view.container.querySelector('[data-sticker="two"]')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.click(view.container.querySelector('[data-sticker="two"]')!)
    expect(view.container.querySelector('[data-sticker="two"]')).toBeTruthy()
  })
})

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
