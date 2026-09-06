// Focused pet checks, also used when iterating without repeating window flights.
import { chromium } from 'playwright'
import { checkDesktopCat, checkMobileCat } from './wcat.mjs'
const base = process.argv[2] || 'http://127.0.0.1:4173'
const url = `${base.replace(/\/$/, '')}/?room=wcat-${Date.now()}`
const browser = await chromium.launch()
try {
  const errors = []
  const page = await browser.newPage({ viewport: { width: 1365, height: 711 } })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(url, { waitUntil: 'networkidle' })
  const checks = await checkDesktopCat(page)
  // The throw may finish at either edge. Reload to the specified starting
  // position before measuring an autonomous jump to the authored windows.
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-wcat]')
    return el?.dataset.form === 'cat' && el.dataset.ground && el.dataset.ground !== 'floor'
  }, null, { timeout: 15000 })
  const platform = await page.locator('[data-wcat]').getAttribute('data-ground')
  await page.screenshot({ path: 'shot-wcat-perched.png' })
  checks.push(['wcat autonomously jumps onto a window', !!platform])
  const handle = page.locator(`[data-window="${platform}"] [data-drag-handle]`)
  const rect = await handle.boundingBox()
  await page.mouse.move(rect.x + 20, rect.y + 15)
  await page.mouse.down()
  const falling = page.waitForFunction(() => document.querySelector('[data-wcat]')?.dataset.mode === 'fall', null, { timeout: 5000 }).then(() => true, () => false)
  await page.mouse.move(rect.x + 100, rect.y + 55, { steps: 10 })
  await page.mouse.up()
  checks.push(['moving the supporting window makes wcat fall', await falling])
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  mobile.on('pageerror', (e) => errors.push(e.message))
  await mobile.goto(url, { waitUntil: 'networkidle' })
  checks.push(...await checkMobileCat(mobile))
  await mobile.close()
  const reduced = await browser.newPage({ viewport: { width: 1365, height: 711 }, reducedMotion: 'reduce' })
  reduced.on('pageerror', (e) => errors.push(e.message))
  await reduced.goto(url, { waitUntil: 'networkidle' })
  const pet = reduced.locator('[data-wcat]')
  const r = await pet.boundingBox()
  await reduced.mouse.move(r.x + 22, r.y + 22)
  await reduced.mouse.down()
  await reduced.mouse.move(r.x + 200, r.y - 200, { steps: 10 })
  const droppedX = (await pet.boundingBox()).x
  await reduced.mouse.up()
  await reduced.waitForFunction(() => document.querySelector('[data-wcat]')?.dataset.form === 'cat')
  const reducedRect = await pet.boundingBox()
  checks.push(['reduced motion drops straight down without roaming', Math.abs(reducedRect.x - droppedX) <= 5 && await pet.getAttribute('data-mode') === 'sit'])
  checks.push(['no page errors', errors.length === 0])
  for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`)
  if (errors.length) console.error(errors)
  process.exitCode = checks.every(([, passed]) => passed) ? 0 : 1
} finally { await browser.close() }
