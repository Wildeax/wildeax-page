// Real touch gestures and browser sensor-boundary simulation. No app state is
// patched; all mutations use UI controls in a fresh isolated room.
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:4173'
const browser = await chromium.launch()
const room = `phone-play-${Date.now().toString(36)}`
const checks = [], errors = []
const check = (name, pass, detail) => { checks.push(!!pass); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`, detail ?? '') }
async function open(suffix, permission = 'granted', reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-US', reducedMotion })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript((permission) => {
    Math.random = () => 0.5
    window.__phoneRequests = []
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', { configurable: true, value: async () => {
      window.__phoneRequests.push(navigator.userActivation.isActive)
      return permission
    } })
  }, permission)
  await page.clock.install({ time: new Date('2026-09-06T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'))
  await page.goto(`${base.replace(/\/$/, '')}/?room=${room}-${suffix}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-wcat]').waitFor({ state: 'visible' })
  await page.clock.runFor(32)
  return page
}
const orient = (page, gamma, beta = 60) => page.evaluate(({ gamma, beta }) => {
  window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { gamma, beta, alpha: 0 }))
}, { gamma, beta })
const settleScroll = async (page) => { await page.clock.runFor(300); await page.waitForTimeout(200) }

try {
  console.log(`Isolated room: ${room}`)
  const page = await open('touch')
  const cat = page.locator('[data-wcat]')
  check('four phone tools are available with the picker closed', await page.locator('.phone-tool:visible').count() === 4 && !(await page.locator('#play-panel').isVisible()))
  check('orientation permission is never requested on load', await page.evaluate(() => window.__phoneRequests.length === 0))
  await page.locator('[data-phone-pet]').tap()
  await page.clock.runFor(32)
  check('Pet triggers the affectionate cat expression', await cat.getAttribute('data-mode') === 'pet')
  await page.clock.runFor(1700)
  await cat.tap()
  check('a direct cat tap pokes without lifting', await cat.getAttribute('data-mode') === 'poke' && await cat.getAttribute('data-form') === 'cat')
  await page.clock.runFor(1000)
  // Put a real card heading in the middle of the screen using ordinary scroll.
  await page.evaluate(() => { const h = document.querySelector('#mobile-work > h2'); scrollTo(0, h.getBoundingClientRect().top + scrollY - 330) })
  await settleScroll(page)
  const heading = page.locator('#mobile-work > h2')
  const h = await heading.boundingBox(), c = await cat.boundingBox()
  const cdp = await page.context().newCDPSession(page)
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })
  const scrollBefore = await page.evaluate(() => scrollY)
  await touch('touchStart', c.x + 22, c.y + 22)
  await page.clock.runFor(300)
  await touch('touchMove', 160, h.y - 18)
  await page.clock.runFor(150)
  check('holding shows the card landing hint', await page.locator('.wcat-landing').isVisible() && await cat.getAttribute('data-held') === 'true')
  await touch('touchEnd')
  await page.clock.runFor(32)
  check('a gentle touch release stays on the card heading', await cat.getAttribute('data-ground') === 'work' && Math.abs((await cat.boundingBox()).y + 44 - h.y) < 2)
  check('held touch placement does not scroll the page', Math.abs(await page.evaluate(() => scrollY) - scrollBefore) < 2)
  await page.evaluate(() => scrollBy(0, 60))
  await settleScroll(page)
  check('the perched cat travels with its card during scrolling', await cat.getAttribute('data-ground') === 'work' && Math.abs((await cat.boundingBox()).y + 44 - (await heading.boundingBox()).y) < 2)
  await page.locator('[data-yarn-toggle]').tap()
  await page.clock.runFor(1400)
  check('a perched cat descends toward floor yarn instead of hopping in place', (await cat.boundingBox()).y + 44 > (await heading.boundingBox()).y + 100)
  await page.evaluate(() => scrollBy(0, 420))
  await settleScroll(page)
  await page.clock.runFor(1800)
  check('scrolling during pursuit keeps the cat within the play area', await cat.getAttribute('data-ground') !== 'work' && (await cat.boundingBox()).y >= 0)
  await cdp.detach()
  await page.close()

  const tilt = await open('tilt')
  const tiltCat = tilt.locator('[data-wcat]')
  await tilt.locator('[data-phone-tilt]').tap()
  check('Tilt requests permission inside the user gesture', await tilt.evaluate(() => window.__phoneRequests.length === 1 && window.__phoneRequests[0]))
  await orient(tilt, 10)
  await tilt.clock.runFor(32)
  check('the first sensor reading becomes the neutral holding angle', await tilt.locator('[data-phone-tilt]').getAttribute('data-status') === 'on' && await tiltCat.evaluate((el) => parseFloat(el.style.getPropertyValue('--wcat-lean'))) === 0)
  const initialX = (await tiltCat.boundingBox()).x
  for (let i = 0; i < 12; i++) { await orient(tilt, 35); await tilt.clock.runFor(32) }
  check('tilting makes the standing cat balance and walk', (await tiltCat.boundingBox()).x > initialX + 12 && await tiltCat.evaluate((el) => parseFloat(el.style.getPropertyValue('--wcat-lean'))) > 2,
    { initialX, current: await tiltCat.boundingBox(), mode: await tiltCat.getAttribute('data-mode'), lean: await tiltCat.evaluate((el) => el.style.getPropertyValue('--wcat-lean')) })
  await tilt.getByRole('button', { name: 'Recenter', exact: true }).tap()
  await orient(tilt, 35)
  await tilt.clock.runFor(32)
  check('Recenter accepts the new holding angle', await tiltCat.evaluate((el) => parseFloat(el.style.getPropertyValue('--wcat-lean'))) === 0)
  await tilt.locator('[data-yarn-toggle]').tap()
  await tilt.clock.runFor(32)
  check('the mobile cat takes interest in newly offered yarn', await tiltCat.getAttribute('data-toy-interest') === 'true')
  await tilt.clock.runFor(11000)
  check('the cat loses interest instead of hunting forever', await tiltCat.getAttribute('data-toy-interest') === 'false')
  // Park the yarn through its public keyboard controls, above a card, then let
  // the same physics used for real touch throws catch it on the heading.
  await tilt.evaluate(() => { const h = document.querySelector('#mobile-work > h2'); scrollTo(0, h.getBoundingClientRect().top + scrollY - 330) })
  await settleScroll(tilt)
  const yarn = tilt.locator('[data-yarn]')
  await yarn.focus()
  await yarn.press('Space')
  for (let i = 0; i < 20; i++) await yarn.press('ArrowUp')
  await yarn.press('Space')
  await tilt.clock.runFor(6500)
  const top = await tilt.locator('#mobile-work > h2').boundingBox()
  check('dropped yarn bounces and rests on a card heading', Math.abs((await yarn.boundingBox()).y + 36 - top.y) < 2, { yarn: await yarn.boundingBox(), top })
  const yarnX = (await yarn.boundingBox()).x
  const string = await tilt.locator('.wcat-string path').getAttribute('d')
  for (let i = 0; i < 16; i++) { await orient(tilt, 65); await tilt.clock.runFor(32) }
  check('tilt rolls the yarn and moves its physics string', Math.abs((await yarn.boundingBox()).x - yarnX) > 12 && await tilt.locator('.wcat-string path').getAttribute('d') !== string)
  await tilt.locator('[data-phone-tilt]').tap()
  await orient(tilt, -65)
  await tilt.clock.runFor(32)
  check('turning Tilt off clears sensor force', await tilt.locator('[data-phone-tilt]').getAttribute('data-status') === 'off' && await tiltCat.evaluate((el) => parseFloat(el.style.getPropertyValue('--wcat-lean'))) === 0)
  await tilt.screenshot({ path: 'shot-mobile-play.png' })
  await tilt.close()

  const denied = await open('denied', 'denied')
  await denied.locator('[data-phone-tilt]').tap()
  check('denied motion has a clear touch fallback', await denied.locator('[data-phone-tilt]').getAttribute('data-status') === 'denied' && await denied.getByText('Motion blocked. Touch play still works.').isVisible())
  await denied.locator('[data-phone-pet]').tap()
  await denied.clock.runFor(32)
  check('Pet still works after motion denial', await denied.locator('[data-wcat]').getAttribute('data-mode') === 'pet')
  await denied.close()
  const missing = await open('missing')
  await missing.locator('[data-phone-tilt]').tap()
  await missing.clock.runFor(4500)
  check('missing sensor readings time out to a useful fallback', await missing.locator('[data-phone-tilt]').getAttribute('data-status') === 'unavailable')
  await missing.close()
  const reduced = await open('reduced', 'granted', 'reduce')
  check('reduced motion disables sensors without requesting access', await reduced.locator('[data-phone-tilt]').isDisabled() && await reduced.evaluate(() => window.__phoneRequests.length === 0))
  await reduced.locator('[data-yarn-toggle]').tap()
  await reduced.clock.runFor(3000)
  check('reduced motion keeps yarn usable without autonomous hunting', await reduced.locator('[data-yarn]').isVisible() && await reduced.locator('[data-wcat]').getAttribute('data-toy-interest') === 'false')
  await reduced.close()
  check('no runtime errors in mobile play', errors.length === 0, errors)
} catch (error) { check('mobile play workflow completed', false, error.stack) }
finally { await browser.close() }
console.log(`\n${checks.filter(Boolean).length}/${checks.length} mobile play checks passed`)
if (checks.some((passed) => !passed)) process.exitCode = 1
