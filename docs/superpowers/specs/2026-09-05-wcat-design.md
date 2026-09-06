# wcat: a black cat that lives on the WILDEAX OS desktop

Status: **implemented, awaiting preview review.** The owner approved the
presented design with "Go" on 2026-09-05. Work is on `feat/wcat`.
The missing body reference remains an art-review limitation. The first
reviewable version uses the rounded silhouette described below.

The owner's preview feedback added petting, poking, toy-like hunting,
half-open waking eyes and floating sleep marks. Later feedback added gentle
window placement, live attention bouts, a flexible tail, harder-to-trigger
petting, rare dizziness, edge inspection and private app visits.
The behavior below includes that refinement. Its tests and review record are
in `../plans/2026-09-05-wcat-behavior.md` and `../plans/2026-09-05-wcat-handling.md`.

## What the owner asked for

Verbatim: "I want to have a pet. a black cat that can jump over windows stand
on them, you can drag him and it will become a ball and it can bounce over the
page boundaries. its going to be called wcat and it going to have to simple
but cool face proportions."

Two reference images were pasted in chat. Only the face survived into the
session transcript. Its proportions, measured on the 500x500 image:

- Black square background (the cat is a silhouette).
- Two white circular eyes, diameter 22% of width, centers at x 25% and x 75%,
  y 42%. No pupils.
- A white "^" mouth, apex at x 50%, y 61%, arms reaching down to y 70% at
  x 40% and x 60%. Stroke about 4.5% of width, rounded caps.

The other image (a cat body reference) was not captured. Ask the owner for
it again before drawing the body.

## Decisions already taken with the owner

| Question | Answer |
|---|---|
| One shared cat or one per visitor? | **Your own cat.** Physics runs in the visitor's browser only. Nothing is written to playhtml or localStorage. |
| Idle behaviour | Roams window tops and the floor, sits, blinks and naps. Preview feedback replaced constant tracking and parked-pointer following with brief glances and hunting after nearby wiggles. |
| Phones | **Sits on the bottom edge.** Same component, no platforms, no roaming, can be flicked after a long-press. |

## Approach

Hand-rolled. One `requestAnimationFrame` loop, a pure physics module, a pure
behaviour state machine, and platforms read each frame from the DOM rects of
visible window title bars. No new dependency.

Rejected: matter.js (about 80 KB for one rigid body, and platforms would still
need syncing every frame) and CSS-only animation (cannot throw a ball).

## Where it lives

```
src/wcat/
  physics.ts     pure: step(state, dt, world) -> state. Gravity, bounds, platforms.
  brain.ts       pure: idle, affection and hunting states, plus bounded gaze.
                 Takes an injected clock and random so tests are deterministic.
  senses.ts      pure: recognizes gentle head strokes and nearby reversals.
  world.ts       reads visible title bars and layer bounds before frame writes.
  exploration.ts pure: visit eligibility, inspection and entry decisions.
                 Also reads exposed icons and available room hosts.
  tail.ts        SVG curve poses and frame-rate-independent smoothing.
  Wcat.tsx       one-cat residence coordinator, private visited-app set and portals.
  Cat.tsx        the component: rAF loop, pointer handling, writes transform to
                 the element through a ref. React state only for form and mood.
src/index.css    cat and ball shapes, blink keyframes, morph transition.
```

`Desktop.tsx` mounts `<Wcat />` in both branches. On desktop the layer is
`absolute inset-0 pointer-events-none` at z-index 35: above windows
(`Z_BASE` 10 upward), under the sticker dock (40) and the taskbar (50). Only
the cat element itself has `pointer-events: auto`. On phones the layer is
`fixed inset-0`.

## Look

A 44 px black cat built from CSS shapes in one element: rounded body, two
triangle ears, a flexible SVG tail with separate middle and tip movement.
Face per the reference above, scaled to the body. Eyes blink every 3 to 6 s
(scaleY to 0.1 for 120 ms). Attention bouts track the live pointer for 2 to
3.5 seconds, with 8 to 14 seconds between opportunities. They can include
a little walking on the same surface. Sleeping and petting eyes stay
closed and centered. Facing flips with `scaleX(-1)` on the body only, never
the face container, so the mouth stays symmetric.

Sleep has a small staggered `zZZ` animation beside the head. The marks face
inward near the right viewport edge. Waking holds the eyes 45% open for
650 ms before sitting or reacting to a poke/pet. Lifting still happens
immediately. Reduced motion keeps the sleep marks visible but still.

Ball form: a 36 px black circle, ears and tail hidden, face kept and rotated
by distance rolled divided by radius. Morph is a 150 ms transition on width,
height and border-radius.

The sticker palette is raised to leave room for the cat along the floor.
Remote cursors now render in a clipped `#play-cursors` layer. Without it,
a desktop visitor's off-screen cursor enlarges a phone's layout viewport.
Keyboard users poke with Enter, lift/drop with Space, move with arrows, and
drop with Escape or Enter while held. Instructions are available in English
and Spanish. Pointer clicks and phone taps poke; gentle unpressed strokes
over the head pet. Dragging still uses the same thresholds.

## World

- Bounds: the desktop root rect minus the 44 px taskbar. Floor is the
  taskbar's top edge. On phones the floor is the viewport bottom minus 8 px.
- Platforms: the top edge of every visible window's `[data-drag-handle]`,
  read with `getBoundingClientRect` each frame (at most 11 elements).
  Hidden windows are skipped because their wrapper is `visibility: hidden`;
  check `[data-window]:not([hidden])`.
- Gravity 2200 px/s².

## Brain, cat form

| State | Enter | Behaviour | Leave |
|---|---|---|---|
| sit | after landing, after walk, after wake | blink, occasional short glance | random 2 to 8 s → walk; nearby teasing → stalk; 45 s inactivity → nap |
| walk | from sit | 70 px/s along the current surface, flip at edges | reached edge → jump or turn; random 1 to 4 s → sit |
| jump | from walk | parabola to a platform within 260 px sideways and 180 px up, launch velocity from the gap; no target → drop to the floor | landing → sit |
| stalk | two nearby pointer reversals within 1.2 s, outside the head | creep at 36 px/s for 450 ms, watch the toy | crouch; pointer out of reach → sit |
| crouch | after stalking | flatten, wiggle and hold the last toy position for 550 ms | pounce; pointer out of reach → sit |
| pounce | after crouching | short arc toward the last target on the same ledge or floor | landing → sit; 8 to 13 s cooldown from hunt start |
| follow | a short attention bout, reachable moving pointer | follow at up to 90 px/s, track live pointer | pointer settles, comes close or leaves reach; bout expires |
| pet | slow unpressed head strokes, two horizontal reversals, at least 70 px over 650 ms | stop, lean, close eyes into happy arches | 1.4 s without strokes → sit |
| poke | click, tap or Enter | stop, brief startle and ear flick | 650 ms → sit |
| nap | 45 s without pointer movement or affection | eyes closed and still, body 10% flatter, rising zZZ | fresh movement within 110 px or poke/pet → wake; lift → ball |
| wake | waking from a nap | eyes half-open and still, body 5% flatter, sleep marks hidden | 650 ms → sit or the requested poke/pet reaction |
| fall | the surface under the feet is gone (window closed, minimized or moved) | gravity, land on the first platform below or the floor, squash 120 ms | landing → sit |
| peek | 40% chance on each window-edge approach | stop, lean and look down for 650 to 1150 ms | continue without rerolling at the same edge |
| dizzy | hard spinning throw meets the thresholds below | wobble, spiral eyes, loose tail | 3 s → sit; reduced motion skips it |
| inspect | eligible exposed desktop icon after an idle delay | look toward the icon and tilt the head for 1.1 s | 60% → enter; otherwise resume resting |
| enter | after choosing an icon | tuck the tail and shrink along an 800 ms arc | icon badge; opening the app → room cat |

Implementation correction: floor jumps may reach the lowest nearby window
top regardless of its height. Normal windows are taller than 180 px, and
their drag bounds otherwise make every top unreachable from the floor.
Jumps between windows retain the 180 px limit. Clearance above the target
is capped by the ceiling. An isolated cat walks off an edge before falling.

## Ball

- Lift: pointerdown on the cat and 5 px of movement (mouse or pen), or a
  250 ms hold (touch). Reuse `exceedsDragThreshold` and `LONG_PRESS_MS` from
  `src/play/drag.ts`. Form becomes ball, position follows the pointer.
- Throw: on release, velocity is the mean over the last 80 ms of samples,
  capped at 1800 px/s.
- Gentle placement: release at no more than 180 px/s with the feet within
  64 px above or 36 px below a window top. The whole body must fit across
  that top. Choose the nearest eligible top, show a landing line while held,
  then sit for at least five seconds. Canceled drags do not snap.
- Flight: gravity, bounce off the four bounds with restitution 0.72, roll on
  the floor with friction (velocity x times 0.985 per frame at 60 Hz, scaled
  by dt). The ball ignores windows.
- Rest: speed under 40 px/s while on the floor for 300 ms → unroll into cat
  form → sit.
- Dizziness requires a launch of at least 1300 px/s, three full rotations
  while moving horizontally at least 600 px/s, and one impact of at least
  450 px/s. Every lift/release resets these counters. A gentle or vertical
  toss does not qualify just because it bounces.
- `prefers-reduced-motion`: no roam or hunting. Sleep marks and pet/poke
  feedback are still, without animation. Drag still works. Release
  drops straight down with no bounce and lands as a cat.

## Phones

Same component. Floor at the viewport bottom minus 8 px, no platforms, brain
restricted to sit, sleep/wake and affection reactions. Tap to poke, long-press to lift
so a normal swipe still scrolls. The ball bounces off the viewport edges like
on desktop. Touch movement does not trigger mouse-style petting or hunting.

## Not stored, not shared

Desktop app visits wait 22 to 40 seconds between opportunities. Only
exposed, closed desktop icons qualify. A new app can invite a visit even
on a busy desktop; a previously visited app requires fewer than two open
windows. The visited set lasts for this page session only. Interactions,
sleep, mobile and reduced motion take priority over exploration.

An entered icon has a small cat-face badge. Opening its app mounts the
same visitor's cat in a clipped overlay inside the content area, below
the title bar. That overlay follows the window and does not scroll with
its content. Closing/minimizing restores the badge; reopening/restoring
brings the cat back. Drag outside the window and release to return it to
the desktop. The room's play area avoids an overlapping sticker dock.
Only one cat or dormant badge watcher runs at a time.

Every load starts the cat on the floor at 35% of the width, facing right.
Nothing goes to playhtml or localStorage. If the owner later wants a shared
cat, position and form go behind the seam in `src/play/sync.tsx` like a
`Playable`, and the client that touched it last drives the simulation.

## Testing

Pure modules run in the default node environment. The component test is
jsdom per-file (`// @vitest-environment jsdom`), like the other component
tests. The pointer polyfill in `src/test-setup.ts` already covers
PointerEvent and pointer capture.

- `physics.test.ts`: gravity increases vy by g times dt; a ball crossing the
  right bound reflects vx times 0.72; a ball on the floor loses speed and
  reports rest; a falling cat whose x is over a platform stops at its top.
- `brain.test.ts`: sit → walk after the timer; surface removed → fall → sit
  on landing; 45 s idle → nap; fresh nearby movement wakes; glances expire;
  parked pointers are ignored; stalk → crouch → pounce; hunt cancels or cools
  down; affection wakes; mobile/reduced-motion restrictions hold.
- `senses.test.ts`: head strokes versus hover/fast passes; nearby reversals
  versus navigation, distant motion and stale history; bounded sample count.
- `tail.test.ts`: curve continuity, pose differences, easing and still
  reduced-motion poses. `exploration.test.ts`: delays, enter/decline,
  open-window and visited-app eligibility, cancellation.
- `Wcat.test.tsx`: renders with `data-form="cat"`; pointerdown plus 40 px
  move → `data-form="ball"`; pointerup then advancing fake timers past rest
  → `data-form="cat"`; on the mobile branch no platforms are queried; sleeping
  eyes do not move; actual input events trigger affection and hunting.
- `scripts/gate/verify.mjs`: add a desktop check (cat present, drag 200 px →
  ball, ends as a cat on the floor with no page errors) and a mobile check
  (cat present at the bottom edge).
- `scripts/gate/verify-wcat-behavior.mjs`: real mouse, keyboard and touch
  input with a controlled clock. Checks visible sleep, affection and hunting
  poses without changing private cat state.
- `scripts/gate/verify-wcat-handling.mjs`: placement, live gaze, cooldown,
  tail movement, edge decisions, dizziness, icon badge, app open/close/
  minimize/restore, visible room hit target and dragging back outside.

## Budget

The original estimate was 450 lines including tests. The first implementation
was about 820 lines in `src/wcat/`, including tests, plus CSS and browser checks.
Touch cancellation, keyboard controls, and viewport integration account for
the additional code. The behavior refinement adds gesture recognition and
regression tests. No runtime dependency was added.

On this PC, a five-second browser profile with ten windows open measured
67 cat frames at 0.31 ms mean, 0.60 ms p95, and 0.70 ms maximum callback
time. This measures the cat callback, not total rendering or page FPS.
Headless WebGL on this PC makes the full page substantially slower.

## Out of scope

Sounds, more than one cat, persistence, sharing, the cat reacting to
stickers, the cat pushing windows.
