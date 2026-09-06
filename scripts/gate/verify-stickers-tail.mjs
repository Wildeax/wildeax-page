// Only this run's throwaway room is modified. No production-room stickers are touched.
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:4173'
const browser = await chromium.launch()
const checks = []
const errors = []
const url = `${base.replace(/\/$/, '')}/?room=stickers-tail-${Date.now()}`
function check(label, passed, detail) {
  checks.push([label, passed])
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${!passed ? `: ${JSON.stringify(detail)}` : ''}`)
}
async function open(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 711 }, ...options })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(url, { waitUntil: 'networkidle' })
  return page
}
async function shot(page, name) {
  const r = await page.locator('[data-wcat]').boundingBox()
  const viewport = page.viewportSize()
  await page.screenshot({ path: `shot-tail-${name}.png`, clip: {
    x: Math.max(0, Math.min(r.x - 60, viewport.width - 180)),
    y: Math.max(0, Math.min(r.y - 35, viewport.height - 115)), width: 180, height: 115,
  } })
}
try {
  const page = await open()
  const other = await open()
  const palette = page.locator('[data-sticker-dock]')
  for (const x of [1140, 1250]) {
    await palette.getByRole('button', { name: 'Star', exact: true }).click()
    await page.mouse.click(x, 150)
  }
  await page.waitForFunction(() => document.querySelectorAll('[data-sticker]').length === 2)
  check('two placed emojis render without changing the palette', await page.locator('[data-sticker]').count() === 2 && await palette.locator('button:not([data-yarn-toggle])').count() === 11)
  await other.waitForFunction(() => document.querySelectorAll('[data-sticker]').length === 2, null, { timeout: 15000 })
  check('placed emojis reach another visitor in the test room', await other.locator('[data-sticker]').count() === 2)
  const first = page.locator('[data-sticker]').first()
  const removedId = await first.getAttribute('data-sticker')
  const keptId = await page.locator('[data-sticker]').last().getAttribute('data-sticker')
  await first.locator('span').click({ button: 'right' })
  await page.waitForFunction((id) => ![...document.querySelectorAll('[data-sticker]')].some((el) => el.dataset.sticker === id), removedId)
  check('right-click removes just that emoji instance', await page.locator('[data-sticker]').count() === 1 && await page.locator(`[data-sticker="${keptId}"]`).count() === 1)
  await other.waitForFunction(() => document.querySelectorAll('[data-sticker]').length === 1, null, { timeout: 15000 })
  check('removal reaches the other visitor', await other.locator(`[data-sticker="${removedId}"]`).count() === 0)
  check('right-click does not open the desktop Refresh menu', await page.getByRole('menu').count() === 0)
  const kept = page.locator(`[data-sticker="${keptId}"] span`)
  await kept.click()
  const before = await kept.boundingBox()
  await page.mouse.move(before.x + 12, before.y + 12)
  await page.mouse.down()
  await page.mouse.move(before.x - 65, before.y + 75, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const after = await kept.boundingBox()
  check('left-click keeps the emoji and left-drag still moves it', after.x < before.x - 50 && after.y > before.y + 50, { before, after })
  await palette.getByRole('button', { name: 'Star', exact: true }).click({ button: 'right' })
  check('right-clicking the palette keeps its entries and placed stickers', await palette.locator('button:not([data-yarn-toggle])').count() === 11 && await page.locator('[data-sticker]').count() === 1)
  await kept.click({ button: 'right' })
  await page.waitForFunction(() => document.querySelectorAll('[data-sticker]').length === 0)
  await other.waitForFunction(() => document.querySelectorAll('[data-sticker]').length === 0)
  check('the last placed emoji can also be removed', await page.locator('[data-sticker]').count() === 0)
  await other.close()
  await page.close()

  const pose = await browser.newPage({ viewport: { width: 1365, height: 711 } })
  pose.on('pageerror', (error) => errors.push(error.message))
  await pose.clock.install({ time: new Date('2026-09-05T00:00:00Z') })
  await pose.clock.pauseAt(new Date('2026-09-05T00:00:01Z'))
  await pose.goto(url, { waitUntil: 'domcontentloaded' })
  await pose.locator('[data-wcat]').waitFor({ state: 'visible' })
  await pose.clock.runFor(32)
  const tail = pose.locator('.wcat-tail path')
  const start = await tail.getAttribute('d')
  const drawing = await pose.locator('.wcat-silhouette').evaluate((el) => {
    const tail = el.querySelector('.wcat-tail')
    const body = el.querySelector('.wcat-body')
    const path = tail.querySelector('path')
    const ink = path.getBBox()
    const transform = new DOMMatrixReadOnly(getComputedStyle(el).transform)
    return { covered: Number(getComputedStyle(body).zIndex) > Number(getComputedStyle(tail).zIndex),
      flat: transform.is2D && getComputedStyle(tail).transform === 'none' && getComputedStyle(tail).filter === 'none',
      bottom: ink.y + ink.height + Number(path.getAttribute('stroke-width')) / 2,
      stroke: path.getAttribute('stroke-width') }
  })
  check('the body covers the tail base at the rear hip', drawing.covered && start.startsWith('M40 30 C30.00 30.00'), drawing)
  check('the tail uses flat constant-width ink without a 3D transform', drawing.flat && drawing.stroke === '6', drawing)
  check('tail ink stays above the feet', drawing.bottom <= 40, drawing)
  await shot(pose, 'idle')
  await pose.clock.runFor(800)
  check('only the outer curve swishes while the base stays fixed', start !== await tail.getAttribute('d') && start.split(' S')[0] === (await tail.getAttribute('d')).split(' S')[0])
  await shot(pose, 'swish')
  const r = await pose.locator('[data-wcat]').boundingBox()
  for (const offset of [8, 18, 28, 38, 28, 18, 8, 18, 28, 38]) {
    await pose.mouse.move(r.x + offset, r.y + 14)
    await pose.clock.runFor(120)
  }
  check('petting still changes the tail pose', await pose.locator('[data-wcat]').getAttribute('data-mode') === 'pet' && start !== await tail.getAttribute('d'))
  await shot(pose, 'pet')
  await pose.clock.fastForward(48000)
  await pose.clock.runFor(1000)
  await shot(pose, 'sleep')
  const sleeping = await tail.getAttribute('d')
  await pose.clock.runFor(200)
  check('the sleeping tail rests without swishing', await pose.locator('[data-wcat]').getAttribute('data-mode') === 'nap' && sleeping === await tail.getAttribute('d'))
  await pose.locator('[data-wcat]').focus()
  await pose.keyboard.press('Space')
  check('the tail still tucks away when lifted into a ball', await pose.locator('.wcat-tail').evaluate((el) => getComputedStyle(el).display === 'none'))
  await pose.close()

  const reduced = await open({ reducedMotion: 'reduce' })
  const still = await reduced.locator('.wcat-tail path').getAttribute('d')
  await reduced.waitForTimeout(600)
  check('reduced motion keeps the tail still', still === await reduced.locator('.wcat-tail path').getAttribute('d'))
  await reduced.close()
  check('no page errors', errors.length === 0, errors)
  process.exitCode = checks.every(([, passed]) => passed) ? 0 : 1
} finally { await browser.close() }
