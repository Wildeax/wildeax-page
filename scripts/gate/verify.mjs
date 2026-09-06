// Drives the WILDEAX OS preview in real Chromium and reports what a visitor
// would actually see. Usage: node verify.mjs <preview-url>
import { chromium } from 'playwright'

const base = process.argv[2]
if (!base) throw new Error('usage: node verify.mjs <url>')
// A fresh room every run. The room is shared across every host serving the
// Worker, so without this each run rearranges the author's real desktop.
const room = `verify-${Date.now().toString(36)}`
const url = `${base.replace(/\/$/, '')}/?room=${room}`
console.log(`room: ${room}`)

const browser = await chromium.launch()
// Every early exit must still close the browser, or headless Chromium
// instances pile up and starve the machine. A run that threw mid-way left
// enough of them behind to OOM an unrelated Vitest process.
process.on('uncaughtException', async (e) => { console.error(e); await browser.close().catch(() => {}); process.exit(2) })
process.on('unhandledRejection', async (e) => { console.error(e); await browser.close().catch(() => {}); process.exit(2) })
const page = await browser.newPage({ viewport: { width: 1365, height: 711 } })
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

const snapshot = async (label) => {
  const s = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0
    }
    const wins = [...document.querySelectorAll('[data-window]')].map((el) => ({
      id: el.dataset.window,
      visible: vis(el),
      hiddenAttr: el.hasAttribute('hidden'),
      wrapperVisibility: getComputedStyle(el.closest('[data-win-wrapper]')).visibility,
      z: getComputedStyle(el.closest('[data-win-wrapper]')).zIndex,
    }))
    const tasks = [...document.querySelectorAll('[data-task]')].map((b) => ({
      id: b.dataset.task, minimized: b.hasAttribute('data-minimized'),
    }))
    return { wins, tasks, icons: document.querySelectorAll('[data-icon]').length }
  })
  console.log(`\n=== ${label} ===`)
  console.log('visible windows :', s.wins.filter((w) => w.visible).map((w) => `${w.id}(z${w.z})`).join(' '))
  console.log('hidden windows  :', s.wins.filter((w) => !w.visible).map((w) => w.id).join(' '))
  console.log('taskbar         :', s.tasks.map((t) => t.id + (t.minimized ? '*' : '')).join(' '), '(* = minimized)')
  console.log('desktop icons   :', s.icons)
  return s
}

const s0 = await snapshot('on load')
await page.screenshot({ path: 'shot-1-load.png' })

// Layout: no visible window may cover the icon column, sit under the taskbar,
// or run off the right edge. This is what made me.jpg's flight invisible.
const layout = await page.evaluate(() => {
  const vh = window.innerHeight, vw = window.innerWidth
  const taskTop = document.querySelector('[data-taskbar] > div').getBoundingClientRect().top
  return [...document.querySelectorAll('[data-window]')]
    .filter((el) => getComputedStyle(el).display !== 'none')
    .map((el) => {
      const r = el.getBoundingClientRect()
      return { id: el.dataset.window, left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom),
               coversIcons: r.left < 108, underTaskbar: r.bottom > taskTop, offRight: r.right > vw, taskTop: Math.round(taskTop), vh, vw }
    })
})
console.log(`
layout at ${layout[0]?.vw}x${layout[0]?.vh}, taskbar top ${layout[0]?.taskTop}:`)
for (const l of layout) console.log(`  ${l.id.padEnd(8)} left ${String(l.left).padStart(4)} right ${String(l.right).padStart(4)} bottom ${String(l.bottom).padStart(4)}` +
  (l.coversIcons ? '  COVERS ICONS' : '') + (l.underTaskbar ? '  UNDER TASKBAR' : '') + (l.offRight ? '  OFF RIGHT' : ''))

// Minimize me.jpg: capture mid-flight and after.
await page.click('[data-window="me"] button[aria-label^="Minimize"]')
await page.waitForTimeout(220)
await page.screenshot({ path: 'shot-2-me-midflight.png' })
const midClass = await page.getAttribute('[data-win-wrapper="me"]', 'class')
console.log('\nme.jpg wrapper class mid-flight:', midClass)
await page.waitForTimeout(600)
const s1 = await snapshot('after minimizing me.jpg')
await page.screenshot({ path: 'shot-3-me-minimized.png' })

// Restore it from the taskbar.
await page.click('[data-task="me"]')
await page.waitForTimeout(700)
const s2 = await snapshot('after restoring me.jpg from taskbar')

// Close readme.
await page.click('[data-window="readme"] button[aria-label^="Close"]')
await page.waitForTimeout(400)
const s3 = await snapshot('after closing readme')

// Open a project from work.exe.
await page.click('[data-window="work"] button:has-text("Splitwars")')
await page.waitForTimeout(500)
const s4 = await snapshot('after opening Splitwars from work.exe')
await page.screenshot({ path: 'shot-4-final.png' })

// Drag work.exe by its title bar and confirm it moved.
const before = await page.evaluate(() => document.querySelector('[data-window="work"]').getBoundingClientRect().left)
const title = await page.locator('[data-window="work"] span.truncate').first().boundingBox()
const under = await page.evaluate(([x, y]) => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return `(${Math.round(r.left)},${Math.round(r.top)}) ${Math.round(r.width)}x${Math.round(r.height)}` }
  const describe = (el) => {
    if (!el) return 'nothing'
    const wrapper = el.closest('[data-win-wrapper]')?.getAttribute('data-win-wrapper')
    const win = el.closest('[data-window]')?.getAttribute('data-window')
    const z = el.closest('[data-win-wrapper]') ? getComputedStyle(el.closest('[data-win-wrapper]')).zIndex : '-'
    return `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').slice(0, 3).join('.')} wrapper=${wrapper ?? 'none'}(z${z}) window=${win ?? 'none'} rect=${rect(el)}`
  }
  const workWin = document.querySelector('[data-window="work"]')
  const stack = document.elementsFromPoint(x, y).slice(0, 4).map(describe)
  return {
    point: `(${Math.round(x)},${Math.round(y)})`,
    workWindow: rect(workWin),
    workWrapper: rect(workWin.closest('[data-win-wrapper]')),
    top: describe(document.elementFromPoint(x, y)),
    stack,
  }
}, [title.x + 10, title.y + 8])
console.log(`\nbefore dragging work.exe at ${under.point}:`)
console.log(`  work window rect ${under.workWindow}, its wrapper rect ${under.workWrapper}`)
console.log(`  top element: ${under.top}`)
for (const s of under.stack) console.log(`    stack: ${s}`)
await page.mouse.move(title.x + 10, title.y + 8)
await page.mouse.down()
await page.mouse.move(title.x + 60, title.y + 48, { steps: 8 })
await page.mouse.move(title.x + 130, title.y + 88, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(300)
const after = await page.evaluate(() => document.querySelector('[data-window="work"]').getBoundingClientRect().left)
console.log(`\ndrag work.exe: left ${Math.round(before)} -> ${Math.round(after)} (${after > before + 50 ? 'MOVED' : 'DID NOT MOVE'})`)

// Minimize a window that has been DRAGGED. The flight must animate the visible
// window, not the authored anchor box, or a dragged window is clipped to
// nothing on frame one and simply vanishes. This is the case the author hit.
await page.click('[data-window="work"] button:has-text("ERP")')
await page.waitForTimeout(450)
const posTitle = await page.locator('[data-window="pos"] span.truncate').first().boundingBox()
await page.mouse.move(posTitle.x + 10, posTitle.y + 8)
await page.mouse.down()
await page.mouse.move(posTitle.x + 90, posTitle.y + 60, { steps: 8 })
await page.mouse.move(posTitle.x + 190, posTitle.y + 130, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(300)
const rectOf = (sel) => page.evaluate((q) => {
  const r = document.querySelector(q).getBoundingClientRect()
  return { w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
}, sel)
const dist = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy)
const posStart = await rectOf('[data-win-box="pos"]')
const posDock = await rectOf('[data-task="pos"]')
// Sample the box every animation frame INSIDE the page. Playwright round-trips
// and screenshots take hundreds of ms, which is longer than the 440ms flight,
// so sampling from outside cannot see where the window went.
await page.evaluate(() => {
  const box = document.querySelector('[data-win-box="pos"]')
  const t0 = performance.now()
  window.__flight = []
  const tick = () => {
    const r = box.getBoundingClientRect()
    window.__flight.push({ t: performance.now() - t0, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2,
      cls: box.className || '' })
    // Long enough to outlast Playwright's click latency plus the 440ms flight.
    if (performance.now() - t0 < 1500) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
await page.click('[data-window="pos"] button[aria-label^="Minimize"]')
await page.waitForTimeout(1600)
const flight = await page.evaluate(() => window.__flight)
const inFlight = flight.filter((f) => f.cls.includes('os-flight-minimize'))
const r = (n) => Math.round(n)
const closest = inFlight.reduce((best, f) => (dist(f, posDock) < dist(best, posDock) ? f : best), inFlight[0] ?? posStart)
const smallest = inFlight.reduce((best, f) => (f.w < best.w ? f : best), inFlight[0] ?? posStart)
const flightSpan = inFlight.length ? `${r(inFlight[0].t)}ms to ${r(inFlight[inFlight.length - 1].t)}ms` : 'never had the class'
console.log(`\ndragged pos.exe minimize (${flight.length} frames sampled, ${inFlight.length} with the flight class, present ${flightSpan}):`)
console.log(`  start    ${r(posStart.w)}x${r(posStart.h)} centre (${r(posStart.cx)},${r(posStart.cy)})  dock centre (${r(posDock.cx)},${r(posDock.cy)})  distance ${r(dist(posStart, posDock))}`)
for (const f of inFlight.filter((_, i) => i % 4 === 0)) {
  console.log(`  ${String(r(f.t)).padStart(4)}ms ${r(f.w)}x${r(f.h)} centre (${r(f.cx)},${r(f.cy)})  distance ${r(dist(f, posDock))}`)
}
console.log(`  closest approach ${r(dist(closest, posDock))}px at ${r(closest.t)}ms; smallest ${r(smallest.w)}x${r(smallest.h)} at ${r(smallest.t)}ms`)
const s5 = await snapshot('after minimizing the dragged pos.exe')

// Once more, for a mid-flight screenshot to look at.
await page.click('[data-task="pos"]')
await page.waitForTimeout(600)
await page.click('[data-window="pos"] button[aria-label^="Minimize"]')
await page.waitForTimeout(200)
await page.screenshot({ path: 'shot-5-dragged-minimize-midflight.png' })
await page.waitForTimeout(500)

// Rubber-band selection on empty wallpaper, and right-click -> Refresh putting a
// dragged icon back where it was authored. The region (1180..1340, 500..630) is
// clear of every window at this viewport, including the ones dragged above.
const artBefore = await page.locator('[data-icon="art"]').boundingBox()
await page.mouse.move(artBefore.x + 20, artBefore.y + 20)
await page.mouse.down()
await page.mouse.move(artBefore.x + 60, artBefore.y + 30, { steps: 6 })
await page.mouse.move(artBefore.x + 140, artBefore.y + 40, { steps: 6 })
await page.mouse.up()
await page.waitForTimeout(300)
const artDragged = await page.locator('[data-icon="art"]').boundingBox()

await page.mouse.move(1180, 500)
await page.mouse.down()
await page.mouse.move(1260, 560, { steps: 4 })
await page.mouse.move(1340, 630, { steps: 4 })
const marqueeMid = await page.evaluate(() => {
  const m = document.querySelector('[data-marquee]')
  if (!m) return null
  const r = m.getBoundingClientRect()
  return { w: Math.round(r.width), h: Math.round(r.height) }
})
await page.screenshot({ path: 'shot-7-marquee.png' })
await page.mouse.up()
await page.waitForTimeout(100)
const marqueeAfter = await page.evaluate(() => !!document.querySelector('[data-marquee]'))

await page.mouse.click(1250, 560, { button: 'right' })
await page.waitForTimeout(150)
const menuShown = await page.evaluate(() => !!document.querySelector('[data-context-menu] [role="menuitem"]'))
await page.screenshot({ path: 'shot-8-context-menu.png' })
await page.click('[data-context-menu] [role="menuitem"]')
await page.waitForTimeout(500)
const menuGone = await page.evaluate(() => !document.querySelector('[data-context-menu]'))
const artAfter = await page.locator('[data-icon="art"]').boundingBox()
console.log(`\nicon drag + refresh: art left ${Math.round(artBefore.x)} -> dragged ${Math.round(artDragged.x)} -> after Refresh ${Math.round(artAfter.x)}`)
console.log(`marquee mid-drag: ${marqueeMid ? marqueeMid.w + 'x' + marqueeMid.h : 'none'}; present after release: ${!marqueeAfter ? 'no' : 'YES'}; menu shown: ${menuShown}; menu closed after Refresh: ${menuGone}`)

// Mobile: the same windows as a scrolling stack of cards, no taskbar, no drag.
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
mobile.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`))
await mobile.goto(url, { waitUntil: 'networkidle' })
await mobile.waitForTimeout(800)
const m = await mobile.evaluate(() => ({
  dialogs: document.querySelectorAll('[data-window]').length,
  visibleDialogs: [...document.querySelectorAll('[data-window]')].filter((el) => getComputedStyle(el).display !== 'none').length,
  taskbar: !!document.querySelector('[data-taskbar]'),
  icons: document.querySelectorAll('[data-icon]').length,
  langToggle: !!document.querySelector('button[aria-label="Switch language"]'),
  scrollable: document.documentElement.scrollHeight > window.innerHeight,
  widestCard: Math.max(...[...document.querySelectorAll('[data-window]')].map((el) => el.getBoundingClientRect().width)),
  viewport: window.innerWidth,
}))
await mobile.screenshot({ path: 'shot-6-mobile.png', fullPage: false })
console.log(`\nmobile 390x844: ${m.visibleDialogs}/${m.dialogs} cards visible, taskbar=${m.taskbar}, icons=${m.icons}, langToggle=${m.langToggle}, page scrolls=${m.scrollable}, widest card ${Math.round(m.widestCard)}px of ${m.viewport}`)
await mobile.close()

const checks = [
  // Logged but never asserted the first time, which let a regression through:
  // the cancel selector treated icons (buttons) as un-draggable for days.
  ['desktop icon can be dragged', artDragged.x > artBefore.x + 60],
  ['Refresh puts the dragged icon back where it was authored', Math.abs(artAfter.x - artBefore.x) < 3],
  ['marquee draws while dragging on wallpaper and disappears on release', !!marqueeMid && marqueeMid.w > 100 && !marqueeAfter],
  ['right-click on wallpaper shows the menu, Refresh closes it', menuShown && menuGone],
  ['mobile shows every window as a card', m.visibleDialogs === m.dialogs && m.dialogs === s0.wins.length],
  ['mobile has no taskbar and no desktop icons', !m.taskbar && m.icons === 0],
  ['mobile keeps the language toggle', m.langToggle],
  ['mobile page scrolls (it is a stack, not a locked desktop)', m.scrollable],
  ['mobile cards fit the viewport width', m.widestCard <= m.viewport],
  ['dragged window flies to ITS button (closest approach under 15% of start distance)', dist(closest, posDock) < dist(posStart, posDock) * 0.15],
  ['dragged window collapses during the flight (min width under 20% of start)', smallest.w < posStart.w * 0.2],
  ['dragged window hidden and marked minimized after flight', !s5.wins.find((w) => w.id === 'pos').visible && s5.tasks.some((t) => t.id === 'pos' && t.minimized)],
  ['3 windows visible on load', s0.wins.filter((w) => w.visible).length === 3],
  ['every other window hidden on load', s0.wins.filter((w) => !w.visible).length === s0.wins.length - 3],
  ['taskbar lists exactly the 3 open', s0.tasks.length === 3],
  ['me.jpg hidden after minimize', !s1.wins.find((w) => w.id === 'me').visible],
  ['me.jpg still in taskbar, marked minimized', s1.tasks.some((t) => t.id === 'me' && t.minimized)],
  ['me.jpg visible after restore', s2.wins.find((w) => w.id === 'me').visible],
  ['readme gone from taskbar after close', !s3.tasks.some((t) => t.id === 'readme')],
  ['readme hidden after close', !s3.wins.find((w) => w.id === 'readme').visible],
  ['splitwars visible after opening from work.exe', s4.wins.find((w) => w.id === 'splitwars').visible],
  ['work.exe moved when dragged by title', after > before + 50],
  ['no open window covers the icon column', layout.every((l) => !l.coversIcons)],
  ['no open window sits under the taskbar', layout.every((l) => !l.underTaskbar)],
  ['no open window runs off the right edge', layout.every((l) => !l.offRight)],
  ['no page errors', errors.length === 0],
]
console.log('\n=== CHECKS ===')
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
if (errors.length) console.log('\nerrors:\n' + errors.join('\n'))
await browser.close()
process.exit(checks.every(([, ok]) => ok) ? 0 : 1)
