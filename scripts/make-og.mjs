// Generates public/og.jpg (1200x630) for wildeax.com link previews.
// Run from the repo root when the portrait or the copy changes:
//   node scripts/make-og.mjs
// sharp is transitive here, not a declared dep. The PNG is committed, so a
// missing sharp only blocks regeneration, never the build.
import sharp from 'sharp'
import { statSync } from 'node:fs'

const W = 1200, H = 630
const PORTRAIT = 'src/assets/img/wildeax portrait2.jpg'
const OUT = 'public/og.jpg'

const PANEL_W = 500          // photo panel, flush to the right edge
const PANEL_X = W - PANEL_W
const FADE_W = 250           // gradient that blends the panel's hard left edge
const X = 88                 // left text margin

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const FONT = "'Segoe UI','Helvetica Neue',Arial,sans-serif"

const bg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cyan" cx="14%" cy="10%" r="75%">
      <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.44"/>
      <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="violet" cx="55%" cy="95%" r="70%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#0b0e12"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#cyan)"/>
  <rect width="${W}" height="${H}" fill="url(#violet)"/>
</svg>`)

// Alpha ramp for the photo's left edge. Painting a dark rect over the photo
// instead would just move the seam, because the background there is blue, not
// #0b0e12. Fading the photo's own alpha lets it dissolve into whatever is behind.
const photoMask = Buffer.from(`<svg width="${PANEL_W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="${FADE_W}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="${FADE_W}" height="${H}" fill="url(#m)"/>
  <rect x="${FADE_W}" width="${PANEL_W - FADE_W}" height="${H}" fill="#ffffff"/>
</svg>`)

const text = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${X}" y="196" width="64" height="5" rx="2.5" fill="#38bdf8"/>
  <text x="${X}" y="300" font-family="${FONT}" font-size="94" font-weight="800"
        letter-spacing="6" fill="#ffffff">WILDEAX</text>
  <text x="${X}" y="352" font-family="${FONT}" font-size="33" font-weight="600"
        fill="#7dd3fc">${esc('Digital Artist & Developer')}</text>
  <text x="${X}" y="410" font-family="${FONT}" font-size="25" fill="#94a0b0">Unity games, desktop apps,</text>
  <text x="${X}" y="444" font-family="${FONT}" font-size="25" fill="#94a0b0">and the backends behind them.</text>
  <text x="${X}" y="516" font-family="${FONT}" font-size="23" font-weight="600"
        letter-spacing="1.5" fill="#5b6472">wildeax.com</text>
</svg>`)

// 850x832 source into a 500x630 panel: cover scales by height, so the full
// vertical composition survives and only the sides are trimmed. ensureAlpha is
// required because the source is a JPEG and dest-in needs an alpha channel.
const photo = await sharp(PORTRAIT)
  .resize(PANEL_W, H, { fit: 'cover', position: 'centre' })
  .ensureAlpha()
  .composite([{ input: photoMask, blend: 'dest-in' }])
  .png()
  .toBuffer()

await sharp(bg)
  .composite([
    { input: photo, left: PANEL_X, top: 0 },
    { input: text, left: 0, top: 0 },
  ])
  // JPEG, not PNG: the card is mostly photograph, and PNG lands over 880KB.
  // 4:4:4 keeps the headline text edges crisp instead of smearing them.
  .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
  .toFile(OUT)

const { width, height } = await sharp(OUT).metadata()
const bytes = statSync(OUT).size
console.log(`${OUT} ${width}x${height} ${Math.round(bytes / 1024)}KB`)
if (width !== W || height !== H) throw new Error(`expected ${W}x${H}, got ${width}x${height}`)
// Twitter caps og:image at 5MB, Discord fetches lazily above ~1MB.
if (bytes > 900_000) throw new Error(`${bytes} bytes is too large for reliable preview fetching`)
