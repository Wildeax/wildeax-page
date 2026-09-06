// Measures callbacks that paint wcat; --toy also measures the private yarn loop.
import { chromium } from 'playwright'
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 711 } })
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window)
    const setProperty = CSSStyleDeclaration.prototype.setProperty
    let current = null
    window.wcatFrameTimes = []
    window.yarnFrameTimes = []
    CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
      if (current && name === '--wcat-facing') current.cat = true
      if (current && name === '--yarn-roll') current.yarn = true
      return setProperty.call(this, name, value, priority)
    }
    window.requestAnimationFrame = (callback) => raf((time) => {
      const frame = { cat: false }
      current = frame
      const start = performance.now()
      try { callback(time) } finally {
        if (frame.cat) window.wcatFrameTimes.push(performance.now() - start)
        if (frame.yarn) window.yarnFrameTimes.push(performance.now() - start)
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
  if (process.argv.includes('--toy')) await page.locator('[data-yarn-toggle]').click()
  await page.waitForTimeout(500)
  await page.evaluate(() => { window.wcatFrameTimes = []; window.yarnFrameTimes = [] })
  await page.waitForTimeout(5000)
  const result = await page.evaluate(() => {
    const summarize = (values) => {
      const times = values.sort((a, b) => a - b)
      return { frames: times.length,
        meanMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
        p95Ms: times[Math.floor(times.length * 0.95)], maxMs: times.at(-1) }
    }
    return { windows: document.querySelectorAll('[data-window]:not([hidden])').length,
      cat: summarize(window.wcatFrameTimes), yarn: summarize(window.yarnFrameTimes) }
  })
  console.log(JSON.stringify(result, null, 2))
  if (result.windows !== 10 || result.cat.frames < 30 || (process.argv.includes('--toy') && result.yarn.frames < 30)) throw new Error('Profile did not exercise ten windows and the requested loops for enough frames')
} finally { await browser.close() }
