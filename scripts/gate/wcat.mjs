// Imported by the browser gate. Every page already uses its throwaway room.
export async function checkDesktopCat(page) {
  const cat = page.locator('[data-wcat]')
  await cat.waitFor({ state: 'visible' })
  // Freeze only the clock during pointer targeting, not the pet's state.
  // On a slow browser the autonomous jump can move it between hover and
  // pointerdown. Resume ordinary frame timing before checking the flight.
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await cat.hover({ timeout: 15000 })
  const start = await cat.boundingBox()
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  const destination = { x: Math.min(start.x + 222, 1250), y: Math.max(70, start.y - 120) }
  await page.mouse.move(destination.x, destination.y, { steps: 12 })
  await page.clock.runFor(32)
  const lifted = await page.waitForFunction(() => {
    const el = document.querySelector('[data-wcat]')
    return el?.dataset.form === 'ball' && el.getAttribute('aria-pressed') === 'true'
  }, null, { timeout: 2000 }).then(() => true, () => false)
  await page.screenshot({ path: 'shot-wcat-ball.png' })
  // Resume movement after the screenshot, so the last 80 ms still describes
  // a throw. Start watching immediately on release, before another screenshot
  // can miss the floor pose and catch the next autonomous jump instead.
  for (let i = 1; i <= 3; i++) {
    await page.clock.runFor(16)
    await page.mouse.move(destination.x + i * 40 / 3, destination.y - i * 20 / 3)
  }
  await page.mouse.up()
  await page.clock.resume()
  const settled = await page.waitForFunction(() => {
    const el = document.querySelector('[data-wcat]')
    if (el?.dataset.form !== 'cat' || el.dataset.ground !== 'floor') return false
    const root = document.querySelector('[data-desktop]').getBoundingClientRect()
    return Math.abs(el.getBoundingClientRect().bottom - (root.bottom - 44)) < 2
  }, null, { timeout: 20000 }).then(() => true, () => false)
  if (!settled) console.log('wcat failed to settle:', await cat.evaluate((el) => ({ form: el.dataset.form, mode: el.dataset.mode, ground: el.dataset.ground, rect: el.getBoundingClientRect().toJSON() })))
  await page.screenshot({ path: 'shot-wcat-desktop.png' })
  return [['wcat lifts into a ball on desktop', lifted], ['wcat settles back into a cat on the floor', settled]]
}

export async function checkMobileCat(page) {
  const cat = page.locator('[data-wcat]')
  await cat.waitFor({ state: 'visible' })
  const floor = await cat.evaluate((el) => Math.abs(el.getBoundingClientRect().bottom - (document.querySelector('[data-mobile-tools]').getBoundingClientRect().top - 8)) < 2)
  const viewport = await page.evaluate(() => innerWidth === document.documentElement.clientWidth)
  const cdp = await page.context().newCDPSession(page)
  const start = await cat.boundingBox()
  let x = start.x + start.width / 2
  let y = start.y + start.height / 2
  const touch = (type, py) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: py, id: 1 }] })
  await touch('touchStart', y)
  for (let i = 1; i <= 6; i++) await touch('touchMove', y - i * 24)
  await touch('touchEnd', y - 144)
  // Finish the swipe's inertia before measuring a separate held gesture.
  // A fixed delay races Chromium's compositor on a busy machine.
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = scrollY, stable = 0
    const timeout = setTimeout(() => reject(new Error('mobile swipe did not settle')), 3000)
    const frame = () => {
      stable = Math.abs(scrollY - previous) < 0.5 ? stable + 1 : 0
      previous = scrollY
      if (stable >= 10) { clearTimeout(timeout); resolve() }
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }))
  const scrolled = await page.evaluate(() => window.scrollY > 30)
  const stayedCat = await cat.getAttribute('data-form') === 'cat'
  const before = await page.evaluate(() => window.scrollY)
  const holdStart = await cat.boundingBox()
  x = holdStart.x + holdStart.width / 2
  y = holdStart.y + holdStart.height / 2
  await touch('touchStart', y)
  await page.waitForTimeout(300)
  const lifted = await cat.getAttribute('data-form') === 'ball'
  for (let i = 1; i <= 6; i++) await touch('touchMove', y - i * 24)
  const dragged = await cat.getAttribute('aria-pressed') === 'true' && (await cat.boundingBox()).y < holdStart.y - 100
  const heldScroll = await page.evaluate(() => window.scrollY)
  if (!lifted || !dragged || Math.abs(before - heldScroll) >= 3) console.log('mobile hold diagnostics:', { lifted, dragged, before, heldScroll, start, current: await cat.boundingBox() })
  await touch('touchEnd', y - 144)
  const settled = await page.waitForFunction(() => {
    const el = document.querySelector('[data-wcat]')
    const support = el?.dataset.ground
    const heading = [...document.querySelectorAll('[data-mobile-card]')].find((card) => card.dataset.window === support)?.querySelector('h2')
    const y = support === 'floor' ? document.querySelector('[data-mobile-tools]').getBoundingClientRect().top - 8 : heading?.getBoundingClientRect().top
    return el?.dataset.form === 'cat' && Math.abs(el.getBoundingClientRect().bottom - y) < 2
  }, null, { timeout: 20000 }).then(() => true, () => false)
  await page.screenshot({ path: 'shot-wcat-mobile.png' })
  await cdp.detach()
  return [
    ['mobile wcat starts above the phone toolbar', floor],
    ['remote cursors do not widen the phone viewport', viewport],
    ['a swipe starting on wcat still scrolls', scrolled && stayedCat],
    ['long-press lifts and drags without scrolling', lifted && dragged && Math.abs(before - heldScroll) < 3],
    ['mobile wcat returns to cat form after release', settled],
  ]
}
