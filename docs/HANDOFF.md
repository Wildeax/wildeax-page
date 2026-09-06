# Hand-off: wildeax.com (WILDEAX OS)

Written 2026-09-05 at the end of the session that shipped the desktop
redesign, the shared play layer, the marquee and right-click Refresh, and
designed wcat. Read this first. It says what exists, where it is, how to
check it, and what is pending.

## What this is

wildeax.com is the owner's portfolio, rendered as a fictional operating
system desktop. Windows open, drag by their title bar, minimize into the
taskbar with a genie animation, and close. Visitors share window and icon
positions through playhtml. Stickers are shared too. Which windows are open
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
| Production version | Worker version `fa2be86e`, built from `main` at `c94a18d` |
| wcat review preview | Version `d0f4e443-494e-47b8-aa64-b48d7157599c`, runtime code from `2ab9a4c`. Use `https://d0f4e443-wildeax-page.arena-riot-proxy.workers.dev/?room=wcat-review-d0f4e443` |
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
npx vitest run --maxWorkers=1 --silent       # 185 tests. One worker: this PC runs near its memory limit
npm run build                                # tsc -b && vite build
npx wrangler versions upload                 # preview URL, does not touch production
npx wrangler deploy                          # PRODUCTION. Needs the owner's explicit yes, every time

cd scripts/gate && npm i && npx playwright install chromium
node verify.mjs https://<preview>.workers.dev   # 33 checks, exit 0 when green
node verify-wcat.mjs https://<preview>.workers.dev # focused pet interactions
node verify-wcat-behavior.mjs https://<preview>.workers.dev # sleep, wake, poke, pet, hunting
node verify-wcat-handling.mjs https://<preview>.workers.dev # placement, gaze, tail, peeks, dizziness, app visits
node profile-wcat.mjs https://<preview>.workers.dev # ten-window callback timings
node verify.mjs https://www.wildeax.com          # after wcat is promoted
node probe.mjs https://www.wildeax.com           # read-only snapshot of the real room
```

The gate always opens `?room=verify-<timestamp>`, a throwaway playhtml room.
Never drag anything in the real room from a script: it moves the owner's and
every visitor's desktop. The probe script is read-only for that reason.

Gate sequence before any production deploy: tests green, build green,
`versions upload`, `verify.mjs` against the preview, then ask.

## Things learned the hard way

- Vitest and esbuild get killed by the OS when free memory drops under
  1 GB. `--maxWorkers=1` is the workaround, not a preference.
- Bash heredocs on this machine eat backslashes. Write files with the Write
  or Edit tools, or with `printf`.
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

## Pending

1. **wcat** (the pet). Approved and implemented on `feat/wcat`, not deployed.
   See `docs/superpowers/specs/2026-09-05-wcat-design.md` and the verification
   records in `docs/superpowers/plans/2026-09-05-wcat.md` and
   `docs/superpowers/plans/2026-09-05-wcat-behavior.md` and
   `docs/superpowers/plans/2026-09-05-wcat-handling.md`. The build and
   185 tests pass. Full lint retains its 19 baseline
   errors and one warning; changed TypeScript files lint cleanly. The first
   art pass uses the documented silhouette because the body reference is
   still missing. Ask for that image for visual refinement. Production
   deployment still requires the owner's separate approval.
   The deployment list was checked after the preview upload; production
   remains 100% on `fa2be86e-6184-46c9-9a7b-9fb03b4f8b46`.
   Preview feedback replaced constant eye tracking with short glances,
   removed parked-pointer following, and added click/tap poking, gentle
   head-stroke petting, and nearby-wiggle stalking/crouching/pouncing.
   Sleep now shows rising `zZZ`, followed by half-open eyes during waking.
   Phones can nap without roaming; reduced-motion sleep marks remain still.
   Enter pokes, Space lifts/drops, arrows move a held cat, Escape drops.
   The latest pass adds gentle placement with a landing hint, short live
   attention bouts, a bending SVG tail, deliberate petting and dizziness
   only after hard spinning throws. Window edges have a 40% look-down pause.
   Exposed closed app icons can invite an inspection and optional entry.
   New apps qualify on a busy desktop; revisits require fewer than two open
   windows. A small badge marks the app. Opening it reveals the cat inside,
   closing/minimizing returns it to the badge, and dragging outside releases
   it to the desktop. Visits are local to the page session.
   All 91 preview browser checks pass: 33 main, 11 focused, 21 behavior and
   26 handling/app-visit checks. Results are in the handling plan. Use the review-room
   URL above. The gate expects wcat, so it will fail against the older
   production version until promotion. PR: `https://github.com/Wildeax/wildeax-page/pull/1`.
2. **Art window.** Ships with placeholders. Needs real artwork from the
   owner and a decision on how to add pieces (a folder under `public/art/`
   plus a manifest is the obvious shape).
3. **Token rotation.** A `cfut_` Cloudflare token was pasted in chat earlier
   in the project. Rotate it in the dashboard. The `cfk_` key in
   `~/.cloudflare/token.txt` is unscoped; a scoped replacement (Account
   Rulesets Edit, Dynamic Redirect Read and Edit) would be safer.
4. **Mobile** has only been checked in headless Chromium and Firefox at
   390x844, never on a phone.

## Shipped today, verified on production

- Rubber-band selection over bare wallpaper (`src/os/marquee.ts`).
- Right-click on wallpaper shows a one-item menu, Refresh resets every icon
  to its authored spot for everyone.
- Desktop icons drag again (`data-drag-ok`).
- 26 of 26 browser checks pass on production in Chromium and Firefox.
