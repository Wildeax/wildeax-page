// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { readWorld } from './world'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

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
