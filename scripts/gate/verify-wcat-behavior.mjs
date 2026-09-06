// Real input events with a controlled clock. No private cat state is changed.
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:4173'
const browser = await chromium.launch()
const errors = []
const checks = []
let sequence = 0
async function open(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 711 }, ...options })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.install({ time: new Date('2026-09-05T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-09-05T00:00:01Z'))
  await page.goto(`${base.replace(/\/$/, '')}/?room=wcat-behavior-${Date.now()}-${sequence++}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-wcat]').waitFor({ state: 'visible' })
  await page.clock.runFor(32)
  return page
}
const cat = (page) => page.locator('[data-wcat]')
const mode = (page) => cat(page).getAttribute('data-mode')
async function eyes(page) {
  return cat(page).evaluate((el) => ({
    x: el.style.getPropertyValue('--wcat-eye-x'), y: el.style.getPropertyValue('--wcat-eye-y'),
    height: el.querySelector('.wcat-eyes > span').getBoundingClientRect().height,
  }))
}
function check(label, passed, detail) {
  checks.push([label, passed])
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${!passed && detail ? `: ${JSON.stringify(detail)}` : ''}`)
}
async function shot(page, name) {
  const r = await cat(page).boundingBox()
  const viewport = page.viewportSize()
  await page.screenshot({ path: `shot-wcat-${name}.png`, clip: {
    x: Math.max(0, Math.min(r.x - 80, viewport.width - 220)),
    y: Math.max(0, Math.min(r.y - 70, viewport.height - 150)), width: 220, height: 150,
  } })
}
async function stroke(page) {
  const r = await cat(page).boundingBox()
  for (const offset of [8, 18, 28, 38, 28, 18]) {
    await page.mouse.move(r.x + offset, r.y + 14)
    await page.clock.runFor(120)
  }
}
async function tease(page) {
  const r = await cat(page).boundingBox()
  for (const offset of [85, 120, 85, 120]) {
    await page.mouse.move(r.x + 22 + offset, r.y + 30)
    await page.clock.runFor(120)
  }
}

try {
  const page = await open()
  await page.clock.fastForward(46000)
  await page.clock.runFor(32)
  const sleeping = await mode(page)
  await page.mouse.move(1200, 100)
  await page.clock.runFor(32)
  const asleepEyes = await eyes(page)
  check('sleeping eyes remain closed and still after distant mouse movement', sleeping === 'nap'
    && await mode(page) === 'nap' && asleepEyes.x === '0px' && asleepEyes.y === '0px' && asleepEyes.height < 2, asleepEyes)
  const sleepMarks = await cat(page).locator('.wcat-sleep').evaluate((el) => ({ text: el.textContent,
    visibility: getComputedStyle(el).visibility, animation: getComputedStyle(el.firstElementChild).animationName }))
  check('sleep has visible animated zZZ marks', sleepMarks.text === 'zZZ' && sleepMarks.visibility === 'visible'
    && sleepMarks.animation === 'wcat-sleep', sleepMarks)
  await page.clock.runFor(800)
  await shot(page, 'sleep')

  let r = await cat(page).boundingBox()
  await page.mouse.click(r.x + 22, r.y + 22)
  const wakingEyes = await eyes(page)
  check('waking starts with still, half-open eyes', await mode(page) === 'wake' && wakingEyes.x === '0px'
    && wakingEyes.y === '0px' && wakingEyes.height > 3 && wakingEyes.height < 6, wakingEyes)
  await shot(page, 'wake')
  check('sleep marks disappear during waking', await cat(page).locator('.wcat-sleep').evaluate((el) => getComputedStyle(el).visibility === 'hidden'))
  await page.clock.runFor(700)
  check('a click wakes and pokes without lifting', await mode(page) === 'poke' && await cat(page).getAttribute('data-form') === 'cat')
  await shot(page, 'poke')
  await page.clock.runFor(800)
  check('the poke ends in a quiet rest', await mode(page) === 'sit')
  await stroke(page)
  const petEyes = await eyes(page)
  check('gentle head strokes relax the cat and close its eyes', await mode(page) === 'pet'
    && petEyes.x === '0px' && petEyes.y === '0px' && petEyes.height < 2, { mode: await mode(page), ...petEyes })
  await shot(page, 'pet')
  await page.clock.runFor(1600)
  check('petting ends when strokes stop', await mode(page) === 'sit')
  await page.close()

  const play = await open()
  r = await cat(play).boundingBox()
  for (const offset of [80, 110, 140, 170]) {
    await play.mouse.move(r.x + 22 + offset, r.y + 30)
    await play.clock.runFor(100)
  }
  check('ordinary pointer travel does not start a hunt', await mode(play) === 'sit')
  await play.clock.runFor(400)
  await tease(play)
  check('nearby back-and-forth motion starts stalking', await mode(play) === 'stalk', await mode(play))
  await play.clock.runFor(400)
  check('the cat crouches before jumping', await mode(play) === 'crouch', await mode(play))
  await shot(play, 'crouch')
  await play.clock.runFor(560)
  const airborne = await cat(play).boundingBox()
  check('the crouch becomes a real forward pounce', await mode(play) === 'pounce'
    && airborne.y < r.y - 5 && airborne.x > r.x + 10, { mode: await mode(play), airborne, start: r })
  await shot(play, 'pounce')
  await play.clock.runFor(600)
  check('the pounce lands and rests on the same floor', await mode(play) === 'sit' && await cat(play).getAttribute('data-ground') === 'floor')
  await tease(play)
  check('more wiggling during cooldown does not restart the hunt', await mode(play) === 'sit')
  await play.close()

  const reduced = await open({ reducedMotion: 'reduce' })
  await tease(reduced)
  check('reduced motion does not hunt', await mode(reduced) === 'sit')
  await stroke(reduced)
  const animation = await cat(reduced).locator('.wcat-art').evaluate((el) => getComputedStyle(el).animationName)
  check('reduced motion keeps pet feedback without animation', await mode(reduced) === 'pet' && animation === 'none')
  await cat(reduced).focus()
  await reduced.keyboard.press('Enter')
  check('Enter pokes without lifting', await mode(reduced) === 'poke' && await cat(reduced).getAttribute('data-form') === 'cat')
  await reduced.clock.fastForward(46000)
  await reduced.clock.runFor(32)
  const staticMarks = await cat(reduced).locator('.wcat-sleep > span').first().evaluate((el) => ({
    animation: getComputedStyle(el).animationName, opacity: getComputedStyle(el).opacity,
  }))
  check('reduced motion allows sleep with still zZZ marks', await mode(reduced) === 'nap'
    && staticMarks.animation === 'none' && Number(staticMarks.opacity) > 0, staticMarks)
  await reduced.close()

  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  r = await cat(mobile).boundingBox()
  await mobile.touchscreen.tap(r.x + 22, r.y + 22)
  check('a phone tap pokes without a long-press lift', await mode(mobile) === 'poke' && await cat(mobile).getAttribute('data-form') === 'cat')
  await cat(mobile).focus()
  await mobile.keyboard.press('Space')
  for (let i = 0; i < 8; i++) await mobile.keyboard.press('Shift+ArrowRight')
  await mobile.keyboard.press('Escape')
  await mobile.clock.runFor(1000)
  await mobile.clock.fastForward(46000)
  await mobile.clock.runFor(32)
  const markBounds = await cat(mobile).locator('.wcat-sleep').boundingBox()
  check('phone sleep marks face inward and do not widen the viewport', await mode(mobile) === 'nap'
    && await cat(mobile).getAttribute('data-sleep-side') === 'left' && markBounds.x >= 0 && markBounds.x + markBounds.width <= 390
    && await mobile.evaluate(() => document.documentElement.scrollWidth === innerWidth), markBounds)
  await shot(mobile, 'mobile-sleep')
  await mobile.close()
  check('no page errors', errors.length === 0, errors)
  process.exitCode = checks.every(([, passed]) => passed) ? 0 : 1
} finally { await browser.close() }
