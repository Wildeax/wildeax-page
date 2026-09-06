// Real pointer/window interactions. Seed only randomness, never the cat's state.
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:4173'
const browser = await chromium.launch()
const checks = []
const errors = []
let sequence = 0
const cat = (page) => page.locator('[data-wcat]')
const mode = (page) => cat(page).getAttribute('data-mode')
function check(label, passed, detail) {
  checks.push([label, passed])
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${!passed ? `: ${JSON.stringify(detail)}` : ''}`)
}
async function open(seed = 0.2, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 711 }, ...options })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript((value) => { Math.random = () => value }, seed)
  await page.clock.install({ time: new Date('2026-09-05T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-09-05T00:00:01Z'))
  await page.goto(`${base.replace(/\/$/, '')}/?room=wcat-handling-${Date.now()}-${sequence++}`, { waitUntil: 'domcontentloaded' })
  await cat(page).waitFor({ state: 'visible' })
  await page.clock.runFor(32)
  return page
}
async function place(page, x, y) {
  const r = await cat(page).boundingBox()
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, y - 22)
  await page.clock.runFor(160)
  const hint = await page.locator('.wcat-landing').evaluate((el) => getComputedStyle(el).visibility)
  await page.mouse.up()
  await page.clock.runFor(32)
  return hint
}
async function settle(page) {
  for (let i = 0; i < 120 && await cat(page).getAttribute('data-form') === 'ball'; i++) await page.clock.runFor(100)
}
try {
  if (!process.argv.includes('--visits')) {
  const page = await open()
  const handle = await page.locator('[data-window="me"] [data-drag-handle]').boundingBox()
  const hint = await place(page, handle.x + handle.width / 2, handle.y)
  check('slow placement shows a landing hint and stays on the window', hint === 'visible' && await cat(page).getAttribute('data-ground') === 'me')
  await page.mouse.move(1100, 650)
  await page.clock.runFor(1000)
  check('a gently placed cat stays seated for a moment', await mode(page) === 'sit' && await cat(page).getAttribute('data-ground') === 'me')
  const path = await cat(page).locator('.wcat-tail path').getAttribute('d')
  await page.clock.runFor(600)
  check('the SVG tail bends while resting', path !== await cat(page).locator('.wcat-tail path').getAttribute('d'))
  let r = await cat(page).boundingBox()
  for (const offset of [8, 18, 28, 38]) {
    await page.mouse.move(r.x + offset, r.y + 14)
    await page.clock.runFor(150)
  }
  check('a single pass across the head does not pet', await mode(page) !== 'pet')
  await page.mouse.move(r.x + 100, r.y + 10)
  await page.clock.runFor(32)
  const firstEye = await cat(page).evaluate((el) => parseFloat(el.style.getPropertyValue('--wcat-eye-x')))
  await page.mouse.move(r.x - 60, r.y + 10)
  await page.clock.runFor(32)
  const secondEye = await cat(page).evaluate((el) => parseFloat(el.style.getPropertyValue('--wcat-eye-x')))
  check('a short attention bout tracks live direction changes', firstEye > 0 && secondEye < 0, { firstEye, secondEye })
  await page.clock.runFor(3500)
  await page.mouse.move(r.x + 60, r.y + 10)
  await page.clock.runFor(32)
  check('attention has a quiet cooldown', await cat(page).getAttribute('data-attention') === 'false')
  await page.screenshot({ path: 'shot-wcat-handling.png' })
  await page.close()

  for (const seed of [0.2, 0.6]) {
    const edge = await open(seed)
    const ledge = await edge.locator('[data-window="me"] [data-drag-handle]').boundingBox()
    await place(edge, ledge.x + ledge.width - 24, ledge.y)
    await edge.mouse.move(1200, 100)
    await edge.clock.runFor(Math.max(5000, 2000 + seed * 6000) + 50)
    const current = await mode(edge)
    check(seed < 0.4 ? 'chosen edge approach pauses and looks down' : 'the other edge approach proceeds without a compulsory pause', seed < 0.4 ? current === 'peek' : current !== 'peek', current)
    if (seed < 0.4) {
      const eye = await cat(edge).evaluate((el) => parseFloat(el.style.getPropertyValue('--wcat-eye-y')))
      check('edge inspection points the eyes down', eye > 0, eye)
      await edge.screenshot({ path: 'shot-wcat-edge-peek.png' })
      await edge.clock.runFor(1800)
      check('the edge inspection finishes without repeated decisions', await mode(edge) !== 'peek')
    }
    await edge.close()
  }

  const tumble = await open()
  r = await cat(tumble).boundingBox()
  await tumble.mouse.move(r.x + 22, r.y + 22)
  await tumble.mouse.down()
  await tumble.clock.runFor(16)
  await tumble.mouse.move(r.x + 342, r.y - 100)
  await tumble.mouse.up()
  await settle(tumble)
  check('a hard spinning throw produces a dizzy recovery', await mode(tumble) === 'dizzy', await mode(tumble))
  const spiral = await cat(tumble).locator('.wcat-eye-spiral').first().evaluate((el) => getComputedStyle(el).display)
  check('dizzy eyes display spirals', spiral !== 'none', spiral)
  await tumble.screenshot({ path: 'shot-wcat-dizzy.png' })
  await tumble.clock.runFor(3500)
  check('dizziness wears off', await mode(tumble) !== 'dizzy')
  await tumble.close()
  }

  const visit = await open()
  await visit.clock.fastForward(27000)
  await visit.clock.runFor(32)
  check('an unfamiliar app can invite inspection with three windows open', await mode(visit) === 'inspect', await mode(visit))
  await visit.clock.runFor(1150)
  check('inspection can become a hop into the icon', await mode(visit) === 'enter', await mode(visit))
  await visit.clock.runFor(850)
  const badge = visit.locator('[data-cat-resident]')
  check('the entered icon has one cat badge and no loose cat', await badge.count() === 1 && await cat(visit).count() === 0)
  const app = await badge.getAttribute('data-cat-resident')
  await visit.screenshot({ path: 'shot-wcat-icon-badge.png' })
  await visit.locator(`[data-icon="${app}"]`).click()
  await visit.clock.runFor(700)
  check('opening that app brings exactly one cat into its window', await visit.locator(`[data-window="${app}"] [data-wcat]`).count() === 1 && await cat(visit).count() === 1)
  const room = await visit.locator(`[data-wcat-room="${app}"]`).boundingBox()
  let r = await cat(visit).boundingBox()
  check('the room cat fits inside the content area', r.x >= room.x && r.y >= room.y && r.x + r.width <= room.x + room.width && r.y + r.height <= room.y + room.height, { room, r })
  const hit = await cat(visit).evaluate((el) => {
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return { visible: el.contains(hit), rect: r.toJSON(), covering: hit?.outerHTML.slice(0, 200) }
  })
  check('the room cat is visible and can receive a pointer press', hit.visible, hit)
  await visit.screenshot({ path: 'shot-wcat-inside-window.png' })
  await visit.locator(`[data-window="${app}"] button[aria-label^="Minimize"]`).click()
  await visit.clock.runFor(700)
  check('minimizing returns the cat to its badge', await cat(visit).count() === 0 && await badge.count() === 1)
  await visit.locator(`[data-icon="${app}"]`).click()
  await visit.clock.runFor(700)
  check('restoring brings the room cat back', await visit.locator(`[data-wcat-room="${app}"] [data-wcat]`).count() === 1)
  await visit.locator(`[data-window="${app}"] button[aria-label^="Close"]`).click()
  await visit.clock.runFor(700)
  check('closing preserves the badge without an orphaned cat', await cat(visit).count() === 0 && await badge.count() === 1)
  await visit.locator(`[data-icon="${app}"]`).click()
  await visit.clock.runFor(700)
  r = await cat(visit).boundingBox()
  await visit.mouse.move(r.x + 22, r.y + 22)
  await visit.mouse.down()
  await visit.mouse.move(1100, 650)
  await visit.clock.runFor(160)
  await visit.mouse.up()
  await visit.clock.runFor(32)
  check('dragging outside returns the cat to the desktop and clears its badge', await cat(visit).count() === 1 && await cat(visit).evaluate((el) => !el.closest('[data-wcat-room]')) && await badge.count() === 0)
  await visit.close()

  const decline = await open(0.8)
  await decline.clock.fastForward(38000)
  await decline.clock.runFor(32)
  check('an icon inspection is visible before deciding against entry', await mode(decline) === 'inspect')
  await decline.clock.runFor(1400)
  check('the cat can decide not to enter', await cat(decline).count() === 1 && await decline.locator('[data-cat-resident]').count() === 0 && await mode(decline) !== 'enter')
  await decline.close()
  check('no page errors', errors.length === 0, errors)
  process.exitCode = checks.every(([, passed]) => passed) ? 0 : 1
} finally { await browser.close() }
