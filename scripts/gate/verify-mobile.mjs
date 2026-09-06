// Real layout, touch and cross-visitor regressions. Every mutation is confined
// to a fresh room. The immutable old build proves the overflow guard fails
// against the bug and seeds authentic legacy data without backend shortcuts.
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:4173'
const legacy = 'https://33cf49c7-wildeax-page.arena-riot-proxy.workers.dev'
const room = `mobile-${Date.now().toString(36)}`
const url = (host, suffix = '') => `${host.replace(/\/$/, '')}/?room=${room}${suffix}`
const browser = await chromium.launch()
const checks = []
const errors = []
const check = (name, pass, detail) => { checks.push([name, !!pass]); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`, detail ?? '') }
const makePage = async (viewport, mobile = true, motion = 'reduce') => {
  const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile, locale: 'en-US', reducedMotion: motion })
  page.on('pageerror', (error) => errors.push(error.message))
  return page
}
const dimensions = (page) => page.evaluate(() => ({ height: innerHeight, width: innerWidth, pageHeight: document.documentElement.scrollHeight, pageWidth: document.documentElement.scrollWidth, scroll: scrollY }))
const noDesktopScroll = async (page) => {
  await page.evaluate(() => scrollTo(1000, 5000))
  const d = await dimensions(page)
  return d.pageHeight === d.height && d.pageWidth === d.width && d.scroll === 0
}
const waitSticker = (page, kind) => page.locator(`[data-sticker-kind="${kind}"]`).waitFor({ state: 'attached', timeout: 15000 }).catch(async (error) => {
  console.log('sticker wait diagnostics', { url: page.url(), errors, body: (await page.locator('body').innerText()).slice(-1600) })
  await page.screenshot({ path: 'shot-sticker-wait-failed.png' })
  throw error
})
const serveLegacy = async (page) => {
  // playhtml also namespaces by host. Serve the old site's real document and
  // bundles at the target origin in these two isolated test pages, so the old
  // and new versions exercise the same persisted collection, as on deployment.
  await page.route(`${new URL(base).origin}/**`, async (route) => {
    const request = route.request()
    const target = new URL(request.url())
    if (request.isNavigationRequest() || target.pathname.startsWith('/assets/')) {
      const response = await route.fetch({ url: `${legacy}${target.pathname}${target.search}` })
      await route.fulfill({ response })
    } else await route.continue()
  })
}
const place = async (page, kind, x, y, mobile = false) => {
  if (mobile) await page.getByRole('button', { name: 'Stickers', exact: true }).tap()
  await page.getByRole('button', { name: kind, exact: true }).click()
  await page.getByRole('button', { name: 'Place sticker', exact: true }).click({ position: { x, y } })
}
const touchDrag = async (page, target) => {
  const start = await target.boundingBox()
  const before = await page.evaluate(() => scrollY)
  const x = start.x + start.width / 2, y = start.y + start.height / 2
  const cdp = await page.context().newCDPSession(page)
  const touch = (type, dy = 0) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: y - dy, id: 1 }] })
  try {
    await touch('touchStart')
    await page.waitForTimeout(300)
    for (let i = 1; i <= 6; i++) await touch('touchMove', i * 20)
    const end = await target.boundingBox()
    const after = await page.evaluate(() => scrollY)
    await touch('touchEnd')
    return { moved: start.y - end.y, scrollDelta: after - before }
  } finally { await cdp.detach() }
}

try {
  console.log(`Isolated room: ${room}`)
  const oldPhone = await makePage({ width: 390, height: 844 })
  await serveLegacy(oldPhone)
  await oldPhone.goto(url(base), { waitUntil: 'networkidle' })
  await oldPhone.evaluate(() => scrollTo(0, 2200))
  await place(oldPhone, 'Star', 150, 300)
  await waitSticker(oldPhone, 'star')
  await oldPhone.waitForTimeout(1000)
  await oldPhone.close()

  const oldDesktop = await makePage({ width: 1365, height: 711 }, false)
  await serveLegacy(oldDesktop)
  await oldDesktop.goto(url(base), { waitUntil: 'networkidle' })
  await waitSticker(oldDesktop, 'star')
  check('guard detects the legacy cross-layout desktop overflow', !(await noDesktopScroll(oldDesktop)), await dimensions(oldDesktop))
  await oldDesktop.close()

  const desktop = await makePage({ width: 1365, height: 711 }, false)
  await desktop.goto(url(base), { waitUntil: 'networkidle' })
  await waitSticker(desktop, 'star')
  check('legacy placements are preserved but cannot make desktop scroll', await noDesktopScroll(desktop), await dimensions(desktop))
  await place(desktop, 'Fire', 1100, 80)
  await waitSticker(desktop, 'fire')
  const desktopId = await desktop.locator('[data-sticker-kind="fire"]').getAttribute('data-sticker')

  const phone = await makePage({ width: 390, height: 844 })
  await phone.goto(url(base), { waitUntil: 'networkidle' })
  check('mobile starts independently of existing desktop placements', await phone.locator('[data-sticker]').count() === 0)
  await phone.evaluate(() => scrollTo(0, 2200))
  await place(phone, 'Heart', 150, 300, true)
  await waitSticker(phone, 'heart')
  const heart = phone.locator('[data-sticker-kind="heart"] > div')
  const heartPosition = await heart.evaluate((el) => ({ top: el.getBoundingClientRect().top + scrollY, pageHeight: document.documentElement.scrollHeight }))
  check('mobile can still place a sticker deep in its scrolling page', heartPosition.top > 2000 && heartPosition.top < heartPosition.pageHeight, heartPosition)
  const phonePeer = await makePage({ width: 390, height: 844 })
  await phonePeer.goto(url(base), { waitUntil: 'networkidle' })
  await waitSticker(phonePeer, 'heart')
  check('mobile placements still synchronize between mobile visitors', await phonePeer.locator('[data-sticker]').count() === 1)
  await phonePeer.close()
  check('mobile writes do not alter desktop stickers or scrolling', await desktop.locator('[data-sticker-kind="heart"]').count() === 0 && await noDesktopScroll(desktop))
  const desktopPeer = await makePage({ width: 1365, height: 711 }, false)
  await desktopPeer.goto(url(base), { waitUntil: 'networkidle' })
  await waitSticker(desktopPeer, 'fire')
  check('desktop placements still synchronize between desktop visitors', await desktopPeer.locator(`[data-sticker="${desktopId}"]`).count() === 1)
  await desktopPeer.close()

  await desktop.setViewportSize({ width: 390, height: 844 })
  await waitSticker(desktop, 'heart')
  check('resizing into mobile swaps collections without leaking desktop data', await desktop.locator('[data-sticker]').count() === 1 && await desktop.locator('[data-sticker-layer]').getAttribute('data-sticker-scope') === 'mobile')
  await desktop.getByRole('button', { name: 'Stickers', exact: true }).click()
  check('the yarn toggle reconnects after changing layout', await desktop.locator('[data-yarn-toggle]').isVisible())
  await desktop.setViewportSize({ width: 1365, height: 711 })
  await waitSticker(desktop, 'fire')
  check('resizing back restores desktop stickers and a locked viewport', await desktop.locator('[data-sticker-kind="heart"]').count() === 0 && await noDesktopScroll(desktop))
  await desktop.locator('[data-sticker-kind="fire"] > div').click({ button: 'right' })
  check('desktop right-click removal still works', await desktop.locator('[data-sticker-kind="fire"]').count() === 0)
  await desktop.close()

  await phone.evaluate(() => scrollTo(0, 2200))
  const stickerDrag = await touchDrag(phone, heart)
  check('a held phone sticker drags without scrolling the page', stickerDrag.moved > 80 && Math.abs(stickerDrag.scrollDelta) < 3, stickerDrag)
  await phone.getByRole('button', { name: 'Stickers', exact: true }).tap()
  await phone.getByRole('button', { name: 'Remove stickers', exact: true }).tap()
  await heart.tap()
  check('touch eraser removes only the mobile sticker', await phone.locator('[data-sticker]').count() === 0)
  await phone.getByRole('button', { name: 'Done', exact: true }).tap()
  await phone.getByRole('button', { name: 'Stickers', exact: true }).tap()
  await phone.getByRole('button', { name: 'Star', exact: true }).tap()
  await phone.getByRole('button', { name: 'Cancel', exact: true }).tap()
  check('placement can be cancelled without adding a sticker', await phone.locator('[data-sticker]').count() === 0 && await phone.getByRole('button', { name: 'Place sticker' }).count() === 0)
  await phone.close()

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 768, height: 1024 }]) {
    const page = await makePage(viewport, true, 'no-preference')
    const prefix = `${viewport.width}×${viewport.height}`
    await page.goto(url(base, `-${viewport.width}`), { waitUntil: 'networkidle' })
    const layout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-mobile-card]')]
      return { mobile: !!document.querySelector('[data-mobile]'), cards: cards.length,
        heights: cards.map((el) => Math.round(el.getBoundingClientRect().height)),
        nested: [...document.querySelectorAll('[data-window] *')].filter((el) => getComputedStyle(el).overflowY === 'auto' && el.scrollHeight > el.clientHeight + 2).length,
        deadControls: document.querySelectorAll('[data-window] button[aria-label^="Close"], [data-window] button[aria-label^="Minimize"]').length,
        canvas: document.querySelectorAll('canvas').length, pageWidth: document.documentElement.scrollWidth, width: innerWidth,
        palette: document.querySelector('[data-sticker-dock]').getBoundingClientRect().height }
    })
    check(`${prefix}: mobile content fits without nested scrolling or dead controls`, layout.mobile && layout.cards === 11 && layout.nested === 0 && layout.deadControls === 0 && layout.pageWidth === layout.width && new Set(layout.heights).size > 3, layout)
    check(`${prefix}: no animated wallpaper or persistent oversized tray`, layout.canvas === 0 && layout.palette === 0)
    await page.screenshot({ path: `shot-mobile-after-${viewport.width}.png` })
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Work', exact: true }).tap()
    const work = page.locator('#mobile-work')
    await page.waitForFunction(() => { const r = document.querySelector('#mobile-work').getBoundingClientRect(); return r.top >= 0 && r.top < 180 })
    const nav = await work.evaluate((el) => ({ top: el.getBoundingClientRect().top, focused: document.activeElement === el }))
    check(`${prefix}: section links scroll and focus their destination`, nav.top >= 0 && nav.top < 180 && nav.focused, nav)
    await work.locator('ul button').first().tap()
    await page.waitForFunction(() => { const r = document.querySelector('#mobile-splitwars').getBoundingClientRect(); return r.top >= 0 && r.top < 180 })
    const project = await page.locator('#mobile-splitwars').evaluate((el) => ({ top: el.getBoundingClientRect().top, focused: document.activeElement === el }))
    check(`${prefix}: project rows navigate to actual project content`, project.top >= 0 && project.top < 180 && project.focused, project)
    await page.getByRole('button', { name: 'Stickers', exact: true }).tap()
    const panel = await page.locator('#play-panel').boundingBox()
    const touchTargets = await page.locator('[data-sticker-dock] button').evaluateAll((buttons) => buttons.every((el) => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 }))
    check(`${prefix}: expanded toys fit the screen with touch-sized buttons`, panel.x >= 0 && panel.y >= 0 && panel.x + panel.width <= viewport.width && panel.y + panel.height <= viewport.height && touchTargets)
    await page.screenshot({ path: `shot-mobile-tray-${viewport.width}.png` })
    await page.locator('[data-yarn-toggle]').tap()
    await page.getByRole('button', { name: 'Stickers', exact: true }).tap()
    await page.locator('[data-yarn]').waitFor({ state: 'visible' })
    check(`${prefix}: private yarn survives collapsing the tray`, await page.locator('[data-yarn]').isVisible())
    if (viewport.width === 390) {
      const yarnDrag = await touchDrag(page, page.locator('[data-yarn]'))
      check('phone yarn supports a real held touch drag without panning', yarnDrag.moved > 80 && Math.abs(yarnDrag.scrollDelta) < 3, yarnDrag)
      const catDrag = await touchDrag(page, page.locator('[data-wcat]'))
      check('phone cat supports a real held touch drag without panning', catDrag.moved > 80 && Math.abs(catDrag.scrollDelta) < 3, catDrag)
      await page.setViewportSize({ width: 390, height: 650 })
      const followsFloor = await page.waitForFunction(() => { const cat = document.querySelector('[data-wcat]'); return cat.dataset.form === 'cat' && cat.getBoundingClientRect().bottom <= document.querySelector('[data-mobile-tools]').getBoundingClientRect().top - 6 }, null, { timeout: 15000 }).then(() => true, () => false)
      check('cat stays on the visible floor after phone viewport height changes', followsFloor)
      await page.setViewportSize(viewport)
    }
    await page.getByRole('button', { name: 'Stickers', exact: true }).tap()
    await page.locator('[data-yarn-toggle]').tap()
    check(`${prefix}: yarn can be put away without a right-click`, await page.locator('[data-yarn]').count() === 0)
    await page.getByRole('button', { name: 'Stickers', exact: true }).tap()
    await page.getByRole('button', { name: 'Switch language' }).tap()
    check(`${prefix}: mobile tools translate into Spanish`, await page.getByRole('button', { name: 'Mimos', exact: true }).isVisible())
    await page.close()
  }
  check('no browser runtime errors', errors.length === 0, errors)
} catch (error) {
  check('browser workflow completed', false, error.stack)
} finally {
  await browser.close()
}
console.log(`\n${checks.filter(([, ok]) => ok).length}/${checks.length} mobile checks passed`)
if (checks.some(([, ok]) => !ok)) process.exitCode = 1
