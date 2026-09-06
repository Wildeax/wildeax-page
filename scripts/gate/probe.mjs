// Read-only probe of the REAL room: no drags, no writes. Reports what a
// visitor's browser sees so a "nothing moves" report can be pinned down.
import { chromium } from 'playwright'
const url = process.argv[2] ?? 'https://www.wildeax.com/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)) })
page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url() + ' ' + (r.failure()?.errorText ?? '')))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
const info = await page.evaluate(() => {
  const q = (s) => document.querySelector(s)
  const qa = (s) => [...document.querySelectorAll(s)]
  const topAt = (x, y) => { const el = document.elementFromPoint(x, y); return el ? el.tagName + '.' + [...el.classList].slice(0, 4).join('.') + (el.dataset ? ' ' + JSON.stringify(el.dataset) : '') : null }
  const work = q('[data-window="work"]')
  const handle = work?.querySelector('[data-drag-handle]')
  const hr = handle?.getBoundingClientRect()
  const cs = handle ? getComputedStyle(handle) : null
  const fixed = qa('body *').filter((el) => { const s = getComputedStyle(el); return s.position === 'fixed' && el.getBoundingClientRect().width >= innerWidth - 2 && el.getBoundingClientRect().height >= innerHeight - 100 }).map((el) => el.tagName + '.' + [...el.classList].join('.') + ' z=' + getComputedStyle(el).zIndex + ' pe=' + getComputedStyle(el).pointerEvents)
  return {
    desktop: !!q('[data-desktop]'), dialogs: qa('[role="dialog"]').length,
    visible: qa('[role="dialog"]').filter((d) => d.offsetParent !== null || getComputedStyle(d).display !== 'none').map((d) => d.dataset.window),
    contextMenu: !!q('[data-context-menu]'), marquee: !!q('[data-marquee]'),
    fullScreenFixed: fixed,
    handleRect: hr && { x: hr.x, y: hr.y, w: hr.width, h: hr.height },
    handlePointerEvents: cs?.pointerEvents, handleCursor: cs?.cursor,
    elementAtHandle: hr && topAt(hr.x + hr.width / 2, hr.y + hr.height / 2),
    elementAtIcon: (() => { const r = q('[data-icon="art"]')?.getBoundingClientRect(); return r && topAt(r.x + r.width / 2, r.y + r.height / 2) })(),
    playAnchors: qa('[data-play-anchor]').length,
    playhtmlIds: qa('[data-play-anchor][id]').length,
    cursorsLayer: !!q('#playhtml-cursors, [id*="cursor"]'),
    stickers: qa('[data-sticker]').length,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    ua: navigator.userAgent.slice(0, 60),
  }
})
console.log(JSON.stringify(info, null, 2))
console.log('errors/warnings:', errors.length ? '\n' + errors.join('\n') : 'none')
await page.screenshot({ path: 'shot-9-prod-realroom.png' })
await browser.close()
