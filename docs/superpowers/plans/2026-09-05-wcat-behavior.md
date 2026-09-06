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
- All 159 tests across 17 files pass with one worker. The build passes,
  including TypeScript. Main JS is 602.68 KB, 193.94 KB gzip; CSS is 36.42 KB.
- Changed TypeScript files pass ESLint. Full lint still reports the same
  19 errors and one warning in `src/i18n/index.tsx` and `src/reactbits/`.
- Local built preview passed 33 main browser checks, 11 existing focused
  checks and 16 new behavior checks. Actual touch swipes still scroll;
  long-press dragging still prevents scrolling and settles back into a cat.
- Inspected cropped browser screenshots of sleeping, petting, crouching
  and pouncing. The cat stays under the sticker dock during jumps.
- Uploaded-preview verification pending.
