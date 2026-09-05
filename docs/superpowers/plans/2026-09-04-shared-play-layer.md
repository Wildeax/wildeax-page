# Shared play layer implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every element on wildeax.com draggable, spinnable and scalable by any visitor, with state shared and persisted across visitors and live cursors showing who else is on the page.

**Architecture:** One module, `src/play/`, owns everything. `PlayableSurface.tsx` holds all pointer logic and imports nothing from playhtml, so it is testable on its own. `sync.tsx` is the only file that imports `@playhtml/react` and wires `PlayableSurface` to shared state via `withSharedState`. Components import from `@/play` and never from playhtml, enforced by ESLint.

**Tech Stack:** React 19, TypeScript 5.8 (strict), Vite 7, Tailwind 3, `playhtml` + `@playhtml/react` 2.1.0, Vitest (added by this plan), Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-09-04-shared-play-layer-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **`verbatimModuleSyntax: true`.** Type-only imports MUST use `import type { X } from '...'`. A plain `import { SomeType }` fails the build.
- **`erasableSyntaxOnly: true`.** No `enum`, no parameter properties, no namespaces. Use `as const` objects and union types.
- **`noUnusedLocals` and `noUnusedParameters` are on.** An unused import or parameter fails `tsc -b`, which `npm run build` runs before Vite.
- **`strict: true`, and no `any`.** Use `unknown` plus narrowing where a type is genuinely open.
- **Path alias is `@/` → `src/`**, configured in both `vite.config.ts` and `tsconfig.app.json`. Adding a new alias means editing both.
- **Styling is Tailwind utility classes.** No CSS modules, no styled-components.
- **No text input and no drawing brush anywhere in this feature.** This is the spec decision that removes the moderation burden. Do not add a "just a small label" field.
- **Sticker cap is 300**, defined once as `STICKER_CAP` in `src/play/stickers.ts`.
- **Room id is one constant**, `ROOM` in `src/play/room.ts`. Nothing else may hardcode a room string.
- **Test environment split:** pure-logic tests run in Vitest's `node` environment. Only component tests use `jsdom`. jsdom workers are memory-hungry and running the whole suite under jsdom has caused out-of-memory failures in sibling projects.

---

### Task 1: Cut the bundle before adding to it

The main chunk is 986 KB and every visitor downloads all of it. `three` is in there solely to render the 404 page. This task is independent of the play layer and lands first so later bundle measurements mean something.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/worker.ts:78-92` (the cache-control block)
- Delete: `src/reactbits/GlitchText.tsx`, `src/reactbits/PixelCard.tsx`, `src/reactbits/SplashCursor.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: nothing. Later tasks only rely on `src/App.tsx` still exporting a default `App` component.

- [ ] **Step 1: Record the baseline**

Run: `npm run build`

Write down the reported size of `dist/assets/index-*.js`, both raw and gzip. It is 986.11 KB / 289.81 KB gzip at the time of writing. Put these numbers in the commit message in Step 7.

- [ ] **Step 2: Confirm the three files are genuinely dead**

Run: `grep -rn "GlitchText\|PixelCard\|SplashCursor" src --include=*.tsx --include=*.ts`

Expected: matches only inside `src/reactbits/GlitchText.tsx`, `src/reactbits/PixelCard.tsx` and `src/reactbits/SplashCursor.tsx` themselves. If anything else imports them, STOP and report; the plan assumed they were unused.

- [ ] **Step 3: Delete the dead files**

```bash
rm src/reactbits/GlitchText.tsx src/reactbits/PixelCard.tsx src/reactbits/SplashCursor.tsx
```

- [ ] **Step 4: Lazy-load the two secondary routes**

In `src/App.tsx`, replace the static imports of `Links` and `NotFound`:

```tsx
import { lazy, Suspense } from 'react'
```

Remove these two lines:

```tsx
import Links from '@/pages/Links'
import NotFound from '@/pages/NotFound'
```

Add in their place:

```tsx
// Split out so `three` (AsciiCanvasText, used only by NotFound) and
// `react-icons` (used only by Links) leave the main chunk. Both were being
// downloaded by every visitor to the home page.
const Links = lazy(() => import('@/pages/Links'))
const NotFound = lazy(() => import('@/pages/NotFound'))
```

Wrap the `<Routes>` element in a `Suspense` with no visible fallback, because these routes are not the first paint and a spinner would flash:

```tsx
<Suspense fallback={null}>
  <Routes>
    {/* existing routes unchanged */}
  </Routes>
</Suspense>
```

- [ ] **Step 5: Fix the cache-control block in the worker**

The current block only sets a header when one is absent, and the `ASSETS` binding always sets one, so neither branch ever runs. Verified live: `/assets/index-DATxpyZi.js` serves `public, max-age=0, must-revalidate`, meaning the fingerprinted bundle pays a revalidation round trip on every visit.

In `src/worker.ts`, replace the whole block that begins `// Long cache for non-HTML static assets` with:

```ts
    // Vite fingerprints everything under /assets/, so those files are safe to
    // freeze forever: the name changes when the content does. The ASSETS
    // binding sets "max-age=0, must-revalidate" on everything, so this must
    // overwrite rather than fill in a missing header.
    const contentType = response.headers.get('content-type') || ''
    if (response.ok && !contentType.includes('text/html')) {
      const newHeaders = new Headers(response.headers)
      if (url.pathname.startsWith('/assets/')) {
        newHeaders.set('cache-control', 'public, max-age=31536000, immutable')
      }
      return new Response(response.body, { status: response.status, headers: newHeaders })
    }
```

Files copied from `public/` keep the binding's revalidating default, which is correct because their names are stable across deploys.

- [ ] **Step 6: Build and verify the cut**

Run: `npm run build`

Expected: build succeeds. `dist/assets/index-*.js` is meaningfully smaller than the Step 1 baseline, and separate lazy chunks appear for `Links` and `NotFound`. Confirm `three` left the main chunk:

Run: `grep -c "THREE" dist/assets/index-*.js`

Expected: `0`, or the grep exits non-zero with no match. If `three` is still in the main chunk, the lazy boundary is not taking effect. Report the number rather than working around it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Cut three and react-icons out of the main bundle

NotFound and Links are now lazy routes, which removes three (imported only by
AsciiCanvasText, used only by the 404 page) and react-icons from the chunk
every visitor downloads. Deletes GlitchText, PixelCard and SplashCursor, which
nothing imported.

Also makes the worker's cache-control actually apply. It only set a header when
one was absent, and the ASSETS binding always sets one, so both branches were
dead and the fingerprinted bundle was serving max-age=0.

Main chunk: <baseline> -> <new> (<baseline gzip> -> <new gzip> gzip)"
```

---

### Task 2: Test runner and the drag maths

Pure functions first, in the `node` environment. These are the rules that make the site still usable once everything is draggable.

**Files:**
- Create: `vitest.config.ts`
- Create: `src/play/types.ts`
- Create: `src/play/drag.ts`
- Create: `src/play/__tests__/drag.test.ts`
- Modify: `package.json` (scripts and devDependencies)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type Capability = 'move' | 'spin' | 'grow'`
  - `interface Point { x: number; y: number }`
  - `interface Rect { left: number; top: number; width: number; height: number }`
  - `interface Size { width: number; height: number }`
  - `interface Transform { x: number; y: number; rotation: number; scale: number }`
  - `const IDENTITY_TRANSFORM: Transform`
  - `const DRAG_THRESHOLD_PX = 5`
  - `const LONG_PRESS_MS = 250`
  - `function exceedsDragThreshold(start: Point, current: Point): boolean`
  - `function clampToBounds(offset: Point, rect: Rect, page: Size): Point`

- [ ] **Step 1: Install the test runner**

```bash
npm install -D vitest@^3 jsdom@^26 @testing-library/react@^16 @testing-library/jest-dom@^6
```

`@testing-library/*` and `jsdom` are unused until Task 4. They are installed here so there is one dependency-touching commit rather than two.

- [ ] **Step 2: Add the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
  },
  test: {
    // node by default. Component tests opt into jsdom with a per-file
    // "// @vitest-environment jsdom" comment. Running the whole suite under
    // jsdom is memory-hungry enough to fall over on a loaded machine.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 3: Add the test script**

In `package.json`, add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write the failing tests**

Create `src/play/__tests__/drag.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { exceedsDragThreshold, clampToBounds, DRAG_THRESHOLD_PX } from '@/play/drag'

describe('exceedsDragThreshold', () => {
  it('treats movement below the threshold as a click', () => {
    expect(exceedsDragThreshold({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false)
  })

  it('treats movement at the threshold as a drag', () => {
    expect(exceedsDragThreshold({ x: 0, y: 0 }, { x: DRAG_THRESHOLD_PX, y: 0 })).toBe(true)
  })

  it('measures diagonal distance, not per-axis', () => {
    // 4px on each axis is 5.66px of travel, which is a drag.
    expect(exceedsDragThreshold({ x: 0, y: 0 }, { x: 4, y: 4 })).toBe(true)
  })

  it('is direction agnostic', () => {
    expect(exceedsDragThreshold({ x: 10, y: 10 }, { x: 4, y: 10 })).toBe(true)
  })
})

describe('clampToBounds', () => {
  const rect = { left: 100, top: 100, width: 50, height: 50 }
  const page = { width: 1000, height: 800 }

  it('leaves an in-bounds offset alone', () => {
    expect(clampToBounds({ x: 10, y: 10 }, rect, page)).toEqual({ x: 10, y: 10 })
  })

  it('stops an element escaping the left edge', () => {
    expect(clampToBounds({ x: -500, y: 0 }, rect, page)).toEqual({ x: -100, y: 0 })
  })

  it('stops an element escaping the right edge', () => {
    // 1000 - 100 - 50 = 850 is as far right as it can go.
    expect(clampToBounds({ x: 5000, y: 0 }, rect, page)).toEqual({ x: 850, y: 0 })
  })

  it('stops an element escaping the bottom edge', () => {
    expect(clampToBounds({ x: 0, y: 5000 }, rect, page)).toEqual({ x: 0, y: 650 })
  })

  it('prefers the left edge when the element is wider than the page', () => {
    const wide = { left: 0, top: 0, width: 2000, height: 50 }
    expect(clampToBounds({ x: 300, y: 0 }, wide, page).x).toBe(0)
  })
})
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `@/play/drag`.

- [ ] **Step 6: Write the types**

Create `src/play/types.ts`:

```ts
export type Capability = 'move' | 'spin' | 'grow'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

/** A visitor's change to one element, relative to its authored position. */
export interface Transform {
  x: number
  y: number
  rotation: number
  scale: number
}

export const IDENTITY_TRANSFORM: Transform = { x: 0, y: 0, rotation: 0, scale: 1 }
```

- [ ] **Step 7: Write the implementation**

Create `src/play/drag.ts`:

```ts
import type { Point, Rect, Size } from '@/play/types'

/** Below this much travel the interaction is a click, so links still work. */
export const DRAG_THRESHOLD_PX = 5

/** Touch hold before an element lifts, so a normal swipe still scrolls. */
export const LONG_PRESS_MS = 250

export function exceedsDragThreshold(start: Point, current: Point): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= DRAG_THRESHOLD_PX
}

function clamp(value: number, low: number, high: number): number {
  // An element larger than the page gives high < low. Prefer the low edge so
  // the element's top-left stays visible rather than its bottom-right.
  if (high < low) return low
  return Math.min(Math.max(value, low), high)
}

/**
 * Keeps a dragged element inside the document. Positions are permanent and
 * never decay, so without this an element flung off-screen is gone for every
 * future visitor until the room is reset.
 */
export function clampToBounds(offset: Point, rect: Rect, page: Size): Point {
  return {
    x: clamp(offset.x, -rect.left, page.width - rect.left - rect.width),
    y: clamp(offset.y, -rect.top, page.height - rect.top - rect.height),
  }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 9 tests.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add Vitest and the drag threshold and bounds maths

The 5px threshold is what keeps links clickable once every element is also a
drag handle. The bounds clamp is what stops an element being flung off-screen,
which matters because positions are permanent and never decay.

Tests default to the node environment; component tests opt into jsdom per file."
```

---

### Task 3: Sticker model and the 300 cap

**Files:**
- Create: `src/play/stickers.ts`
- Create: `src/play/__tests__/stickers.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `const STICKER_CAP = 300`
  - `type StickerKind = { id: string; label: string; glyph: string } | { id: string; label: string; src: string }`
  - `interface PlacedSticker { id: string; kind: string; x: number; y: number; rotation: number; scale: number; placedAt: number }`
  - `const STICKER_KINDS: readonly StickerKind[]`
  - `function addSticker(list: readonly PlacedSticker[], sticker: PlacedSticker, cap?: number): PlacedSticker[]`

- [ ] **Step 1: Write the failing tests**

Create `src/play/__tests__/stickers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { addSticker, STICKER_CAP, STICKER_KINDS } from '@/play/stickers'
import type { PlacedSticker } from '@/play/stickers'

function makeSticker(id: string, placedAt: number): PlacedSticker {
  return { id, kind: 'star', x: 0, y: 0, rotation: 0, scale: 1, placedAt }
}

describe('addSticker', () => {
  it('appends while under the cap', () => {
    const result = addSticker([makeSticker('a', 1)], makeSticker('b', 2), 10)
    expect(result.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('evicts the oldest once over the cap', () => {
    const existing = [makeSticker('a', 5), makeSticker('b', 1), makeSticker('c', 9)]
    const result = addSticker(existing, makeSticker('d', 12), 3)
    expect(result).toHaveLength(3)
    expect(result.map((s) => s.id)).toEqual(['a', 'c', 'd'])
  })

  it('holds at the cap across many placements', () => {
    let list: PlacedSticker[] = []
    for (let i = 0; i < STICKER_CAP + 1; i++) {
      list = addSticker(list, makeSticker(`s${i}`, i))
    }
    expect(list).toHaveLength(STICKER_CAP)
    expect(list.some((s) => s.id === 's0')).toBe(false)
  })

  it('does not mutate the list it was given', () => {
    const existing = [makeSticker('a', 1)]
    addSticker(existing, makeSticker('b', 2), 10)
    expect(existing).toHaveLength(1)
  })
})

describe('STICKER_KINDS', () => {
  it('has unique ids', () => {
    const ids = STICKER_KINDS.map((k) => k.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is not empty, or the palette renders nothing', () => {
    expect(STICKER_KINDS.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `@/play/stickers`.

- [ ] **Step 3: Write the implementation**

Create `src/play/stickers.ts`:

```ts
import arenaIcon from '@/assets/img/arena/logo-icon x512.png'
import swIcon from '@/assets/img/sw/SW white transperent.png'
import minesweeperIcon from '@/assets/img/minesweeper/minesweeper_icon.png'

/**
 * Without a cap the room grows forever and page load degrades every month with
 * no corresponding bug to notice.
 */
export const STICKER_CAP = 300

export type StickerKind =
  | { id: string; label: string; glyph: string }
  | { id: string; label: string; src: string }

export interface PlacedSticker {
  id: string
  /** Matches a StickerKind id. */
  kind: string
  x: number
  y: number
  rotation: number
  scale: number
  placedAt: number
}

/**
 * The palette is the whole vocabulary a visitor has. It is deliberately a fixed
 * set: there is no text field and no brush anywhere in this feature, which is
 * what removes the moderation burden. Adding kinds here is safe. Adding a way
 * for visitors to supply their own content is not.
 */
export const STICKER_KINDS: readonly StickerKind[] = [
  { id: 'star', label: 'Star', glyph: '⭐' },
  { id: 'fire', label: 'Fire', glyph: '🔥' },
  { id: 'heart', label: 'Heart', glyph: '💜' },
  { id: 'skull', label: 'Skull', glyph: '💀' },
  { id: 'alien', label: 'Alien', glyph: '👾' },
  { id: 'bolt', label: 'Bolt', glyph: '⚡' },
  { id: 'eye', label: 'Eye', glyph: '👁️' },
  { id: 'sparkle', label: 'Sparkles', glyph: '✨' },
  { id: 'arena', label: 'Arena Assistant', src: arenaIcon },
  { id: 'splitwars', label: 'Splitwars', src: swIcon },
  { id: 'sweepr', label: 'Sweepr98', src: minesweeperIcon },
]

/**
 * Whichever client places a sticker is the one that evicts the oldest, since
 * every client holds the same shared state. Two simultaneous placements can
 * push the room to 301 briefly; the next placement corrects it. Coordinating a
 * single authority costs more than that is worth for a decoration count.
 */
export function addSticker(
  list: readonly PlacedSticker[],
  sticker: PlacedSticker,
  cap: number = STICKER_CAP,
): PlacedSticker[] {
  const next = [...list, sticker]
  if (next.length <= cap) return next

  const oldest = next.reduce((a, b) => (a.placedAt <= b.placedAt ? a : b))
  return next.filter((s) => s.id !== oldest.id)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 15 tests total.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add the sticker model and the 300 cap

The palette is a fixed set by design. It is the entire vocabulary a visitor
has, and having no free text or brush is what means this feature ships with no
moderation queue, no filter and no admin UI.

Eviction is done by whichever client places the sticker. Concurrent placements
can exceed the cap by one until the next placement."
```

---

### Task 4: PlayableSurface, the pointer layer

The component that turns a `Transform` into CSS and pointer events back into a `Transform`. It imports nothing from playhtml, so it can be tested and reasoned about on its own, and so Task 5 has something inert to fall back to when sync is down.

**Files:**
- Create: `src/play/PlayableSurface.tsx`
- Create: `src/play/__tests__/PlayableSurface.test.tsx`

**Interfaces:**
- Consumes: `Capability`, `Transform`, `IDENTITY_TRANSFORM`, `Rect`, `Size` from `@/play/types`; `exceedsDragThreshold`, `clampToBounds`, `LONG_PRESS_MS` from `@/play/drag`
- Produces:
  - `interface PlayableSurfaceProps { caps: readonly Capability[]; transform: Transform; onTransform: (t: Transform) => void; children: React.ReactNode }`
  - `function PlayableSurface(props: PlayableSurfaceProps): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/play/__tests__/PlayableSurface.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { PlayableSurface } from '@/play/PlayableSurface'
import { IDENTITY_TRANSFORM } from '@/play/types'

afterEach(cleanup)

describe('PlayableSurface', () => {
  it('renders its children', () => {
    render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={() => {}}>
        <a href="/somewhere">Contact</a>
      </PlayableSurface>,
    )
    expect(screen.getByText('Contact')).toBeTruthy()
  })

  it('applies the transform as a CSS transform', () => {
    const { container } = render(
      <PlayableSurface
        caps={['move']}
        transform={{ x: 12, y: 34, rotation: 90, scale: 2 }}
        onTransform={() => {}}
      >
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.transform).toContain('translate(12px, 34px)')
    expect(el.style.transform).toContain('rotate(90deg)')
    expect(el.style.transform).toContain('scale(2)')
  })

  it('does not report a transform for movement under the threshold', () => {
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 3, clientY: 0 })
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 3, clientY: 0 })
    expect(onTransform).not.toHaveBeenCalled()
  })

  it('reports a transform once past the threshold', () => {
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 40, clientY: 20 })
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 40, clientY: 20 })
    expect(onTransform).toHaveBeenCalled()
  })

  it('ignores drags when move is not among its capabilities', () => {
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={[]} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 40, clientY: 20 })
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 40, clientY: 20 })
    expect(onTransform).not.toHaveBeenCalled()
  })

  it('does not lift on touch before the long press elapses', () => {
    vi.useFakeTimers()
    const onTransform = vi.fn()
    const { container } = render(
      <PlayableSurface caps={['move']} transform={IDENTITY_TRANSFORM} onTransform={onTransform}>
        <span>x</span>
      </PlayableSurface>,
    )
    const el = container.firstElementChild as HTMLElement
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    vi.advanceTimersByTime(100)
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 40, clientY: 20 })
    expect(onTransform).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `@/play/PlayableSurface`.

- [ ] **Step 3: Write the implementation**

Create `src/play/PlayableSurface.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { clampToBounds, exceedsDragThreshold, LONG_PRESS_MS } from '@/play/drag'
import type { Capability, Point, Transform } from '@/play/types'

export interface PlayableSurfaceProps {
  caps: readonly Capability[]
  transform: Transform
  onTransform: (t: Transform) => void
  children: ReactNode
}

interface DragState {
  pointerId: number
  origin: Point
  startTransform: Transform
  /** False until the threshold is crossed, or until the touch long-press fires. */
  active: boolean
}

/**
 * Applies a shared Transform to its child and turns pointer input back into
 * one. Imports nothing from playhtml so it can be tested alone and so the
 * offline path in sync.tsx can render it inert.
 */
export function PlayableSurface({ caps, transform, onTransform, children }: PlayableSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lifted, setLifted] = useState(false)

  const canMove = caps.includes('move')

  const clearLongPress = useCallback(() => {
    if (longPress.current !== null) {
      clearTimeout(longPress.current)
      longPress.current = null
    }
  }, [])

  useEffect(() => clearLongPress, [clearLongPress])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!canMove) return
      drag.current = {
        pointerId: e.pointerId,
        origin: { x: e.clientX, y: e.clientY },
        startTransform: transform,
        // Mouse and pen arm immediately and wait for the 5px threshold. Touch
        // waits for a hold, so a normal swipe still scrolls the page.
        active: e.pointerType !== 'touch',
      }
      if (e.pointerType === 'touch') {
        longPress.current = setTimeout(() => {
          if (drag.current) {
            drag.current.active = true
            setLifted(true)
            ref.current?.setPointerCapture(e.pointerId)
          }
        }, LONG_PRESS_MS)
      }
    },
    [canMove, transform],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = drag.current
      if (!state || state.pointerId !== e.pointerId) return

      const current = { x: e.clientX, y: e.clientY }
      if (!state.active) {
        // A touch that moves before the hold elapses is a scroll, not a drag.
        if (exceedsDragThreshold(state.origin, current)) {
          clearLongPress()
          drag.current = null
        }
        return
      }
      if (!exceedsDragThreshold(state.origin, current)) return

      if (!ref.current?.hasPointerCapture(e.pointerId)) {
        ref.current?.setPointerCapture(e.pointerId)
        setLifted(true)
      }

      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const page = {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }
      const desired = {
        x: state.startTransform.x + (current.x - state.origin.x),
        y: state.startTransform.y + (current.y - state.origin.y),
      }
      // getBoundingClientRect already includes the current transform, so undo
      // it to recover the element's authored position before clamping.
      const authored = {
        left: rect.left + window.scrollX - transform.x,
        top: rect.top + window.scrollY - transform.y,
        width: rect.width,
        height: rect.height,
      }
      const clamped = clampToBounds(desired, authored, page)
      onTransform({ ...state.startTransform, x: clamped.x, y: clamped.y })
    },
    [clearLongPress, onTransform, transform.x, transform.y],
  )

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      clearLongPress()
      if (ref.current?.hasPointerCapture(e.pointerId)) {
        ref.current.releasePointerCapture(e.pointerId)
      }
      drag.current = null
      setLifted(false)
    },
    [clearLongPress],
  )

  const css = `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        transform: css,
        touchAction: canMove ? 'pan-y' : undefined,
        transition: lifted ? 'none' : 'transform 120ms ease-out',
        zIndex: lifted ? 40 : undefined,
        position: lifted ? 'relative' : undefined,
        filter: lifted ? 'drop-shadow(0 12px 24px rgba(0,0,0,0.45))' : undefined,
      }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 21 tests total.

If jsdom reports that `setPointerCapture` is not a function, add this to the top of the test file, below the environment comment, and note it in the commit message:

```tsx
// jsdom does not implement pointer capture.
beforeAll(() => {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
})
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add PlayableSurface, the pointer and transform layer

Turns a shared Transform into a CSS transform and pointer input back into one.
Mouse arms immediately and waits for 5px of travel so links still click. Touch
waits 250ms, and a touch that moves before that elapses is treated as a scroll
and abandoned, so the page still scrolls normally on a phone.

Imports nothing from playhtml, which is what lets sync.tsx render it inert when
the backend is unreachable."
```

---

### Task 5: The sync seam

**Files:**
- Create: `src/play/room.ts`
- Create: `src/play/sync.tsx`
- Create: `src/play/index.ts`
- Create: `src/play/__tests__/offline.test.tsx`
- Modify: `package.json` (adds `playhtml`, `@playhtml/react`)

**Interfaces:**
- Consumes: `PlayableSurface` from `@/play/PlayableSurface`; `Capability`, `Transform`, `IDENTITY_TRANSFORM` from `@/play/types`
- Produces:
  - `const ROOM: string`
  - `function PlayRoot(props: { children: ReactNode; pathname: string }): JSX.Element`
  - `function Playable(props: { id: string; caps: readonly Capability[]; children: ReactNode }): JSX.Element`
  - `function usePresence(): { count: number; myColor: string | undefined }`
  - `src/play/index.ts` re-exports all of the above plus everything from `types`, `stickers` and `drag`

- [ ] **Step 1: Install playhtml**

```bash
npm install playhtml@^2.14.1 @playhtml/react@^2.1.0
```

- [ ] **Step 2: Add the room constant**

Create `src/play/room.ts`:

```ts
/**
 * The namespace all shared state lives in. Bumping this number abandons the
 * old room and starts an empty one, which is the reset mechanism for the whole
 * site. There is deliberately no admin UI. See README.md.
 */
export const ROOM = 'wildeax-1'
```

- [ ] **Step 3: Write the failing offline test**

Create `src/play/__tests__/offline.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PlayRoot, Playable } from '@/play/sync'

afterEach(cleanup)

describe('when the sync backend is unreachable', () => {
  it('still renders the page content', () => {
    render(
      <PlayRoot pathname="/">
        <Playable id="hero-title" caps={['move']}>
          <h1>Wildeax</h1>
        </Playable>
      </PlayRoot>,
    )
    expect(screen.getByText('Wildeax')).toBeTruthy()
  })

  it('surfaces no error UI', () => {
    const { container } = render(
      <PlayRoot pathname="/">
        <Playable id="hero-title" caps={['move']}>
          <h1>Wildeax</h1>
        </Playable>
      </PlayRoot>,
    )
    expect(container.textContent).not.toMatch(/error|reconnect|offline/i)
  })
})
```

This test runs in jsdom with no WebSocket server reachable, which is the failure this asserts against.

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `@/play/sync`.

- [ ] **Step 5: Write the seam**

Create `src/play/sync.tsx`:

```tsx
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { PlayProvider, withSharedState, usePlayContext } from '@playhtml/react'
import { PlayableSurface } from '@/play/PlayableSurface'
import { ROOM } from '@/play/room'
import { IDENTITY_TRANSFORM } from '@/play/types'
import type { Capability, Transform } from '@/play/types'

// This file is the ONLY module permitted to import playhtml. Swapping the
// backend for a self-hosted PartyKit server or a Cloudflare Durable Object
// means rewriting this file and nothing else. An ESLint rule enforces it.

interface PlayableProps {
  id: string
  caps: readonly Capability[]
  children: ReactNode
}

const SharedPlayable = withSharedState(
  (props: PlayableProps) => ({ defaultData: IDENTITY_TRANSFORM, id: props.id }),
  ({ data, setData }: { data: Transform; setData: (t: Transform) => void }, props: PlayableProps) => (
    <PlayableSurface caps={props.caps} transform={data} onTransform={setData}>
      {props.children}
    </PlayableSurface>
  ),
)

/**
 * The play layer is strictly additive. If playhtml fails to initialise, the
 * page renders its authored layout with no spinner, no banner and no thrown
 * error. The toy degrades; the portfolio does not.
 */
class PlayBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[play] disabled, rendering static layout', error, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function Playable({ id, caps, children }: PlayableProps) {
  return (
    <PlayBoundary
      fallback={
        <PlayableSurface caps={[]} transform={IDENTITY_TRANSFORM} onTransform={() => {}}>
          {children}
        </PlayableSurface>
      }
    >
      <SharedPlayable id={id} caps={caps}>
        {children}
      </SharedPlayable>
    </PlayBoundary>
  )
}

export function PlayRoot({ children, pathname }: { children: ReactNode; pathname: string }) {
  return (
    <PlayBoundary fallback={children}>
      <PlayProvider
        pathname={pathname}
        initOptions={{
          room: ROOM,
          cursors: { enabled: true, room: ROOM },
        }}
      >
        {children}
      </PlayProvider>
    </PlayBoundary>
  )
}

export function usePresence(): { count: number; myColor: string | undefined } {
  const { cursors } = usePlayContext()
  return { count: cursors?.allColors?.length ?? 0, myColor: cursors?.color }
}
```

- [ ] **Step 6: Add the barrel**

Create `src/play/index.ts`:

```ts
export { PlayRoot, Playable, usePresence } from '@/play/sync'
export { ROOM } from '@/play/room'
export { PlayableSurface } from '@/play/PlayableSurface'
export { addSticker, STICKER_CAP, STICKER_KINDS } from '@/play/stickers'
export type { PlacedSticker, StickerKind } from '@/play/stickers'
export { clampToBounds, exceedsDragThreshold, DRAG_THRESHOLD_PX, LONG_PRESS_MS } from '@/play/drag'
export { IDENTITY_TRANSFORM } from '@/play/types'
export type { Capability, Point, Rect, Size, Transform } from '@/play/types'
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 23 tests total.

If `PlayProvider` throws asynchronously rather than during render, the error boundary will not catch it and this test will hang or fail. In that case, wrap the `PlayProvider` connection in a `try/catch` inside `PlayRoot` and report what the actual failure mode was. Do not delete the test.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add the play sync seam over playhtml

sync.tsx is the only module that imports playhtml. Everything else goes through
@/play. Replacing the backend later, whether with a self-hosted PartyKit server
via initOptions.host or a Cloudflare Durable Object, means rewriting this one
file.

PlayRoot and Playable both sit behind an error boundary that renders the plain
layout if playhtml fails, with no error UI. Tested by rendering with no server
reachable."
```

---

### Task 6: The sticker layer

**Files:**
- Create: `src/play/StickerLayer.tsx`

**Interfaces:**
- Consumes: `addSticker`, `STICKER_KINDS`, `PlacedSticker` from `@/play/stickers`; `withSharedState` via `@/play/sync`
- Produces: `function StickerLayer(): JSX.Element`

- [ ] **Step 1: Export a shared-state helper from the seam**

The sticker layer needs shared state that is not a `Transform`. Add to `src/play/sync.tsx`, below `Playable`:

```tsx
/**
 * Shared state for one named collection, for callers that are not a Playable.
 * Kept here so StickerLayer does not import playhtml directly.
 */
export function createSharedList<T>(id: string, defaultValue: T[]) {
  return withSharedState(
    { defaultData: { items: defaultValue }, id },
    (
      { data, setData }: { data: { items: T[] }; setData: (d: { items: T[] }) => void },
      props: { children: (items: T[], set: (items: T[]) => void) => ReactNode },
    ) => <>{props.children(data.items, (items) => setData({ items }))}</>,
  )
}
```

Add `createSharedList` to the `src/play/index.ts` export list.

- [ ] **Step 2: Write the sticker layer**

Create `src/play/StickerLayer.tsx`:

```tsx
import { useState } from 'react'
import { createSharedList } from '@/play/sync'
import { addSticker, STICKER_KINDS } from '@/play/stickers'
import type { PlacedSticker, StickerKind } from '@/play/stickers'

const SharedStickers = createSharedList<PlacedSticker>('wildeax-stickers', [])

function renderKind(kind: StickerKind) {
  return 'glyph' in kind ? (
    <span className="text-3xl leading-none">{kind.glyph}</span>
  ) : (
    <img src={kind.src} alt="" className="h-8 w-8 object-contain" />
  )
}

function kindById(id: string): StickerKind | undefined {
  return STICKER_KINDS.find((k) => k.id === id)
}

export function StickerLayer() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <SharedStickers>
      {(stickers, setStickers) => (
        <>
          {/* Placed stickers. aria-hidden because they carry no information a
              screen reader user needs, and announcing 300 of them is hostile. */}
          <div className="pointer-events-none fixed inset-0 z-30" aria-hidden="true">
            {stickers.map((s) => {
              const kind = kindById(s.kind)
              if (!kind) return null
              return (
                <div
                  key={s.id}
                  className="absolute"
                  style={{
                    left: s.x,
                    top: s.y,
                    transform: `rotate(${s.rotation}deg) scale(${s.scale})`,
                  }}
                >
                  {renderKind(kind)}
                </div>
              )
            })}
          </div>

          {/* Placement surface, only live while a sticker is selected, so it
              never intercepts clicks meant for the site itself. */}
          {selected && (
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-crosshair"
              aria-label="Place sticker"
              onClick={(e) => {
                const kind = kindById(selected)
                if (!kind) return
                setStickers(
                  addSticker(stickers, {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    kind: selected,
                    x: e.clientX - 16,
                    y: e.clientY - 16,
                    rotation: Math.round((Math.random() - 0.5) * 40),
                    scale: 1,
                    placedAt: Date.now(),
                  }),
                )
                setSelected(null)
              }}
            />
          )}

          {/* Palette dock. */}
          <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-wrap justify-center gap-1 rounded-2xl border border-white/10 bg-black/60 p-2 backdrop-blur">
            {STICKER_KINDS.map((kind) => (
              <button
                key={kind.id}
                type="button"
                title={kind.label}
                aria-label={kind.label}
                aria-pressed={selected === kind.id}
                onClick={() => setSelected(selected === kind.id ? null : kind.id)}
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                  selected === kind.id ? 'bg-brand-400/30 ring-2 ring-brand-400' : 'hover:bg-white/10'
                }`}
              >
                {renderKind(kind)}
              </button>
            ))}
          </div>
        </>
      )}
    </SharedStickers>
  )
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npm run build`
Expected: build succeeds. If `brand-400` is not a Tailwind colour in this project, check `tailwind.config.js` and substitute the closest existing brand colour rather than inventing one.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add the shared sticker layer and palette

Select a sticker from the dock, click anywhere to place it. Placement surface
only exists while something is selected, so it never swallows a click meant for
a link. Placed stickers are aria-hidden and pointer-events-none.

Capped at 300 with oldest-evicted, enforced in addSticker."
```

---

### Task 7: Wire the play layer into the site

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/sections/Hero.tsx`
- Modify: `src/components/sections/About.tsx`
- Modify: `src/components/sections/Features.tsx`
- Modify: `src/components/sections/Contact.tsx`

**Interfaces:**
- Consumes: `PlayRoot`, `Playable`, `StickerLayer` from `@/play`
- Produces: nothing later tasks depend on

- [ ] **Step 1: Mount the provider in App.tsx**

`PlayProvider` needs the router pathname, so `PlayRoot` must sit inside the router. `App` is already rendered inside a router (check `src/main.tsx` to confirm `BrowserRouter` wraps `<App />`; if it does not, wrap `PlayRoot` where the router is).

In `src/App.tsx`, add:

```tsx
import { useLocation } from 'react-router-dom'
import { PlayRoot } from '@/play'
import { StickerLayer } from '@/play/StickerLayer'
```

Inside `App`, read the pathname and wrap the returned tree:

```tsx
function App() {
  const { pathname } = useLocation()
  return (
    <PlayRoot pathname={pathname}>
      <div className="min-h-screen bg-[#0b0e12] text-zinc-200 antialiased overflow-x-hidden relative">
        {/* existing content unchanged */}
        <StickerLayer />
      </div>
    </PlayRoot>
  )
}
```

Place `<StickerLayer />` as the last child inside the outer `div`, after `<Footer />`.

- [ ] **Step 2: Make the Hero elements playable**

In `src/components/sections/Hero.tsx`, import:

```tsx
import { Playable } from '@/play'
```

Wrap three things. The `TextPressure` wordmark block (the `div` with `className="relative mt-6 h-[96px] ..."`):

```tsx
<Playable id="hero-wordmark" caps={['move', 'spin']}>
  <div className="relative mt-6 h-[96px] sm:h-[120px] md:h-[180px] z-50 overflow-hidden">
    {/* TextPressure unchanged */}
  </div>
</Playable>
```

The badge pill (the `div` with `className="inline-flex items-center gap-2 rounded-full ..."`):

```tsx
<Playable id="hero-badge" caps={['move', 'spin']}>
  {/* existing badge div unchanged */}
</Playable>
```

The ethos `SpotlightCard` in the right column:

```tsx
<Playable id="hero-ethos" caps={['move', 'spin', 'grow']}>
  <SpotlightCard>{/* unchanged */}</SpotlightCard>
</Playable>
```

Ids must be stable and unique across the whole site, because they key the shared state. Renaming an id abandons that element's saved position.

- [ ] **Step 3: Make the About elements playable**

In `src/components/sections/About.tsx`, import `Playable` and wrap the portrait container (the `div` with `className="rounded-2xl border border-white/10 bg-white/5 aspect-square ..."`):

```tsx
<Playable id="about-portrait" caps={['move', 'spin', 'grow']}>
  {/* existing portrait div unchanged */}
</Playable>
```

And each of the four chips in the `flex flex-wrap gap-2` row, with ids `about-chip-unity`, `about-chip-shaders`, `about-chip-gameplay`, `about-chip-tools`:

```tsx
<Playable id="about-chip-unity" caps={['move', 'spin']}>
  <ScrambledText as="span" className="rounded-full border border-white/10 bg-white/5 px-3 py-1" duration={0.35} speed={0.7} triggerKey={version}>{t('about.chip.unity')}</ScrambledText>
</Playable>
```

Repeat for the other three, changing only the id and the translation key.

- [ ] **Step 4: Make the Features cards playable**

In `src/components/sections/Features.tsx`, add `import { Playable } from '@/play'`
and wrap each of the four cards. The ids map to the existing translation keys:

| Card | Playable id |
|---|---|
| `features.generalist.title` | `feature-generalist` |
| `features.graphics.title` | `feature-graphics` |
| `features.arch.title` | `feature-arch` |
| `features.educator.title` | `feature-educator` |

Each wrap takes this shape, changing only the id and leaving the card's own
markup exactly as it is:

```tsx
<Playable id="feature-generalist" caps={['move', 'spin', 'grow']}>
  {/* the existing card element for features.generalist, unchanged */}
</Playable>
```

If `Features.tsx` renders the cards from an array rather than four literal
blocks, derive the id from the item's translation key instead of hardcoding
four wrappers, so the ids stay stable if the array is reordered:

```tsx
<Playable id={`feature-${item.key}`} caps={['move', 'spin', 'grow']}>
```

- [ ] **Step 5: Honour prefers-reduced-motion**

The spec requires that remote cursors and ambient animation stop under
`prefers-reduced-motion`, while dragging keeps working because it is
user-initiated rather than ambient.

In `src/play/sync.tsx`, add above `PlayRoot`:

```tsx
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

and use it for the cursors option:

```tsx
        initOptions={{
          room: ROOM,
          // Other people's cursors are ambient motion the visitor did not ask
          // for. Dragging still works, because that is user-initiated.
          cursors: { enabled: !prefersReducedMotion(), room: ROOM },
        }}
```

In `src/play/PlayableSurface.tsx`, the `transition` on the wrapper is also
ambient. Change the style line to:

```tsx
        transition: lifted || prefersReducedMotionCss ? 'none' : 'transform 120ms ease-out',
```

and add near the top of the component:

```tsx
  const prefersReducedMotionCss =
    typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

- [ ] **Step 6: Leave Contact's links alone but make its heading playable**

In `src/components/sections/Contact.tsx`, wrap only the heading in `<Playable id="contact-title" caps={['move', 'spin']}>`. Do not wrap the contact links themselves. If a visitor buries the one call to action under a pile of stickers, the site has failed at its job.

- [ ] **Step 7: Verify in the browser**

Run: `npm run dev`

Open `http://localhost:5173` in two browser windows side by side. Confirm:
1. Dragging the wordmark in one window moves it in the other within a second.
2. Reloading keeps the moved position.
3. Clicking a nav link still navigates rather than starting a drag.
4. On a narrow viewport with touch emulation, a swipe scrolls and a 250ms hold lifts.
5. Placing a sticker in one window shows it in the other.

Report which of the five pass. Do not mark this task done on fewer than five.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Make the home page elements playable

Wordmark, badge, ethos card, portrait, skill chips and feature cards can be
dragged, spun and scaled by anyone, and the state is shared.

Contact's links are deliberately not playable. Burying the one call to action
would defeat the point of the site."
```

---

### Task 8: Presence, and remove the effects it replaces

**Files:**
- Create: `src/components/PresenceBadge.tsx`
- Modify: `src/App.tsx`
- Delete: `src/reactbits/BlobCursor.tsx`, `src/reactbits/Particles.tsx`

**Interfaces:**
- Consumes: `usePresence` from `@/play`
- Produces: `function PresenceBadge(): JSX.Element | null`

- [ ] **Step 1: Write the presence badge**

Create `src/components/PresenceBadge.tsx`:

```tsx
import { usePresence } from '@/play'

/**
 * Renders nothing when alone. A badge reading "1 here" tells a visitor the
 * shared thing is dead, which is worse than saying nothing.
 */
export function PresenceBadge() {
  const { count } = usePresence()
  if (count < 2) return null

  return (
    <div className="fixed right-4 top-20 z-40 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
      {count} here now
    </div>
  )
}
```

- [ ] **Step 2: Remove BlobCursor and Particles from App.tsx**

Delete these imports from `src/App.tsx`:

```tsx
import BlobCursor from '@/reactbits/BlobCursor'
import Particles from '@/reactbits/Particles'
```

Delete the `<BlobCursor />` element and the `Particles` div. `BlobCursor` goes because playhtml's live cursors do the same job and two cursor effects fight each other. `Particles` goes because it runs a second always-on WebGL loop on top of `Aurora` for a similar visual result.

Add `import { PresenceBadge } from '@/components/PresenceBadge'` and render `<PresenceBadge />` next to `<StickerLayer />`.

- [ ] **Step 3: Delete the files**

```bash
rm src/reactbits/BlobCursor.tsx src/reactbits/Particles.tsx
```

- [ ] **Step 4: Confirm framer-motion is now unused**

Run: `grep -rn "framer-motion" src`
Expected: no matches. Then remove it:

```bash
npm uninstall framer-motion
```

If anything still imports it, leave the dependency and say which file does.

- [ ] **Step 5: Build and report the size**

Run: `npm run build`

Report `dist/assets/index-*.js` raw and gzip against the Task 1 baseline of 986.11 KB / 289.81 KB. The spec's target is under 500 KB raw. If it is over, report the number; do not adjust `chunkSizeWarningLimit` to make the warning go away.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add the presence badge, drop BlobCursor and Particles

Live cursors from playhtml do BlobCursor's job, and two cursor effects fight
each other. Removing it takes framer-motion out of the bundle entirely, since
it was the only consumer. Particles was a second always-on WebGL loop layered
over Aurora for a similar result.

The badge hides itself below two people. '1 here' advertises that the shared
feature is dead.

Main chunk: 986.11 KB -> <new> (289.81 KB -> <new> gzip)"
```

---

### Task 9: Enforce the seam and document the reset

**Files:**
- Modify: `eslint.config.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Add the import restriction**

In `eslint.config.js`, add a second config object to the exported array, after the existing one:

```js
  {
    // sync.tsx is the seam over playhtml. A seam nobody enforces stops being a
    // seam within two months, at which point swapping the backend means
    // touching every component instead of one file.
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/play/sync.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'playhtml', message: 'Import from @/play instead. Only src/play/sync.tsx may import playhtml.' },
          { name: '@playhtml/react', message: 'Import from @/play instead. Only src/play/sync.tsx may import playhtml.' },
        ],
      }],
    },
  },
```

- [ ] **Step 2: Verify the rule fires**

Temporarily add `import { PlayProvider } from '@playhtml/react'` to `src/components/sections/Hero.tsx`.

Run: `npm run lint`
Expected: an error on that line naming `@/play`.

Remove the temporary import and run `npm run lint` again.
Expected: clean.

- [ ] **Step 3: Document the reset**

Add to `README.md`:

```markdown
## Resetting the shared play state

Every visitor can drag, spin and scale the page's elements and place stickers,
and that state is shared and permanent. There is no admin UI and no moderation
queue. Stickers come from a fixed palette and there is no text input anywhere,
so the worst case is an arrangement you dislike rather than something written
about you.

To wipe it, bump the room number in `src/play/room.ts`:

```ts
export const ROOM = 'wildeax-2'  // was wildeax-1
```

Then `npm run build && npx wrangler deploy`. The old room is abandoned, not
deleted, so the number only ever goes up.

To add stickers, extend `STICKER_KINDS` in `src/play/stickers.ts`. Emoji use
`glyph`, images use `src` and are imported from `src/assets/img/`.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Enforce the playhtml seam in ESLint and document the reset

Only src/play/sync.tsx may import playhtml. Everything else goes through
@/play, so replacing the backend stays a one-file change.

README covers the room bump, which is the entire reset mechanism."
```

---

## Deployment

Not part of any task. Deploying is the site owner's call and needs explicit approval each time.

When approved:

```bash
npm run build
npx wrangler deploy
```

Then verify against two browsers on the live domain that shared state and cursors work across machines, not just across tabs on one.
