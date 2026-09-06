import { chromium } from 'playwright'
const browser = await chromium.launch()
const base = process.argv[2] || 'http://127.0.0.1:4173'
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, locale: 'en-US' })
    await page.goto(`${base}/?room=mobile-audit-${Date.now()}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    console.log(JSON.stringify(await page.evaluate(() => {
      const dock = document.querySelector('[data-sticker-dock]')?.getBoundingClientRect()
      return { viewport: [innerWidth, innerHeight], pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight, desktop: !!document.querySelector('[data-desktop]'),
        cards: [...document.querySelectorAll('[data-window]')].filter((el) => el.getBoundingClientRect().height).map((el) => ({ id: el.dataset.window, height: el.getBoundingClientRect().height })),
        nestedScrollers: [...document.querySelectorAll('[data-window] *')].filter((el) => getComputedStyle(el).overflowY === 'auto' && el.scrollHeight > el.clientHeight + 2).length,
        closeButtons: document.querySelectorAll('[data-window] button[aria-label^="Close"]').length,
        dock: dock?.toJSON(), canvases: document.querySelectorAll('canvas').length }
    }), null, 2))
    await page.screenshot({ path: `shot-mobile-before-${viewport.width}.png` })
    if (viewport.width < 768) {
      await page.locator('[data-window="work"] ul button').first().click()
      console.log('first project after tap', await page.locator('[data-window="splitwars"]').evaluate((el) => ({ top: el.getBoundingClientRect().top, scrollY })))
    }
    await page.close()
  }
} finally { await browser.close() }
