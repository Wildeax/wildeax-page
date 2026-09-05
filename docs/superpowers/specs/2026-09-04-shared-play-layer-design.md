# Shared play layer for wildeax.com

Date: 2026-09-04
Status: implemented on branch feat/shared-play-layer, pending two-browser verification

## What this is

Every element on wildeax.com becomes draggable, spinnable and scalable by any
visitor, and what one visitor does is what the next visitor sees. Visitors also
see each other's cursors live. A sticker palette lets people add things from a
set the site author controls.

The reference point is [playhtml.fun](https://playhtml.fun). This is not a copy
of it. The differences that matter are written down in "Decisions" below.

## Decisions

These were settled during brainstorming. They are constraints on the
implementation, not open questions.

| Decision | Choice | Why it was chosen over the alternative |
|---|---|---|
| Shared state | Shared and persistent across visitors | A per-visitor toy that resets on reload was rejected as not worth building. The communal part is the point. |
| Blast radius | The whole page is playable | Rejected: a contained playground section, and a separate `/play` route. The author accepted that the site becomes whatever the last visitor left it. |
| On load | Played-with, permanent, manual reset | Rejected: decaying positions and a pinned snapshot. The author's words: "I'm more of let the chaos rain guy". |
| Visitor input | Stickers only | No free text and no brush. An unmoderated public brush becomes phalluses within a day, and a text field becomes insults. Removing both inputs removes the moderation burden structurally rather than by filtering. |
| Backend | playhtml default host, behind a one-file seam | Rejected: a custom Durable Object now. `initOptions.host` allows self-hosting the PartyKit server later without code changes, and the seam allows replacing playhtml entirely. |
| Effects | Cut to make room | Rejected: keeping every effect and disabling play on mobile. |
| Mobile | Long-press to drag | Rejected: view-only phones and stickers-only phones. |

## Architecture

### The sync seam

`src/play/sync.tsx` is the only module in the repository that imports
`playhtml` or `@playhtml/react`. It exports exactly three things:

```ts
export function PlayRoot(props: { children: ReactNode; pathname: string }): JSX.Element
export function Playable(props: { id: string; caps: Capability[]; children: ReactNode }): JSX.Element
export function usePresence(): { count: number; myColor: string | undefined }
```

`Capability` is `'move' | 'spin' | 'grow'`.

`Playable` is a component rather than a hook because `@playhtml/react` exposes
`withSharedState`, a higher-order component, not a hook. Fighting that shape to
present a hook would mean wrapping every element in an internal component
anyway, so the seam matches the library.

Drag is implemented on top of `withSharedState` rather than playhtml's built-in
`can-move` attribute. `can-move` cannot express the 5px click threshold, the
250ms touch long-press, or bounds clamping, all three of which this design
requires. `withSharedState` stores `{ x, y, rotation, scale }` per element and
the pointer handling is ours.

Components import from `@/play`. No component imports playhtml directly. An
ESLint `no-restricted-imports` rule enforces this, because a seam nobody
enforces stops being a seam within two months.

Replacing playhtml with a Durable Object means rewriting `sync.tsx` and nothing
else. That is the entire abstraction. No interface hierarchy, no adapter
classes, no dependency injection.

### Room identity and reset

```ts
export const ROOM = 'wildeax-1'
```

One constant in `src/play/room.ts`. Incrementing it to `wildeax-2` abandons the
old room and starts an empty one, which is the reset mechanism. There is no
admin UI. The procedure goes in `README.md`.

### Capacity

Stickers cap at 300. The client that places a sticker is the one that removes
the oldest when the count goes over, since every client holds the same shared
state. Two people placing at the same instant can push the room briefly to 301;
the next placement corrects it. That looseness is acceptable for a decoration
count and is cheaper than coordinating a single authority.

Without a cap the room grows forever and page load time degrades every month
with no corresponding bug to notice.

Element positions do not count against the cap; they are bounded by the number
of elements on the page.

## Interaction rules

### Drag versus click

Pointer movement under 5px is a click. At 5px or more the interaction becomes a
drag and the click is suppressed. Without this the site is unusable, because
every link and button is also a drag handle and no one can reach Contact.

### Bounds

A dragged element clamps to the document bounds. Because positions are
permanent and there is no decay, an element flung off-screen is gone for every
future visitor until someone resets the room.

### Mobile

A normal swipe scrolls the page. A press held for 250ms lifts the element, and
movement after that drags it. The lift is signalled with a scale and shadow
change so the state is visible.

### Rendering

Positions apply as CSS `transform`. DOM order, text content and heading
structure are untouched, so screen readers and crawlers see the authored
layout regardless of what visitors have done. Stickers are `aria-hidden`.

Under `prefers-reduced-motion`, remote cursors and idle animation stop.
Dragging still works, because it is user-initiated rather than ambient motion.

## Failure behavior

This is a hard requirement, not a nice-to-have.

If the sync backend is unreachable, slow, or erroring, the page renders the
authored layout and throws nothing. No spinner, no error banner, no
"reconnecting" state. The play layer is strictly additive.

Concretely: `PlayRoot` catches initialization failure and renders children
unwrapped, and `Playable` falls back to an inert `PlayableSurface` with no
capabilities when there is no connection.

This is verified by a test that points the client at an unreachable room and
asserts the page still renders its content.

## Performance work

The main chunk is currently 986 KB (290 KB gzipped) and every visitor downloads
all of it. Adding a WebSocket and drag handlers on every element makes the
existing load worse, so the following happens as part of this work, not after.

| Change | Removes from main chunk |
|---|---|
| `React.lazy` on `NotFound` | `three`, imported only by `AsciiCanvasText`, used only by the 404 page |
| `React.lazy` on `Links` | `react-icons` |
| Delete `BlobCursor` | `framer-motion`, its only consumer. Live multiplayer cursors supersede it, and two cursor effects would fight |
| Delete `Particles` | Nothing on its own, it shares `ogl` with `Aurora`, but it removes a second always-on WebGL loop |
| Delete `GlitchText`, `PixelCard`, `SplashCursor` | Dead files, nothing imports them |

Kept: `Aurora` (carries the visual identity), `ScrambledText`, `SpotlightCard`,
`TextPressure`.

Target is under 500 KB for the main chunk. The measured before and after go in
the pull request. If the target is missed, that is reported as a number, not
worked around.

## Testing

Four checks, matched to the things that actually break:

1. **Drag threshold.** Movement of 4px fires a click; 6px does not.
2. **Offline fallback.** With an unreachable room, the page renders its content
   and no error surfaces.
3. **Bounds clamping.** An element dragged past the document edge lands inside it.
4. **Sticker cap.** Placing 301 stickers leaves 300, and the removed one is the
   oldest. The race described above is not tested; it is bounded by one sticker.

These are unit and component tests. No end-to-end browser suite. The repository
has no test runner today, so this adds Vitest.

## Out of scope

- Free text of any kind, including a guestbook.
- A drawing brush.
- Any moderation queue or admin UI. Reset is a constant bump.
- Position decay or scheduled cleanup.
- Self-hosted sync. The seam makes it possible later; it is not built now.
- Per-route play state. The room is the whole site.

## Risks

**playhtml is beta software and the default sync runs on infrastructure the
author operates.** Self-hosting the PartyKit server is supported today via
`initOptions.host`; what is on the roadmap is a custom persistence backend, not
self-hosting itself. So the escape hatch is real and cheap: point `host` at our
own PartyKit deployment without touching component code. If the library itself
is abandoned, the failure behavior above keeps the site working and the seam
keeps the replacement to one file.

**A permanent shared canvas on a professional domain will eventually be arranged
into something the author dislikes.** Removing text and brush input removes the
easy paths. Reset covers the rest, and requires the author to notice.

**Making every element draggable can degrade the site's usability in ways the
tests above will not catch**, because "can a stranger still find the contact
link" is a judgement call. This wants a real look on a phone before it ships.
