# WILDEAX OS: redesign of wildeax.com

Date: 2026-09-05
Status: approved, not implemented
Supersedes the page structure described in `2026-09-04-shared-play-layer-design.md`.
That spec's play layer is kept and extended, not replaced.

## What this is

wildeax.com becomes a fictional desktop operating system. The page does not
scroll. Projects are icons, sections are draggable windows, and the taskbar
carries the open windows, the language toggle and the count of other people on
the page.

The site's job is creative identity. It is itself the portfolio piece, not a
brochure pointing at one.

## Why the metaphor

The play layer shipped on 2026-09-04 makes every element draggable and shares
those positions between visitors. On a conventional scrolling page that reads as
a gimmick bolted on, because nothing about a stack of sections invites dragging.
A desktop is the one interface where dragging is the native verb. The metaphor
is what makes the existing feature coherent.

It also rhymes with Sweepr98, which is already a Windows 98 shell.

## Decisions

Settled during brainstorming. Constraints, not open questions.

| Decision | Choice | Why, over the alternative |
|---|---|---|
| Purpose | Creative identity, memorable first | Rejected: hire-me portfolio, product hub, personal-brand-with-projects. A page strangers can permanently rearrange and a page selling enterprise contracts pull in opposite directions; this commits to the first. |
| Scope | New look and new structure | Rejected: restyling the existing sections. The four Unity feature cards describe who the author was, not what he ships. |
| OS flavour | A fictional OS, "WILDEAX OS" | Rejected: faithful Windows 98 and classic Mac System 7. Both are someone else's design language, both fight the cyberpunk palette, and a Win98 dev portfolio is now its own small genre. |
| Scroll model | Viewport-locked desktop, windows scroll internally | Rejected: a scrolling page with window-styled sections, which demotes the desktop to decoration. |
| Mobile | Stacked full-width cards, no dragging | Rejected: a pannable desktop, which is faithful and unusable at 390px. |
| Window state | Positions shared, open/closed and z-order per visitor | Rejected: fully shared, which lets one visitor close every window and leave the site blank for everyone until the author notices. Also rejected: fully private, which discards the multiplayer layer. |
| Artwork | Real section, placeholder tiles at first | Rejected: art as texture only, and linking Instagram instead. A creative-identity site for a digital artist has to show artwork. |

## Architecture

### Layers

Root is `h-screen overflow-hidden` on desktop widths. Stacking order, bottom to
top:

1. **Wallpaper.** Aurora, kept. It carries the existing identity and its `ogl`
   cost is already in the bundle. Grid overlay and scanlines on top.
2. **Desktop icons.** A column on the left, each one a `Playable`.
3. **Windows.** Each one a `Playable` wrapping a `Window`.
4. **Taskbar.** Fixed to the bottom.
5. **Sticker layer.** Unchanged from the play layer spec.
6. **Remote cursors.** Rendered by playhtml.

### The Window component

`src/os/Window.tsx`. One component, used for every window and, at mobile
widths, for every card.

```tsx
interface WindowProps {
  id: WindowId            // stable, never derived from translated text
  title: string           // translated
  onClose: () => void
  onFocus: () => void
  zIndex: number
  children: ReactNode
}
```

Title bar carries the title and a close control. The body scrolls internally
with `overflow-y: auto`. Window size is fixed per window and declared in the
registry below.

**No minimize, and no resize, in v1.** Minimize would need a third state
distinct from open and closed, and with the taskbar able to reopen a closed
window it buys nothing a close does not. Resize implies persisting size, which
doubles the shared-state surface for a page whose windows have fixed content.

### State model

Two stores, deliberately separate.

**Shared and permanent:** window and icon positions, via the existing
`Playable` from `@/play`. Nothing new is written for this. Each window's
`Playable` id is `win-<WindowId>`, each icon's is `icon-<WindowId>`.

**Per visitor, in React state:** which windows are open, and the z-order.

The split is the point. Positions being communal is the chaos the author asked
for. Open/closed being communal is a denial-of-service on his own homepage: one
visitor closes everything and every subsequent visitor sees bare wallpaper.

Z-order is per visitor because a shared z-order has no meaningful semantics when
two people click different windows at the same moment, and because getting it
wrong is invisible until it isn't.

### The window registry

`src/os/registry.ts` holds one array describing every window: its `WindowId`,
i18n title key, default position, size, icon, and whether it opens on load.

`WindowId` is a string union, not an enum. `erasableSyntaxOnly` is on in
`tsconfig.app.json`, so enums do not compile.

Ids are stable strings such as `readme`, `work`, `art`. They must never be
derived from translated titles. The `Features` component made exactly this
mistake, keying cards on `f.title`, which meant switching to Spanish moved every
saved position.

## Content

The four Unity feature cards are removed. The new inventory:

| Window | Id | Opens on load | Contains |
|---|---|---|---|
| `readme.txt` | `readme` | Yes | Who he is, rewritten dev-led with art as context. Co-founder at Mood Studios, Medellín, game backends and desktop apps. |
| `work.exe` | `work` | Yes | A list: Splitwars Online, Arena Assistant, Sweepr98, Mood Collab, the pharmacy POS and ERP. Each row opens its own detail window. |
| `art/` | `art` | No | Gallery of placeholder tiles, real images later. |
| `me.jpg` | `me` | Yes | The fisheye portrait, `wildeax portrait2.jpg`, as an image viewer window. |
| `contact.txt` | `contact` | No | Email, LinkedIn, X, Instagram, Discord, and the Level Up Unity Game Dev podcast. |

Project detail windows share one `ProjectWindow` component driven by data in
`src/os/projects.ts`, so adding a project is a data change.

The client work stays unnamed, per the play layer spec's decision: "a pharmacy
POS and ERP replacing a legacy .NET system", never Farmacenter or Coopidrogas.

## Mobile

Below Tailwind's `md` breakpoint the desktop does not render at all. The same
`Window` components render as full-width stacked cards on a normally scrolling
page, in registry order, all expanded. No dragging, no icons, no taskbar. The
language toggle moves into a simple header.

This is a branch in one place, `src/os/Desktop.tsx`, not a parallel component
tree. Two implementations of the same content would drift within a month.

## What is deleted

`src/components/sections/Hero.tsx`, `Features.tsx`, `About.tsx`, `Contact.tsx`,
`Footer.tsx`, `src/components/navigation/Navbar.tsx` (the taskbar replaces it),
`src/reactbits/TextPressure.tsx`, and the matching lines in
`src/components/index.ts`.

`SpotlightCard` is **not** deleted, despite serving no purpose in the new
desktop. `src/pages/Links.tsx` imports it, and this spec leaves `/links`
untouched.

`src/pages/ArenaAssistant.tsx` is left alone. No route renders it today, so it
is already dead, but removing unrouted pages is not this redesign's job.

Deleting `TextPressure` is also the fix for the clipped wordmark. It measures
its container once on mount and again only on window resize, so when Inter
finishes loading after that measurement the text renders wider than its
`overflow-hidden` box and gets cut. Rather than patch a component the redesign
does not use, it goes.

## What is kept

`Aurora` as wallpaper. `ScrambledText` for window text. The whole of
`src/play/`. The `i18n` provider. `src/worker.ts` and its R2 download proxy. The
`/links` page, which serves a different purpose as a link hub and is unchanged.
`NotFound`, still lazy-loaded. All the SEO metadata and `og.jpg` deployed on
2026-09-04.

## Internationalisation

Existing keys for the deleted sections are removed. New keys are added for
window titles, `readme` body copy, project descriptions and contact labels, in
both `en` and `es`. The provider in `src/i18n/index.tsx` is unchanged; only its
`resources` dictionary changes.

Every user-visible string goes through `t()`. No English is hardcoded in a
component.

## SEO and accessibility

Content lives in the DOM at first render, not behind a click, so crawlers read
`readme` and `work` regardless of what is visually windowed. Windows that start
closed still render their content in the DOM, hidden with `hidden`, rather than
being unmounted.

Windows are `role="dialog"` with `aria-label` from the translated title. The
desktop icon list is a `<ul>` of buttons. Every window is reachable and openable
by keyboard: icons are focusable buttons, and Escape closes the focused window.

Under `prefers-reduced-motion`, window open and close animate instantly, and
Aurora's motion stops. Dragging still works, since it is user-initiated.

A viewport-locked page with no scrollbar gives no affordance that more exists.
The mitigation is `readme`, `work` and `me` opening on load, so the page carries
content before any interaction.

## Testing

Existing 25 tests stay green. Added:

1. **Window reducer.** Opening an already-open window focuses it rather than
   duplicating. Closing removes it. Focusing raises z-order above all others.
2. **Registry integrity.** Every `WindowId` is unique, and every window's title
   key resolves in both `en` and `es`. This is what catches a Spanish
   translation being forgotten.
3. **Mobile rendering.** Below the breakpoint, all registry windows render and
   no taskbar is present.

Pure-logic tests run in the `node` environment; component tests opt into `jsdom`
per file, as established in `vitest.config.ts`.

## Out of scope

- Window resizing and minimizing, and any persistence of window size.
- Real artwork. Placeholder tiles ship; images come later.
- A start menu with nested items. The taskbar button opens the same icon list.
- Sound.
- Any change to `/links`, the Worker, or the R2 download proxy.
- Boot or login animation. Charming for one visit, an obstacle on every one
  after.

## Risks

**A no-scroll page can read as broken.** Some visitors will not realise icons
open things. Three windows open on load is the mitigation, and it is a mitigation
rather than a fix. If analytics later show people leaving in seconds, the
fallback is the rejected scrolling-page-with-window-chrome option, which is a
restyle of this same component set rather than a rewrite.

**Positions are shared and permanent.** A visitor can drag every window into one
corner and that is what the next visitor sees. Bounds clamping stops them
leaving the viewport entirely. The reset is bumping `ROOM` in `src/play/room.ts`.

**The art window ships empty-looking.** Placeholder tiles are visibly
placeholders. Until real images land, that section undersells rather than sells.

## Open dependency

Real artwork for the `art/` window. Blocking nothing, since placeholders ship
first, but the section is not finished until images exist. Around 10 to 20
pieces in `src/assets/img/art/` is the agreed route; beyond roughly 20 the git
repository starts carrying real weight and R2 becomes the better home.
