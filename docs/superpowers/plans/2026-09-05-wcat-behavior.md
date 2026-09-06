# wcat behavior refinement

Requested by the owner after trying the first preview, 2026-09-05.
Continue on `feat/wcat`. No production deployment is authorized.

## Changes

- Sleeping eyes stay closed and still. Ordinary pointer attention is an
  occasional short glance at a remembered spot, with several seconds between
  glances. A parked cursor no longer starts following.
- Two nearby direction reversals invite play. Stalk briefly, crouch and wiggle,
  then pounce at the toy's last position on the current floor or ledge. Give up
  if the pointer leaves reach. Wait 8 to 13 seconds before another hunt.
- A click or tap produces a short startle and ear flick. Gentle movement over
  the head produces a relaxed lean and closed eyes. Both wake a sleeping cat.
- Keep mouse dragging, touch swipe cancellation, long-press throwing and
  keyboard lifting. Enter pokes; Space lifts or drops. Reduced motion retains
  static expression feedback without roaming, hunting or reaction animations.
- No new dependency, storage, shared state, or generated art.
- Follow-up request: hold half-open eyes for 650 ms when waking, then sit or
  react to the poke/pet that woke it. Add staggered rising `zZZ` marks while
  sleeping, hidden when awake and turned inward near the right edge.
  Phones can nap on the floor too; reduced motion keeps sleep marks still.

## Checks

Write failing tests against actual behavior, gaze, gesture recognition, and
the React component. Then run the complete single-worker suite, build and
lint. Exercise real pointer and touch events in the existing browser gates,
including sleeping eyes, poke, pet, crouch and pounce. Inspect screenshots.
Upload a version preview, run gates against it, and update the existing PR.

## Verification record

- Before implementation the sleeping-eye regression failed with `2px`
  instead of `0px`. Mouse/touch poke and head-stroke tests also failed.
- Behavior tests first observed the old `follow` state under a parked cursor
  and the absence of affection and hunting states.
- All 162 tests across 17 files pass with one worker. Sleep follow-up tests
  first failed on instant waking, absent sleep marks and missing inward
  placement at the right edge, then passed after implementation.
- The sleep-follow-up build passes, including TypeScript. Main JS is
  603.19 KB, 194.04 KB gzip; CSS is 37.64 KB.
- Changed TypeScript files pass ESLint. Full lint still reports the same
  19 errors and one warning in `src/i18n/index.tsx` and `src/reactbits/`.
- Local built preview passed 33 main browser checks, 11 existing focused
  checks and 16 new behavior checks. Actual touch swipes still scroll;
  long-press dragging still prevents scrolling and settles back into a cat.
- Inspected cropped browser screenshots of sleeping, petting, crouching
  and pouncing. The cat stays under the sticker dock during jumps.
- The sleep follow-up screenshots show rising marks and half-open waking
  eyes. Its local browser checks include actual half-open eye height,
  static marks under reduced motion, and inward-facing marks on phones.
- Before the sleep follow-up, a ten-window callback profile measured
  65 frames, mean 0.36 ms, p95 0.50 ms, max 0.70 ms. These are callback
  measurements, not page FPS or total rendering times.
- Hosted preview `9c6e43b1-2a4f-4f5e-925a-ade8aaa76a2f`, runtime commit
  `8ba3236`, passed all 65 browser checks: 33 main, 11 focused interactions,
  and 21 behavior/sleep checks. The expanded behavior gate also passed locally.
- Production remains 100% on `fa2be86e-6184-46c9-9a7b-9fb03b4f8b46`,
  verified with the deployment list after uploading the preview. No production
  deployment occurred. The existing PR is `Wildeax/wildeax-page#1`.
- No GitHub Actions workflows are configured, checked again through the API.
  Browser tests use Chromium touch emulation, not a physical phone.
