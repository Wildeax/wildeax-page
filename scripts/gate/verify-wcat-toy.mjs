// Real UI input only; private toys and shared stickers use an isolated test room.
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:4173'
const browser = await chromium.launch()
const errors = []
const checks = []
let sequence = 0
const cat = (page) => page.locator('[data-wcat]')
const yarn = (page) => page.locator('[data-yarn]')
const interest = (page) => cat(page).getAttribute('data-toy-interest')
function check(label, passed, detail) {
  checks.push([label, passed])
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${!passed ? `: ${JSON.stringify(detail)}` : ''}`)
}
async function open(options = {}, room = `toy-${Date.now()}-${sequence++}`) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 711 }, ...options })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => { Math.random = () => 0.5 })
  await page.clock.install({ time: new Date('2026-09-05T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-09-05T00:00:01Z'))
  await page.goto(`${base.replace(/\/$/, '')}/?room=${room}`, { waitUntil: 'domcontentloaded' })
  await cat(page).waitFor({ state: 'visible' })
  await page.clock.runFor(32)
  return page
}
async function toss(page, target, x, y, dx = 90, dy = -30) {
  const r = await target.boundingBox()
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
  await page.mouse.down()
  await page.mouse.move(x - dx, y - dy)
  await page.clock.runFor(160)
  await page.mouse.move(x - dx + 1, y - dy)
  await page.clock.runFor(60)
  await page.mouse.move(x, y)
  await page.mouse.up()
  await page.clock.runFor(16)
}
async function closeWindows(page) {
  for (const button of await page.locator('[data-window]:not([hidden]) button[aria-label^="Close"]').all()) await button.click()
  await page.clock.runFor(700)
}
try {
  const room = `private-yarn-${Date.now()}`
  const page = await open({}, room)
  const other = await open({}, room)
  await page.locator('[data-yarn-toggle]').click()
  await page.clock.runFor(32)
  await other.clock.runFor(500)
  check('the palette spawns one private yarn toy', await yarn(page).count() === 1 && await yarn(other).count() === 0 && await page.locator('[data-sticker]').count() === 0)
  check('a new toy catches the cat’s interest', await interest(page) === 'true')
  await toss(page, yarn(page), 800, 400)
  const first = await yarn(page).boundingBox()
  const string = await page.locator('.wcat-string path').getAttribute('d')
  await page.clock.runFor(160)
  const next = await yarn(page).boundingBox()
  check('a mouse throw sends the yarn into flight', next.x > first.x + 50 && await yarn(page).getAttribute('data-held') === 'false', { first, next })
  check('the string bends behind the moving yarn', string !== await page.locator('.wcat-string path').getAttribute('d'))
  const seen = new Set()
  let batted = false
  let last = await yarn(page).boundingBox()
  for (let i = 0; i < 85; i++) {
    await page.clock.runFor(100)
    seen.add(await cat(page).getAttribute('data-mode'))
    const current = await yarn(page).boundingBox()
    const c = await cat(page).boundingBox()
    if (current.y < last.y - 8 && Math.hypot(c.x - current.x, c.y - current.y) < 80) batted = true
    last = current
  }
  check('play includes pursuit, a crouch and a pounce', ['follow', 'crouch', 'pounce'].every((mode) => seen.has(mode)), [...seen])
  check('contact can bat the yarn back into the air', batted)
  await page.screenshot({ path: 'shot-wcat-yarn.png' })
  await page.clock.runFor(1600)
  check('the cat abruptly loses interest after its play burst', await interest(page) === 'false')
  await toss(page, yarn(page), 650, 500)
  check('an immediate rethrow respects the quiet period', await interest(page) === 'false')
  await page.clock.fastForward(15000)
  await toss(page, yarn(page), 650, 500)
  await page.clock.runFor(32)
  check('a later fresh throw can start another play burst', await interest(page) === 'true')
  await cat(page).focus()
  await page.keyboard.press('Space')
  check('picking up the cat interrupts the hunt', await interest(page) === 'false' && await cat(page).getAttribute('data-held') === 'true')
  await page.keyboard.press('Escape')
  await yarn(page).click({ button: 'right' })
  check('right-click removes only the local toy, keeping its palette button', await yarn(page).count() === 0 && await page.locator('[data-yarn-toggle]').count() === 1 && await yarn(other).count() === 0)
  await other.close()
  await page.close()

  const lowerToy = await open()
  for (const id of ['work', 'me']) await lowerToy.locator(`[data-window="${id}"] button[aria-label^="Close"]`).click()
  await lowerToy.clock.runFor(700)
  const title = await lowerToy.locator('[data-window="readme"] [data-drag-handle]').boundingBox()
  await toss(lowerToy, cat(lowerToy), 350, title.y - 22, 0, 0)
  check('the lower-toy regression starts with a cat placed on a real window', await cat(lowerToy).getAttribute('data-ground') === 'readme')
  await lowerToy.locator('[data-yarn-toggle]').click()
  let descended = false
  for (let i = 0; i < 35; i++) {
    await lowerToy.clock.runFor(100)
    if ((await cat(lowerToy).boundingBox()).y > title.y + 200) descended = true
  }
  check('a desktop cat leaves its window to reach a toy below', descended, await cat(lowerToy).boundingBox())
  await lowerToy.close()

  const reduced = await open({ reducedMotion: 'reduce' })
  await reduced.locator('[data-yarn-toggle]').click()
  await toss(reduced, yarn(reduced), 800, 400)
  const stillX = (await yarn(reduced).boundingBox()).x
  await reduced.clock.runFor(2000)
  const restingString = await reduced.locator('.wcat-string path').getAttribute('d')
  await reduced.clock.runFor(300)
  check('reduced motion drops the toy without a chase or horizontal throw', await interest(reduced) === 'false' && (await yarn(reduced).boundingBox()).x === stillX)
  check('the reduced-motion string stays still at rest', restingString === await reduced.locator('.wcat-string path').getAttribute('d'))
  await yarn(reduced).focus()
  await reduced.keyboard.press('Space')
  await reduced.keyboard.press('ArrowUp')
  check('the toy supports keyboard lifting and movement', await yarn(reduced).getAttribute('data-held') === 'true')
  await reduced.keyboard.press('Delete')
  check('Delete removes the focused toy', await yarn(reduced).count() === 0)
  await reduced.close()

  const wall = await open()
  await closeWindows(wall)
  await toss(wall, cat(wall), 650, 440, 70, 0)
  await wall.mouse.move(900, 300)
  await wall.mouse.down()
  await wall.mouse.move(980, 680)
  await wall.clock.runFor(150)
  const approach = await cat(wall).boundingBox()
  await wall.clock.runFor(180)
  const bounced = await cat(wall).boundingBox()
  check('a live selection wall reflects a rolling cat', await wall.locator('[data-marquee]').count() === 1 && bounced.x < approach.x && bounced.x + bounced.width <= 900, { approach, bounced })
  await wall.mouse.move(700, 600)
  await wall.clock.runFor(32)
  check('resizing the wall keeps the cat’s position finite', await cat(wall).evaluate((el) => { const r = el.getBoundingClientRect(); return Number.isFinite(r.x + r.y) && r.x >= 0 && r.right <= innerWidth }))
  await wall.mouse.up()
  await wall.close()

  const perch = await open()
  await closeWindows(perch)
  await perch.mouse.move(520, 450)
  await perch.mouse.down()
  await perch.mouse.move(850, 680)
  let perched = false
  const jumps = new Set()
  for (let i = 0; i < 90; i++) {
    await perch.clock.runFor(100)
    jumps.add(await cat(perch).getAttribute('data-mode'))
    if (await cat(perch).getAttribute('data-ground') === 'selection') { perched = true; break }
  }
  check('the cat can jump onto the selection box and stand on it', perched, { jumps: [...jumps], box: await cat(perch).boundingBox(), mode: await cat(perch).getAttribute('data-mode') })
  await perch.screenshot({ path: 'shot-wcat-selection.png' })
  const top = await cat(perch).boundingBox()
  await perch.mouse.up()
  await perch.clock.runFor(200)
  const falling = await cat(perch).boundingBox()
  check('releasing the selection removes the perch immediately', await perch.locator('[data-marquee]').count() === 0 && await cat(perch).getAttribute('data-ground') !== 'selection' && falling.y > top.y + 10, { top, falling })
  await perch.close()
  check('no page errors', errors.length === 0, errors)
  process.exitCode = checks.every(([, passed]) => passed) ? 0 : 1
} finally { await browser.close() }
