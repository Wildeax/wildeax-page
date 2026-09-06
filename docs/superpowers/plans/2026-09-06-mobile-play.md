# Mobile cat, tilt and sticker controls

The owner says the phone cat and yarn feel useless and dislikes the mobile
sticker menu. They asked for phone tilt and interaction with the page.
This replaces the earlier quiet-phone behavior. Work is on `feat/mobile-play`.

## Changes

- Use visible mobile card headings as perches. Cat and yarn can land on them,
  follow a perched card during scrolling and return safely if it leaves view.
- Enable short yarn chases, pounces and batting on phones. Keep naps, boredom,
  poke feedback, deliberate touch dragging and reduced-motion behavior.
- Follow-up feedback: a lower toy must make the cat leave its perch, not hop
  back onto it. Walk off an available edge; crouch/drop through a full-width
  one-way card top. Stationary yarn loses interest after 2.25 seconds without
  movement, with the existing cooldown and a hard cap on even active play.
- Add explicit Pet and Tilt controls. Tilt calibrates to the held angle,
  supports screen rotation, ignores invalid/stale data, filters jitter and
  limits speed. It rolls yarn and a thrown cat, and makes a standing cat
  balance or walk. Sensor readings stay in memory, never shared or stored.
- Request orientation permission only from the Tilt button. Denial, missing
  sensors, insecure context and reduced motion leave touch play usable.
  Stop sampling while hidden and remove listeners on exit.
- Replace the large floating picker with a bottom tool row and a horizontal
  emoji strip. Preserve separate mobile/desktop collections, placement cancel,
  touch removal, keyboard labels, safe areas and all desktop controls.

## Checks

Failing tests first for perches/scrolling, ball collisions, tilt filtering and
permission lifecycle. Then component interactions and real Chromium touch
checks at narrow, portrait and landscape sizes, plus existing desktop gates.
Use fresh room names, never mutate the default room. Sensor event simulation
can test the implementation but cannot certify real iOS/Android hardware.
Build and upload a review preview. Do not promote new sensor behavior before
the owner has a chance to try it on their phone.

References: [device orientation permissions](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission),
[orientation specification](https://www.w3.org/TR/orientation-event/).

## Verification and preview

- 240 unit/component tests pass with one worker; production build passes.
  Changed TypeScript files lint cleanly. Full lint still reports the existing
  19 errors and one warning in i18n/index and reactbits.
- Observed the new ball-platform, tilt, mobile-perch, permission-lifecycle,
  toolbar, vertical-chase, stationary-interest and fresh-yarn-after-placement
  guards fail before their fixes. The descent tests exercise the actual
  toy brain and physics together, not a copied implementation.
- `verify-mobile-play.mjs`: 25/25 locally and on the hosted preview. It uses
  real touch input and simulated public orientation events/permission results.
  It does not modify private cat state. Install its clock before page load;
  installing it after initialization invalidates the pet's time comparisons.
- `verify-mobile.mjs`: 50/50 on preview at 390×844, 320×568, 844×390 and
  768×1024, including legacy cross-layout overflow, synchronization, placement,
  erasing, touch dragging, navigation and Spanish controls. An earlier local
  run timed out seeding the old-build sticker; the complete hosted run passed
  including the legacy failing control. No default room was mutated.
- All **205 hosted browser checks pass**: 50 mobile/isolation, 25 new mobile
  play, 33 main, 11 focused cat, 21 behavior, 26 handling/visits, 17
  sticker/tail and 22 yarn/selection. The yarn gate now includes placing a
  cat on a real desktop window and verifying descent toward floor yarn.
- Visually inspected the mobile play screen and narrow/landscape sticker
  strips. Native iOS/Android sensors and Safari permission UI are untested.
- Preview version: `a02a1761-913e-42c3-8316-04a18b8b6558`; bundle
  `index-L8rfahxm.js`. URL:
  `https://a02a1761-wildeax-page.arena-riot-proxy.workers.dev/?room=phone-review-a02a1761`.
  Upload only; production remains 100% `5ce57800-77ec-412e-8293-f2bc146672f4`,
  confirmed with `wrangler deployments list`. No routes, data or bindings changed.
- Runtime changes are committed and pushed at `02e6b7a` on `feat/mobile-play`.
  The external Workers Builds check also fails on this commit, as on prior
  main: `https://github.com/Wildeax/wildeax-page/runs/101521368113`.
  Local build/tests and manual hosted preview upload pass; do not call CI green.
