// Measures only frames that paint wcat, using the actual built page.
import { chromium } from 'playwright'
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 711 } })
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window)
    const setProperty = CSSStyleDeclaration.prototype.setProperty
    let current = null
    window.wcatFrameTimes = []
    CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
      if (current && name === '--wcat-facing') current.cat = true
      return setProperty.call(this, name, value, priority)
    }
    window.requestAnimationFrame = (callback) => raf((time) => {
      const frame = { cat: false }
      current = frame
      const start = performance.now()
      try { callback(time) } finally {
        if (frame.cat) window.wcatFrameTimes.push(performance.now() - start)
        current = null
      }
    })
  })
  const base = process.argv[2] || 'http://127.0.0.1:4173'
  await page.goto(`${base}/?room=wcat-profile-${Date.now()}`, { waitUntil: 'networkidle' })
  for (const id of ['art', 'contact']) await page.locator(`[data-icon="${id}"]`).click()
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-task="work"]').click()
    await page.locator('[data-window="work"] ul button').nth(i).click()
  }
  await page.waitForTimeout(500)
  await page.evaluate(() => { window.wcatFrameTimes = [] })
  await page.waitForTimeout(5000)
  const result = await page.evaluate(() => {
    const times = window.wcatFrameTimes.sort((a, b) => a - b)
    return {
      windows: document.querySelectorAll('[data-window]:not([hidden])').length,
      frames: times.length,
      meanMs: times.reduce((a, b) => a + b, 0) / times.length,
      p95Ms: times[Math.floor(times.length * 0.95)],
      maxMs: times.at(-1),
    }
  })
  console.log(JSON.stringify(result, null, 2))
  if (result.windows !== 10 || result.frames < 30) throw new Error('Profile did not exercise ten windows for enough frames')
} finally { await browser.close() }
