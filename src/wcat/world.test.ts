// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { readWorld } from './world'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('uses visible mobile card headings as perches above the phone toolbar', () => {
  const root = document.createElement('main')
  const layer = document.createElement('div')
  root.append(layer)
  document.body.append(root)
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 844))
  for (const [id, top] of [['visible', 300], ['offscreen', -50], ['behind-tools', 820]] as const) {
    const card = document.createElement('section')
    card.dataset.mobileCard = ''
    card.dataset.window = id
    const heading = document.createElement('h2')
    card.append(heading)
    root.append(card)
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue(new DOMRect(16, top, 358, 40))
  }
  const tools = document.createElement('div')
  tools.dataset.mobileTools = ''
  document.body.append(tools)
  vi.spyOn(tools, 'getBoundingClientRect').mockReturnValue(new DOMRect(12, 764, 366, 64))
  expect(readWorld(layer, true, false)).toMatchObject({ floor: 756, ballPlatforms: true, platforms: [{ id: 'visible', left: 16, right: 374, y: 300 }] })
  expect(readWorld(layer, true, false, true).platforms).toEqual([])
})

it('keeps the mobile floor above its safe-area padding', () => {
  const layer = document.createElement('div')
  layer.style.paddingBottom = '42px'
  document.body.append(layer)
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 844))
  expect(readWorld(layer, true, false).floor).toBe(802)
  expect(readWorld(layer, false, false).floor).toBe(800)
})

it('follows a smaller visual viewport without shrinking desktop or app rooms', () => {
  const layer = document.createElement('div')
  document.body.append(layer)
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 844))
  vi.stubGlobal('visualViewport', { height: 500, offsetTop: 20, scale: 1 })
  expect(readWorld(layer, true, false).floor).toBe(512)
  expect(readWorld(layer, false, false).floor).toBe(800)
  expect(readWorld(layer, true, false, true).floor).toBe(836)
  vi.stubGlobal('visualViewport', { height: 500, offsetTop: 20, scale: 2 })
  expect(readWorld(layer, true, false).floor).toBe(836)
})

it('reads a live selection as a solid rectangle and temporary perch', () => {
  const root = document.createElement('div')
  const layer = document.createElement('div')
  const selection = document.createElement('div')
  selection.dataset.marquee = ''
  root.append(layer, selection)
  document.body.append(root)
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 30, 800, 644))
  vi.spyOn(selection, 'getBoundingClientRect').mockReturnValue(new DOMRect(220, 230, 180, 400))
  expect(readWorld(layer, false, false)).toMatchObject({
    obstacles: [{ id: 'selection', left: 200, right: 380, y: 200, bottom: 600 }],
    platforms: [{ id: 'selection', left: 200, right: 380, y: 200 }],
  })
  selection.remove()
  expect(readWorld(layer, false, false).obstacles).toEqual([])
})

it('keeps a room cat above an overlapping sticker dock', () => {
  const root = document.createElement('div')
  root.dataset.desktop = ''
  const layer = document.createElement('div')
  const dock = document.createElement('div')
  dock.dataset.stickerDock = ''
  root.append(layer)
  document.body.append(root, dock)
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue(new DOMRect(460, 370, 380, 250))
  vi.spyOn(dock, 'getBoundingClientRect').mockReturnValue(new DOMRect(410, 553, 540, 62))
  expect(readWorld(layer, true, false, true).floor).toBe(179)
  expect(readWorld(layer, true, false).floor).toBe(242)
  vi.mocked(dock.getBoundingClientRect).mockReturnValue(new DOMRect(10, 553, 300, 62))
  expect(readWorld(layer, true, false, true).floor).toBe(242)
})

it('reads visible title bars in layer coordinates and excludes hidden or exiting windows', () => {
  const root = document.createElement('div')
  const layer = document.createElement('div')
  root.append(layer)
  document.body.append(root)
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 30, 800, 644))
  for (const id of ['shown', 'hidden', 'invisible', 'minimizing', 'closing', 'offscreen']) {
    const win = document.createElement('div')
    win.dataset.window = id
    win.hidden = id === 'hidden'
    if (id === 'invisible') win.style.visibility = 'hidden'
    if (id === 'minimizing') win.className = 'os-flight-minimize'
    if (id === 'closing') win.className = 'os-flight-close'
    const handle = document.createElement('div')
    handle.dataset.dragHandle = ''
    vi.spyOn(handle, 'getBoundingClientRect').mockReturnValue(new DOMRect(120, id === 'offscreen' ? 10 : 230, 300, 33))
    win.append(handle)
    root.append(win)
  }
  expect(readWorld(layer, false, false)).toMatchObject({
    width: 800, floor: 600, left: 20, top: 30,
    platforms: [{ id: 'shown', left: 100, right: 400, y: 200 }],
  })
  const handle = root.querySelector<HTMLElement>('[data-window="shown"] [data-drag-handle]')!
  vi.mocked(handle.getBoundingClientRect).mockReturnValue(new DOMRect(160, 280, 300, 33))
  expect(readWorld(layer, false, false).platforms[0]).toMatchObject({ left: 140, y: 250 })
})
