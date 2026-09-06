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
  // Freeze only time while targeting the current perch. Otherwise the pet can
  // leave during a screenshot, and a fast fall can land between observations.
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 16))
  const platform = await page.locator('[data-wcat]').getAttribute('data-ground')
  await page.screenshot({ path: 'shot-wcat-perched.png' })
  checks.push(['wcat autonomously jumps onto a window', !!platform])
  const handle = page.locator(`[data-window="${platform}"] [data-drag-handle]`)
  const rect = await handle.boundingBox()
  const point = await handle.evaluate((el) => {
    const r = el.getBoundingClientRect()
    for (let x = r.left + 12; x < r.right - 65; x += 24) {
      const top = document.elementFromPoint(x, r.top + 15)
      if (top?.closest('[data-drag-handle]') === el && !top.closest('button')) return { x, y: r.top + 15 }
    }
    return null
  })
  if (!point) throw new Error(`No exposed drag handle for the ${platform} perch`)
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + 80, point.y + 40, { steps: 10 })
  await page.clock.runFor(32)
  const moved = (await handle.boundingBox()).y - rect.y
  const falling = await page.locator('[data-wcat]').getAttribute('data-mode') === 'fall'
  await page.mouse.up()
  await page.clock.resume()
  if (!falling || moved < 30) console.log('support-removal diagnostics', { platform, point, moved, falling, cat: await page.locator('[data-wcat]').getAttribute('data-mode') })
  checks.push(['moving the supporting window makes wcat fall', falling && moved > 30])
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
