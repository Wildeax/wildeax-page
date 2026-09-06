// Imported by the browser gate. Every page already uses its throwaway room.
export async function checkDesktopCat(page) {
  const cat = page.locator('[data-wcat]')
  await cat.waitFor({ state: 'visible' })
  // Let Playwright wait for a stable, hittable pose. Sampling a bounding box
  // during an autonomous jump can aim the press at where the cat used to be.
  await cat.hover({ timeout: 15000 })
  const start = await cat.boundingBox()
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  const destination = { x: Math.min(start.x + 222, 1250), y: Math.max(70, start.y - 120) }
  await page.mouse.move(destination.x, destination.y, { steps: 12 })
  const lifted = await page.waitForFunction(() => {
    const el = document.querySelector('[data-wcat]')
    return el?.dataset.form === 'ball' && el.getAttribute('aria-pressed') === 'true'
  }, null, { timeout: 2000 }).then(() => true, () => false)
  await page.screenshot({ path: 'shot-wcat-ball.png' })
  // Resume movement after the screenshot, so the last 80 ms still describes
  // a throw. Start watching immediately on release, before another screenshot
  // can miss the floor pose and catch the next autonomous jump instead.
  await page.mouse.move(destination.x + 40, destination.y - 20, { steps: 3 })
  await page.mouse.up()
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
  const floor = await cat.evaluate((el) => Math.abs(el.getBoundingClientRect().bottom - (window.innerHeight - 8)) < 2)
  const viewport = await page.evaluate(() => innerWidth === document.documentElement.clientWidth)
  const cdp = await page.context().newCDPSession(page)
  const start = await cat.boundingBox()
  const x = start.x + start.width / 2
  const y = start.y + start.height / 2
  const touch = (type, py) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: py, id: 1 }] })
  await touch('touchStart', y)
  for (let i = 1; i <= 6; i++) await touch('touchMove', y - i * 24)
  await touch('touchEnd', y - 144)
  await page.waitForTimeout(350)
  const scrolled = await page.evaluate(() => window.scrollY > 30)
  const stayedCat = await cat.getAttribute('data-form') === 'cat'
  const before = await page.evaluate(() => window.scrollY)
  await touch('touchStart', y)
  await page.waitForTimeout(300)
  const lifted = await cat.getAttribute('data-form') === 'ball'
  for (let i = 1; i <= 6; i++) await touch('touchMove', y - i * 24)
  const dragged = await cat.getAttribute('aria-pressed') === 'true' && (await cat.boundingBox()).y < start.y - 100
  const heldScroll = await page.evaluate(() => window.scrollY)
  await touch('touchEnd', y - 144)
  const settled = await page.waitForFunction(() => {
    const el = document.querySelector('[data-wcat]')
    return el?.dataset.form === 'cat' && Math.abs(el.getBoundingClientRect().bottom - (innerHeight - 8)) < 2
  }, null, { timeout: 20000 }).then(() => true, () => false)
  const after = await cat.boundingBox()
  await page.screenshot({ path: 'shot-wcat-mobile.png' })
  await cdp.detach()
  return [
    ['mobile wcat sits at the viewport bottom', floor && Math.abs(after.y + after.height - 836) < 2],
    ['remote cursors do not widen the phone viewport', viewport],
    ['a swipe starting on wcat still scrolls', scrolled && stayedCat],
    ['long-press lifts and drags without scrolling', lifted && dragged && Math.abs(before - heldScroll) < 3],
    ['mobile wcat returns to cat form after release', settled],
  ]
}
