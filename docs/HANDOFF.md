# Hand-off: wildeax.com (WILDEAX OS)

Updated 2026-09-06 after publishing wcat and the mobile/sticker fixes.
Read this first. It says what exists, where it is, how to
check it, and what is pending.

## What this is

wildeax.com is the owner's portfolio, rendered as a fictional operating
system desktop. Windows open, drag by their title bar, minimize into the
taskbar with a genie animation, and close. Visitors share window and icon
positions through playhtml. Stickers are shared within each layout, not
between mobile and desktop. Which windows are open
is per visitor. On phones the same content is a scrolling stack of cards.

The owner is a game designer and UX/UI designer first. Every line of copy
positions them that way. The pharmacy ERP project is described as "replacing
a legacy .NET point of sale and ERP", and the words "decompiled source" must
never appear anywhere public.

## Where things are

| Thing | Location |
|---|---|
| Repo | `D:\Projects\Wildeax\Porfolio\Webpage\wildeax-page`, remote `github.com/Wildeax/wildeax-page`, branch `main` |
| Production | Cloudflare Worker `wildeax-page`, served at `https://www.wildeax.com`. Apex 301s to www through an account-level Bulk Redirect list |
| Production version | Worker version `5ce57800-77ec-412e-8293-f2bc146672f4`, 100% traffic. Runtime commit `781b2fe`, merged via PR #2 at `28a0e2d` |
| Mobile/sticker preview | Version `5ce57800-77ec-412e-8293-f2bc146672f4`, runtime code from `781b2fe`. Use `https://5ce57800-wildeax-page.arena-riot-proxy.workers.dev/?room=mobile-review-5ce57800` |
| Shared room | `wildeax-2` in `src/play/room.ts`. Bump `DEFAULT_ROOM` to reset every visitor's positions |
| Desktop code | `src/os/` (Desktop, Window, Taskbar, DesktopIcon, registry, windowState, marquee) |
| Play layer | `src/play/` (PlayableSurface drag, sync.tsx is the only playhtml importer, StickerLayer) |
| Copy, both languages | `src/i18n/resources.ts` |
| OG image generator | `scripts/make-og.mjs` → `public/og.jpg` |
| Browser gate | `scripts/gate/verify.mjs` and `probe.mjs` (moved in from a scratchpad today) |
| Design docs | `docs/superpowers/specs/`, plans in `docs/superpowers/plans/` |
| Cloudflare API key | `~/.cloudflare/token.txt`, X-Auth-Key header pair, details in the global CLAUDE.md |

## Commands

```bash
npm run dev                                  # Vite dev server
npx vitest run --maxWorkers=1 --silent       # 217 tests. One worker: this PC runs near its memory limit
npm run build                                # tsc -b && vite build
npx wrangler versions upload                 # preview URL, does not touch production
npx wrangler deploy                          # PRODUCTION. Needs the owner's explicit yes, every time

cd scripts/gate && npm i && npx playwright install chromium
node verify.mjs https://<preview>.workers.dev   # 33 checks, exit 0 when green
node verify-wcat.mjs https://<preview>.workers.dev # focused pet interactions
node verify-wcat-behavior.mjs https://<preview>.workers.dev # sleep, wake, poke, pet, hunting
node verify-wcat-handling.mjs https://<preview>.workers.dev # placement, gaze, tail, peeks, dizziness, app visits
node verify-stickers-tail.mjs https://<preview>.workers.dev # shared removal and flat rear tail
node verify-wcat-toy.mjs https://<preview>.workers.dev # local yarn play and selection walls/perches
node verify-mobile.mjs https://<preview>.workers.dev # 50 mobile/sticker checks, including a failing legacy control
node profile-wcat.mjs https://<preview>.workers.dev # ten-window callback timings
node profile-wcat.mjs https://<preview>.workers.dev --toy # separate cat and yarn timings
node verify.mjs https://www.wildeax.com          # post-deploy smoke in an isolated room
node probe.mjs https://www.wildeax.com           # read-only snapshot of the real room
```

The gate always opens `?room=verify-<timestamp>`, a throwaway playhtml room.
Never drag anything in the real room from a script: it moves the owner's and
every visitor's desktop. The probe script is read-only for that reason.

playhtml also prefixes rooms with the host. Preview data does not transfer
to www. The mobile gate routes the old build's document/assets into isolated
target-origin pages to test a real upgrade with old data. Room overrides
must match 1–40 letters, digits or hyphens; invalid values fall back to live.

Gate sequence before any production deploy: tests green, build green,
`versions upload`, `verify.mjs` against the preview, then ask.
The owner explicitly approved deployment of this session's mobile fixes;
that approval does not carry into unrelated work or future sessions.

There are no GitHub Actions workflows. Cloudflare's external "Workers
Builds: wildeax-page" check fails on both the prior main (`5a35ff9`) and
this branch. The existing Wrangler OAuth credential cannot read Builds
logs (HTTP 403), so the cause is unverified. Local tests/build and manual
preview upload succeed. Do not describe hosted CI as green. Check the
Cloudflare build dashboard before changing that automation or credentials.

## Things learned the hard way

- Vitest and esbuild get killed by the OS when free memory drops under
  1 GB. `--maxWorkers=1` is the workaround, not a preference.
- Bash heredocs on this machine eat backslashes. Use `apply_patch` for edits.
- A CSS `transform` creates a stacking context, so a window's z-index must
  live on the wrapper outside the drag transform.
- Tailwind's `.flex` beats the `[hidden]` attribute. Hidden windows use
  inline `display: none` plus `visibility: hidden` on the wrapper.
- Buttons, links and inputs never start a drag. An element that is both a
  button and the thing you drag (a desktop icon) opts back in with
  `data-drag-ok`.
- Zen or Firefox can keep an old tab alive across deploys. "Nothing reacts"
  after a deploy means hard reload first (Ctrl+Shift+R), then investigate.
  The edge serves the current bundle for every encoding; checked today.

## wcat release

1. **wcat** (the pet). Approved, merged via PR #1 and published as `33cf49c7`.
   See `docs/superpowers/specs/2026-09-05-wcat-design.md` and the verification
   records in `docs/superpowers/plans/2026-09-05-wcat.md` and
   `docs/superpowers/plans/2026-09-05-wcat-behavior.md` and
   `docs/superpowers/plans/2026-09-05-wcat-handling.md` and
   `docs/superpowers/plans/2026-09-05-wcat-toy.md`. The current build and
   217 tests pass. Full lint retains its 19 baseline
   errors and one warning; changed TypeScript files lint cleanly. The first
   art pass uses the documented silhouette because the body reference is
   still missing. Ask for that image for visual refinement. Further releases
   outside this session require the owner's approval.
   Preview feedback replaced constant eye tracking with short glances,
   removed parked-pointer following, and added click/tap poking, gentle
   head-stroke petting, and nearby-wiggle stalking/crouching/pouncing.
   Sleep now shows rising `zZZ`, followed by half-open eyes during waking.
   Phones can nap without roaming; reduced-motion sleep marks remain still.
   Enter pokes, Space lifts/drops, arrows move a held cat, Escape drops.
   The latest pass adds gentle placement with a landing hint, short live
   attention bouts, a bending SVG tail, deliberate petting and dizziness
   only after hard spinning throws. Window edges have a 40% look-down pause.
   Right-click a placed emoji to remove that shared instance. The tail now
   attaches behind the body and swishes in a flat plane above the feet.
   The new yarn palette control toggles one private toy with a trailing
   physics string. Throws invite brief pursuit, crouching, pouncing and
   batting, followed by boredom and a cooldown. Phones retain the quiet
   bottom-edge cat. A live selection rectangle blocks rolling and supports
   the cat on top until selection ends. No runtime dependency was added.
   Exposed closed app icons can invite an inspection and optional entry.
   New apps qualify on a busy desktop; revisits require fewer than two open
   windows. A small badge marks the app. Opening it reveals the cat inside,
   closing/minimizing returns it to the badge, and dragging outside releases
   it to the desktop. Visits are local to the page session.
   The original release passed 128 preview checks: 33 main, 11 focused, 21 behavior,
   26 handling/app-visit, 17 sticker/tail and 20 yarn/selection checks.
   Results are in the toy plan. PR: `https://github.com/Wildeax/wildeax-page/pull/1`.

## Mobile/sticker follow-up

Published at 2026-09-06 05:06 UTC. The exact tested preview was promoted to
100% production traffic. All 178 preview browser checks passed; all 50
mobile/isolation checks passed again on www after deployment. The live
response returned HTTP 200 and bundle `index-9evkaNL8.js`. A read-only check
of the default shared room found its two stickers intact, a 1365×711 page
in a 1365×711 viewport, zero scroll and no browser runtime errors.

The release keeps desktop placements in `wildeax-stickers` and uses
`wildeax-stickers-mobile` for mobile. No collections are reset or deleted.
Both layers clip remote out-of-bounds data, and the desktop home page cannot
scroll. Phones have content-height cards, working section/project links,
a collapsed Play tray, Cancel and touch sticker removal. Holding a sticker,
the cat or yarn allows dragging without scrolling the page; ordinary swipes
still scroll. Landscape phones stay mobile, safe areas are respected and
the mobile wallpaper no longer runs WebGL. The cat remains private.
See `docs/superpowers/plans/2026-09-05-mobile-experience.md` for regressions,
verification and release records. PR: `https://github.com/Wildeax/wildeax-page/pull/2`.

## Pending

1. **Art window.** Ships with placeholders. Needs real artwork from the
   owner and a decision on how to add pieces (a folder under `public/art/`
   plus a manifest is the obvious shape).
2. **Token rotation.** A `cfut_` Cloudflare token was pasted in chat earlier
   in the project. Rotate it in the dashboard. The `cfk_` key in
   `~/.cloudflare/token.txt` is unscoped; a scoped replacement (Account
   Rulesets Edit, Dynamic Redirect Read and Edit) would be safer.
3. **Physical-phone QA.** This pass was checked in Chromium emulation at
   390×844, 320×568, 844×390 and 768×1024. It has not been tested on a real
   phone or in mobile Safari.
4. **Hosted build automation.** Investigate the pre-existing failed
   Cloudflare Workers Builds check described above.

## Earlier desktop release, verified on production

- Rubber-band selection over bare wallpaper (`src/os/marquee.ts`).
- Right-click on wallpaper shows a one-item menu, Refresh resets every icon
  to its authored spot for everyone.
- Desktop icons drag again (`data-drag-ok`).
- 26 of 26 browser checks pass on production in Chromium and Firefox.
