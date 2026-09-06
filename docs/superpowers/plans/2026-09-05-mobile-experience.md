# Mobile experience and live release

The owner approved publishing the tested wcat preview first, then asked for
autonomous mobile fixes and publishing during this session. This permission
does not carry into unrelated work or future sessions.

## First release

PR #1 merged into main at `5a35ff9`. The already-tested Worker version
`33cf49c7-80ee-4075-a28c-febf253eb7b4` was promoted to 100% of production
traffic. The live response returned HTTP 200 with the expected bundle.
The production browser gate uses its own throwaway room.

## Mobile pass

Review portrait, narrow phones and landscape. Preserve desktop behavior,
the existing content and the quiet bottom-edge cat on phones.

- Use content-height mobile cards without dead window controls or nested
  scrolling. Make project-row taps navigate to their content.
- Add usable section navigation and touch-sized language/link controls.
- Collapse the emoji tray on phones and keep its expanded controls within
  the screen. Give touch users a clear way to cancel placement and remove
  stickers without requiring a right-click.
- Keep phone landscape in the mobile layout. Respect safe-area insets and
  changing viewport height for controls, cat and yarn.
- Avoid the animated WebGL wallpaper on mobile. Preserve the desktop look
  and reduced-motion behavior.
- Add failing regression tests, then verify the build, changed-file lint,
  mobile screenshots, real touch gestures and existing desktop browser gate.
  Upload a preview, gate it, merge, then promote the tested version.

## Sticker overflow report and fixes

The owner reported that a sticker placed far down the phone page appeared on
desktop and made the desktop scroll. They explicitly renewed permission to
deploy this batch once finished.

- Keep existing desktop placements in `wildeax-stickers`. Use a new
  `wildeax-stickers-mobile` collection for phones/tablets. Both remain shared
  among visitors using that layout. Remount the subscription when switching
  layouts. No collection was reset or deleted.
- Clip both sticker layers. Desktop is fixed in viewport coordinates; mobile
  stays in document coordinates. Lock only the desktop home page's root to
  the viewport. Old out-of-bounds data cannot create scrolling.
- Native touch scrolling now stops after a sticker's long press, but ordinary
  swipes remain native. A real Chromium gesture originally moved the page
  85 px during a held drag; after the fix it moves the sticker 120 px with
  zero page movement.
- Reconnect the private yarn toggle if a responsive layout replaces its dock.
  A browser check and a component test both caught the stale portal target.

## Verification before preview

New tests were observed failing before each fix: mobile cards/project
navigation, separate sticker subscriptions, touch cancellation/removal,
safe-area/visual viewport floor, replaced yarn dock and native held dragging.
The old build was also exercised against the actual overflow guard: one deep
phone sticker made its desktop document 2,521 px tall in a 711 px viewport.
The fixed build preserves the same legacy placement and stays at 711 px,
with `scrollY = 0` even after an explicit scroll attempt.

`verify-mobile.mjs` serves the immutable old build in isolated target-origin
test pages to seed authentic pre-upgrade data. This matters because playhtml
prefixes rooms with the host; the earlier hand-off's cross-host claim was
incorrect. The source comment and README now match the installed library.
Every browser write still uses a fresh valid `?room=...`.

Portrait 390×844, narrow 320×568, landscape 844×390 and tablet 768×1024
screenshots were inspected. Cards have natural heights, no nested scrollers
or dead close/minimize controls. The collapsed 206 px phone palette is now
a 44 px Play button. Project taps scroll/focus the destination. The mobile
wallpaper is static; desktop Aurora remains unchanged.

Local mobile gate: 49/49 checks passed before adding the normal-motion
navigation/viewport-resize checks for the preview gate. Full lint retains
the existing 19 errors and one warning; every changed TypeScript file passes.
The initial live main gate had one intermittent long-press/scroll failure.
Four isolated repetitions passed without changing cat gesture code. Its
test now waits for swipe inertia to end and remeasures the cat before the
separate hold, instead of relying on a fixed 350 ms delay.

## Preview verification

Runtime commit: `781b2fe`. Worker version:
`5ce57800-77ec-412e-8293-f2bc146672f4`.
Preview: `https://5ce57800-wildeax-page.arena-riot-proxy.workers.dev`.

- 217/217 unit tests pass with `--maxWorkers=1 --silent`.
- Production build passes. Existing bundle-size and Browserslist-age warnings
  remain; no runtime dependency was added.
- Changed-file ESLint passes. Full ESLint remains at 19 pre-existing errors
  and one warning in `src/i18n/index.tsx` and `src/reactbits/`.
- All 178 browser checks pass: 50 mobile/isolation, 33 main desktop/mobile,
  11 focused cat, 21 behavior, 26 handling/app visits, 17 stickers/tail,
  20 yarn/selection. No browser runtime errors were reported.
- The focused supporting-window test initially missed a fall. It now freezes
  time during targeting, finds an exposed title-bar point, verifies the window
  actually moves, and inspects the next physics frames. It passes without
  changing the cat's desktop physics.
- Preview screenshots were inspected at portrait, narrow, landscape and
  tablet sizes. Physical iOS/Android hardware was not available.

PR: `https://github.com/Wildeax/wildeax-page/pull/2`.
There are no GitHub Actions workflows. The external Cloudflare Workers Builds
check is failing on both `5a35ff9` (prior main) and this branch. Its logs are
not accessible with the existing OAuth permission (HTTP 403), so the cause
is unknown. The manually built/uploaded version above is the tested release;
hosted CI is not claimed green. No credentials or build automation were changed.
