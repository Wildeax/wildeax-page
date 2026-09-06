# wcat handling and expression pass

Requested after the second preview. Continue on `feat/wcat`; update PR #1
and its version preview. Production still requires separate approval.

1. Reproduce slow releases falling through windows. Separate gentle
   placement near a visible title bar from a throw, with a landing hint.
2. Replace frozen glances with short bouts of live tracking and a longer
   cooldown. Include a little following on the same floor or ledge.
3. Require sustained slow back-and-forth strokes for petting. Passing once,
   stationary hovering, dragging and fast wiggles must not count.
4. Replace the rigid border tail with a smoothly bending SVG path. Give
   idle, walking, hunting, affection, sleep and dizziness distinct poses.
   Add eye expressions while keeping the simple white face.
5. Track hard launch speed, fast revolutions and impacts. Only a hard,
   spinning, bouncing throw can cause a short dizzy recovery after unrolling.
   A normal toss or drop must not accumulate toward a later dizzy spell.
6. At a window edge, make one 40% decision to pause and look down before
   continuing. Never repeat the decision every frame at the same edge.
7. Occasionally inspect an exposed desktop icon. After a pause, choose
   whether to enter. Only closed apps qualify, and a previously visited
   app qualifies only when fewer than two windows are open. Prefer new apps.
8. Keep one cat across the desktop, icon badge and app interior. Opening or
   restoring the app reveals it inside; closing or minimizing returns it
   to the badge. Drag outside the window and release to bring it back.
   Keep room cats clipped to their window and clear of the sticker dock.
9. Write failing tests against real modules and events, run the full suite,
   build and lint, inspect browser poses and gate the uploaded preview.

No new runtime dependencies, generated images, shared cat state or storage.

## Verification

Baseline: 162 tests. Current full suite: 185 passing tests in 19 files.
`npm run build` passes. Full lint still reports 19 existing errors and one
warning in `src/i18n/index.tsx` and `src/reactbits/`. Changed TypeScript
files pass ESLint. No GitHub Actions workflows are configured.

Observed red tests before implementation for placement, live attention,
petting, tumbling, the tail, icon residence and the window-count rule.
The browser gate caught two integration bugs after unit tests passed:
an overdue icon visit taking priority over sleep after a stalled frame,
and the sticker dock obscuring a room cat. Both have regression tests.
The new browser check also verifies the room cat can receive a pointer
press, not just that its bounding box is inside the window.

Browser and uploaded-preview verification are in progress.
