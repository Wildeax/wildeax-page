# WILDEAX OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn wildeax.com into a fictional desktop OS: viewport-locked, projects as icons, sections as draggable windows, with window positions shared between visitors and open/closed state per visitor.

**Architecture:** A new `src/os/` module owns everything. A pure reducer in `windowState.ts` handles open/close/focus with no React in it. One `registry.ts` array declares every window, so adding a window is a data change. Window dragging reuses `Playable` from `src/play/`; nothing new is written for shared positions. `Desktop.tsx` is the single place that branches desktop versus mobile.

**Tech Stack:** React 19, TypeScript 5.8 strict, Vite 7, Tailwind 3, Vitest, playhtml via `@/play`, Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-09-05-wildeax-os-redesign-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **`verbatimModuleSyntax: true`.** Type-only imports MUST use `import type { X } from '...'`.
- **`erasableSyntaxOnly: true`.** No `enum`, no parameter properties. `WindowId` is a string union.
- **`noUnusedLocals` and `noUnusedParameters` are on.** An unused import fails `tsc -b`, which `npm run build` runs before Vite.
- **`strict: true`, and no `any`.**
- **Path alias `@/` → `src/`**, declared in both `vite.config.ts` and `tsconfig.app.json`.
- **Tailwind only.** Brand colour scale is cyan: `brand-400` is `#22d3ee`. Page background is `#0b0e12`.
- **Every user-visible string goes through `t()`** from `@/i18n`. No hardcoded English in a component. Every new key is added to BOTH `en` and `es` in `src/i18n/index.tsx`.
- **Window ids are stable strings, never derived from translated text.** `Features` keyed cards on `f.title` and switching language moved every saved position.
- **No minimize, no resize.** Close only.
- **The client ERP is never named.** "A pharmacy POS and ERP replacing a legacy .NET system". Never Farmacenter, never Coopidrogas.
- **Only `src/play/sync.tsx` may import playhtml.** An ESLint `no-restricted-imports` rule enforces it. Everything here imports from `@/play`.
- **Test environment split:** pure-logic tests run in Vitest's `node` environment; component tests opt in per file with `// @vitest-environment jsdom`.

## File structure

| File | Responsibility |
|---|---|
| `src/os/types.ts` | `WindowId`, `WindowDef`, `OsState`, `OsAction` |
| `src/os/windowState.ts` | Pure reducer and selectors. No React. |
| `src/os/registry.ts` | `WINDOWS`: the one array describing every window |
| `src/os/projects.ts` | `PROJECTS`: data behind the project detail windows |
| `src/os/Window.tsx` | Window chrome, title bar, internal scroll |
| `src/os/DesktopIcon.tsx` | One clickable, draggable desktop icon |
| `src/os/Taskbar.tsx` | Bottom bar: open windows, language, presence |
| `src/os/Desktop.tsx` | Composition, and the only desktop/mobile branch |
| `src/os/content/*.tsx` | One component per window's body |

---

### Task 1: The window state reducer

Pure logic first, in the `node` environment. This is the part that has real rules.

**Files:**
- Create: `src/os/types.ts`
- Create: `src/os/windowState.ts`
- Create: `src/os/__tests__/windowState.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type WindowId = 'readme' | 'work' | 'art' | 'me' | 'contact' | 'splitwars' | 'arena' | 'sweepr98' | 'collab' | 'pos'`
  - `interface WindowDef { id: WindowId; titleKey: string; width: number; height: number; x: number; y: number; openOnLoad: boolean; glyph: string }`
  - `interface OsState { open: WindowId[] }`
  - `type OsAction = { type: 'open'; id: WindowId } | { type: 'close'; id: WindowId } | { type: 'focus'; id: WindowId }`
  - `const Z_BASE = 10`
  - `function initialOsState(defs: readonly WindowDef[]): OsState`
  - `function osReducer(state: OsState, action: OsAction): OsState`
  - `function zIndexOf(state: OsState, id: WindowId): number`
  - `function isOpen(state: OsState, id: WindowId): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/os/__tests__/windowState.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { initialOsState, osReducer, zIndexOf, isOpen, Z_BASE } from '@/os/windowState'
import type { WindowDef } from '@/os/types'

const defs: WindowDef[] = [
  { id: 'readme', titleKey: 'os.win.readme', width: 460, height: 320, x: 40, y: 40, openOnLoad: true, glyph: '📄' },
  { id: 'work', titleKey: 'os.win.work', width: 420, height: 360, x: 520, y: 80, openOnLoad: true, glyph: '🗂️' },
  { id: 'art', titleKey: 'os.win.art', width: 520, height: 400, x: 200, y: 140, openOnLoad: false, glyph: '🎨' },
]

describe('initialOsState', () => {
  it('opens only the windows flagged openOnLoad, in registry order', () => {
    expect(initialOsState(defs).open).toEqual(['readme', 'work'])
  })
})

describe('osReducer', () => {
  it('appends a newly opened window on top', () => {
    const s = osReducer(initialOsState(defs), { type: 'open', id: 'art' })
    expect(s.open).toEqual(['readme', 'work', 'art'])
  })

  it('does not duplicate a window that is already open', () => {
    const s = osReducer(initialOsState(defs), { type: 'open', id: 'readme' })
    expect(s.open).toEqual(['work', 'readme'])
    expect(s.open.filter((id) => id === 'readme')).toHaveLength(1)
  })

  it('raises an already-open window to the top when opened again', () => {
    const s = osReducer(initialOsState(defs), { type: 'open', id: 'readme' })
    expect(s.open[s.open.length - 1]).toBe('readme')
  })

  it('removes a window on close', () => {
    const s = osReducer(initialOsState(defs), { type: 'close', id: 'readme' })
    expect(s.open).toEqual(['work'])
  })

  it('ignores closing a window that is not open', () => {
    const before = initialOsState(defs)
    expect(osReducer(before, { type: 'close', id: 'art' }).open).toEqual(before.open)
  })

  it('raises on focus', () => {
    const s = osReducer(initialOsState(defs), { type: 'focus', id: 'readme' })
    expect(s.open).toEqual(['work', 'readme'])
  })

  it('ignores focusing a closed window rather than opening it', () => {
    const s = osReducer(initialOsState(defs), { type: 'focus', id: 'art' })
    expect(s.open).toEqual(['readme', 'work'])
  })

  it('does not mutate the state it was given', () => {
    const before = initialOsState(defs)
    osReducer(before, { type: 'open', id: 'art' })
    expect(before.open).toEqual(['readme', 'work'])
  })
})

describe('zIndexOf and isOpen', () => {
  it('stacks later windows above earlier ones', () => {
    const s = initialOsState(defs)
    expect(zIndexOf(s, 'readme')).toBe(Z_BASE)
    expect(zIndexOf(s, 'work')).toBe(Z_BASE + 1)
  })

  it('reports a closed window as not open', () => {
    const s = initialOsState(defs)
    expect(isOpen(s, 'art')).toBe(false)
    expect(isOpen(s, 'readme')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `@/os/windowState`.

- [ ] **Step 3: Write the types**

Create `src/os/types.ts`:

```ts
/**
 * Stable window identifiers. These key shared position state, so they must
 * never be derived from translated text: Features keyed its cards on the
 * translated title, and switching to Spanish moved every saved position.
 */
export type WindowId =
  | 'readme'
  | 'work'
  | 'art'
  | 'me'
  | 'contact'
  | 'splitwars'
  | 'arena'
  | 'sweepr98'
  | 'collab'
  | 'pos'

export interface WindowDef {
  id: WindowId
  /** i18n key for the title bar, e.g. 'os.win.readme'. */
  titleKey: string
  width: number
  height: number
  /** Authored position. Visitors drag from here, and that is shared. */
  x: number
  y: number
  openOnLoad: boolean
  /** Emoji shown on the desktop icon and in the taskbar. */
  glyph: string
}

/** Open windows, ordered back to front. The last entry is focused. */
export interface OsState {
  open: WindowId[]
}

export type OsAction =
  | { type: 'open'; id: WindowId }
  | { type: 'close'; id: WindowId }
  | { type: 'focus'; id: WindowId }
```

- [ ] **Step 4: Write the reducer**

Create `src/os/windowState.ts`:

```ts
import type { OsAction, OsState, WindowDef, WindowId } from '@/os/types'

/** Windows stack from here. Below it: wallpaper and desktop icons. */
export const Z_BASE = 10

export function initialOsState(defs: readonly WindowDef[]): OsState {
  return { open: defs.filter((d) => d.openOnLoad).map((d) => d.id) }
}

/** Removes an id then appends it, which is both "raise" and "deduplicate". */
function raise(open: readonly WindowId[], id: WindowId): WindowId[] {
  return [...open.filter((w) => w !== id), id]
}

export function osReducer(state: OsState, action: OsAction): OsState {
  switch (action.type) {
    case 'open':
      return { open: raise(state.open, action.id) }
    case 'focus':
      // Focusing something closed is a no-op rather than an open. A stray
      // focus must never resurrect a window the visitor deliberately closed.
      return state.open.includes(action.id) ? { open: raise(state.open, action.id) } : state
    case 'close':
      return state.open.includes(action.id)
        ? { open: state.open.filter((w) => w !== action.id) }
        : state
  }
}

export function isOpen(state: OsState, id: WindowId): boolean {
  return state.open.includes(id)
}

/** -1 for a closed window. Callers render it hidden rather than unmounted. */
export function zIndexOf(state: OsState, id: WindowId): number {
  const i = state.open.indexOf(id)
  return i === -1 ? -1 : Z_BASE + i
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. 25 existing tests plus 11 new ones, 36 total.

- [ ] **Step 6: Commit**

```bash
git add src/os
git commit -m "Add the OS window state reducer

Open, close and focus as one pure reducer with no React in it. Opening an
already-open window raises it rather than duplicating. Focusing a closed window
is a no-op, so a stray focus never resurrects something a visitor closed."
```

---

### Task 2: The registry, the project data, and the i18n keys

One array describes every window. Adding a window becomes a data change.

**Files:**
- Create: `src/os/registry.ts`
- Create: `src/os/projects.ts`
- Create: `src/os/__tests__/registry.test.ts`
- Modify: `src/i18n/index.tsx`

**Interfaces:**
- Consumes: `WindowDef`, `WindowId` from `@/os/types`
- Produces:
  - `const WINDOWS: readonly WindowDef[]`
  - `const DESKTOP_ICON_IDS: readonly WindowId[]`
  - `interface Project { id: WindowId; nameKey: string; descKey: string; stackKey: string; href?: string }`
  - `const PROJECTS: readonly Project[]`

- [ ] **Step 1: Write the failing tests**

Create `src/os/__tests__/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { WINDOWS, DESKTOP_ICON_IDS } from '@/os/registry'
import { PROJECTS } from '@/os/projects'
import { resources } from '@/i18n'

describe('WINDOWS', () => {
  it('has unique ids', () => {
    const ids = WINDOWS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('opens readme, work and me on load, so a no-scroll page is not empty', () => {
    expect(WINDOWS.filter((w) => w.openOnLoad).map((w) => w.id)).toEqual(['readme', 'work', 'me'])
  })

  it('gives every window a positive size', () => {
    for (const w of WINDOWS) {
      expect(w.width).toBeGreaterThan(0)
      expect(w.height).toBeGreaterThan(0)
    }
  })
})

describe('DESKTOP_ICON_IDS', () => {
  it('only references windows that exist', () => {
    const ids = new Set(WINDOWS.map((w) => w.id))
    for (const id of DESKTOP_ICON_IDS) expect(ids.has(id)).toBe(true)
  })
})

describe('PROJECTS', () => {
  it('only references windows that exist', () => {
    const ids = new Set(WINDOWS.map((w) => w.id))
    for (const p of PROJECTS) expect(ids.has(p.id)).toBe(true)
  })

  it('never names the ERP client', () => {
    const blob = JSON.stringify([WINDOWS, PROJECTS]).toLowerCase()
    expect(blob).not.toContain('farmacenter')
    expect(blob).not.toContain('coopidrogas')
  })
})

describe('translations', () => {
  it('resolves every window title in both languages', () => {
    for (const w of WINDOWS) {
      expect(resources.en[w.titleKey], `en ${w.titleKey}`).toBeTruthy()
      expect(resources.es[w.titleKey], `es ${w.titleKey}`).toBeTruthy()
    }
  })

  it('resolves every project string in both languages', () => {
    for (const p of PROJECTS) {
      for (const key of [p.nameKey, p.descKey, p.stackKey]) {
        expect(resources.en[key], `en ${key}`).toBeTruthy()
        expect(resources.es[key], `es ${key}`).toBeTruthy()
      }
    }
  })

  it('has no key present in one language but missing in the other', () => {
    expect(Object.keys(resources.en).sort()).toEqual(Object.keys(resources.es).sort())
  })
})
```

- [ ] **Step 2: Export `resources` from the i18n module**

The tests import `resources`, which is currently a module-private `const` in
`src/i18n/index.tsx`. Change its declaration from:

```tsx
const resources: Resources = {
```

to:

```tsx
export const resources: Resources = {
```

Nothing else about the provider changes.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `@/os/registry`.

- [ ] **Step 4: Write the registry**

Create `src/os/registry.ts`:

```ts
import type { WindowDef, WindowId } from '@/os/types'

/**
 * The one description of every window. Positions here are the authored
 * defaults; once a visitor drags a window, the shared position from
 * `Playable` takes over for everyone.
 *
 * readme, work and me open on load. A viewport-locked page has no scrollbar
 * and so no affordance that more exists, and an empty desktop reads as broken.
 */
export const WINDOWS: readonly WindowDef[] = [
  { id: 'readme', titleKey: 'os.win.readme', width: 440, height: 300, x: 48, y: 56, openOnLoad: true, glyph: '📄' },
  { id: 'work', titleKey: 'os.win.work', width: 420, height: 340, x: 540, y: 96, openOnLoad: true, glyph: '🗂️' },
  { id: 'me', titleKey: 'os.win.me', width: 300, height: 330, x: 200, y: 400, openOnLoad: true, glyph: '🖼️' },
  { id: 'art', titleKey: 'os.win.art', width: 520, height: 380, x: 300, y: 180, openOnLoad: false, glyph: '🎨' },
  { id: 'contact', titleKey: 'os.win.contact', width: 380, height: 280, x: 640, y: 380, openOnLoad: false, glyph: '✉️' },
  { id: 'splitwars', titleKey: 'os.win.splitwars', width: 440, height: 300, x: 260, y: 120, openOnLoad: false, glyph: '🚀' },
  { id: 'arena', titleKey: 'os.win.arena', width: 440, height: 300, x: 290, y: 150, openOnLoad: false, glyph: '⚔️' },
  { id: 'sweepr98', titleKey: 'os.win.sweepr98', width: 440, height: 280, x: 320, y: 180, openOnLoad: false, glyph: '💣' },
  { id: 'collab', titleKey: 'os.win.collab', width: 440, height: 300, x: 350, y: 210, openOnLoad: false, glyph: '🔗' },
  { id: 'pos', titleKey: 'os.win.pos', width: 440, height: 300, x: 380, y: 240, openOnLoad: false, glyph: '🏥' },
]

/**
 * What appears on the desktop itself. Project windows are reached through
 * work.exe rather than cluttering the desktop with ten icons.
 */
export const DESKTOP_ICON_IDS: readonly WindowId[] = ['readme', 'work', 'art', 'me', 'contact']

export function windowById(id: WindowId): WindowDef {
  const found = WINDOWS.find((w) => w.id === id)
  if (!found) throw new Error(`Unknown window id: ${id}`)
  return found
}
```

- [ ] **Step 5: Write the project data**

Create `src/os/projects.ts`:

```ts
import type { WindowId } from '@/os/types'

export interface Project {
  id: WindowId
  nameKey: string
  descKey: string
  stackKey: string
  /** Absent for work with no public site. */
  href?: string
}

/**
 * The pharmacy ERP client is deliberately unnamed. See the spec: describe the
 * work, never the client.
 */
export const PROJECTS: readonly Project[] = [
  {
    id: 'splitwars',
    nameKey: 'os.project.splitwars.name',
    descKey: 'os.project.splitwars.desc',
    stackKey: 'os.project.splitwars.stack',
    href: 'https://splitwars.com',
  },
  {
    id: 'arena',
    nameKey: 'os.project.arena.name',
    descKey: 'os.project.arena.desc',
    stackKey: 'os.project.arena.stack',
    href: 'https://arena-assistant.com',
  },
  {
    id: 'sweepr98',
    nameKey: 'os.project.sweepr98.name',
    descKey: 'os.project.sweepr98.desc',
    stackKey: 'os.project.sweepr98.stack',
    href: 'https://sweepr98.com',
  },
  {
    id: 'collab',
    nameKey: 'os.project.collab.name',
    descKey: 'os.project.collab.desc',
    stackKey: 'os.project.collab.stack',
    href: 'https://github.com/MoodStudios/moodstudios-collab-dist',
  },
  {
    id: 'pos',
    nameKey: 'os.project.pos.name',
    descKey: 'os.project.pos.desc',
    stackKey: 'os.project.pos.stack',
  },
]
```

- [ ] **Step 6: Add the English strings**

In `src/i18n/index.tsx`, inside the `en` object, add these entries. Keep the
existing keys for now; Task 9 prunes the dead ones.

```tsx
    'os.win.readme': 'readme.txt',
    'os.win.work': 'work.exe',
    'os.win.art': 'art',
    'os.win.me': 'me.jpg',
    'os.win.contact': 'contact.txt',
    'os.win.splitwars': 'splitwars.exe',
    'os.win.arena': 'arena-assistant.exe',
    'os.win.sweepr98': 'sweepr98.exe',
    'os.win.collab': 'mood-collab.exe',
    'os.win.pos': 'pharmacy-erp.exe',

    'os.readme.p1': 'Francol Steven Aristizabal Romero. Medellín, Colombia. Co-founder at Mood Studios.',
    'os.readme.p2': 'I came up through digital art and game design. These days most of my hours go to the systems underneath: game servers, desktop clients, and the pipelines that ship them.',
    'os.readme.p3': 'Self-taught, still learning in public.',

    'os.work.heading': 'Things I am building',
    'os.work.open': 'Open',

    'os.art.heading': 'Selected work',
    'os.art.placeholder': 'Artwork coming soon',

    'os.me.caption': 'Medellín, 2025',

    'os.contact.heading': 'Get in touch',
    'os.contact.email': 'Email',
    'os.contact.linkedin': 'LinkedIn',
    'os.contact.x': 'X',
    'os.contact.instagram': 'Instagram',
    'os.contact.discord': 'Discord: wildeax',
    'os.contact.podcast': 'Level Up Unity Game Dev',

    'os.project.visit': 'Visit',
    'os.project.stackLabel': 'Stack',

    'os.project.splitwars.name': 'Splitwars Online',
    'os.project.splitwars.desc': 'Sci-fi isometric MMO RTS for PC and mobile, in closed alpha.',
    'os.project.splitwars.stack': 'Unity 6000.3, Java on SmartFoxServer, Go load balancer, Rust build pipeline, Cloudflare Worker CDN, Xsolla payments',

    'os.project.arena.name': 'Arena Assistant',
    'os.project.arena.desc': 'Companion app for the League of Legends Arena mode. 1.8M matches and 35M participant rows aggregated on a 15 minute cycle.',
    'os.project.arena.stack': 'Electron, React, Node, Express, Postgres, Docker blue/green behind nginx',

    'os.project.sweepr98.name': 'Sweepr98',
    'os.project.sweepr98.desc': 'Minesweeper rebuilt for the browser inside a Windows 98 shell, with co-op, race and ranked modes. Built solo.',
    'os.project.sweepr98.stack': 'TypeScript, real-time multiplayer',

    'os.project.collab.name': 'Mood Collab',
    'os.project.collab.desc': 'Real-time Markdown collaboration for Obsidian: per-user cursors, anchored comments, folder-level roles.',
    'os.project.collab.stack': 'TypeScript, CRDT sync, Obsidian plugin API',

    'os.project.pos.name': 'Pharmacy POS and ERP',
    'os.project.pos.desc': 'Replacing a legacy .NET point of sale and ERP for a pharmacy business, rebuilt around how the counter and the back office actually work.',
    'os.project.pos.stack': 'Java backend, two TypeScript frontends, Tauri desktop, shared design system',

    'os.taskbar.start': 'Start',
    'os.taskbar.here': 'here now',
    'os.icon.open': 'Open',
    'os.window.close': 'Close',
```

- [ ] **Step 7: Add the Spanish strings**

In the same file, inside the `es` object, add the matching entries. Filenames
stay in English because a filename is not prose.

```tsx
    'os.win.readme': 'leeme.txt',
    'os.win.work': 'trabajo.exe',
    'os.win.art': 'arte',
    'os.win.me': 'yo.jpg',
    'os.win.contact': 'contacto.txt',
    'os.win.splitwars': 'splitwars.exe',
    'os.win.arena': 'arena-assistant.exe',
    'os.win.sweepr98': 'sweepr98.exe',
    'os.win.collab': 'mood-collab.exe',
    'os.win.pos': 'erp-farmacia.exe',

    'os.readme.p1': 'Francol Steven Aristizabal Romero. Medellín, Colombia. Cofundador en Mood Studios.',
    'os.readme.p2': 'Vengo del arte digital y el diseño de juegos. Hoy la mayoría de mis horas van a los sistemas de abajo: servidores de juego, clientes de escritorio y las tuberías que los publican.',
    'os.readme.p3': 'Autodidacta, y sigo aprendiendo en público.',

    'os.work.heading': 'En lo que estoy trabajando',
    'os.work.open': 'Abrir',

    'os.art.heading': 'Trabajo seleccionado',
    'os.art.placeholder': 'Obra próximamente',

    'os.me.caption': 'Medellín, 2025',

    'os.contact.heading': 'Hablemos',
    'os.contact.email': 'Correo',
    'os.contact.linkedin': 'LinkedIn',
    'os.contact.x': 'X',
    'os.contact.instagram': 'Instagram',
    'os.contact.discord': 'Discord: wildeax',
    'os.contact.podcast': 'Level Up Unity Game Dev',

    'os.project.visit': 'Visitar',
    'os.project.stackLabel': 'Tecnologías',

    'os.project.splitwars.name': 'Splitwars Online',
    'os.project.splitwars.desc': 'RTS MMO isométrico de ciencia ficción para PC y móvil, en alfa cerrada.',
    'os.project.splitwars.stack': 'Unity 6000.3, Java sobre SmartFoxServer, balanceador en Go, pipeline de build en Rust, CDN con Cloudflare Worker, pagos con Xsolla',

    'os.project.arena.name': 'Arena Assistant',
    'os.project.arena.desc': 'App complementaria para el modo Arena de League of Legends. 1.8M partidas y 35M filas de participantes agregadas cada 15 minutos.',
    'os.project.arena.stack': 'Electron, React, Node, Express, Postgres, Docker blue/green detrás de nginx',

    'os.project.sweepr98.name': 'Sweepr98',
    'os.project.sweepr98.desc': 'Buscaminas rehecho para el navegador dentro de una carcasa de Windows 98, con modos co-op, carrera y competitivo. Hecho en solitario.',
    'os.project.sweepr98.stack': 'TypeScript, multijugador en tiempo real',

    'os.project.collab.name': 'Mood Collab',
    'os.project.collab.desc': 'Colaboración en Markdown en tiempo real para Obsidian: cursores por usuario, comentarios anclados y roles por carpeta.',
    'os.project.collab.stack': 'TypeScript, sincronización CRDT, API de plugins de Obsidian',

    'os.project.pos.name': 'POS y ERP de farmacia',
    'os.project.pos.desc': 'Reemplazo de un punto de venta y ERP heredado en .NET para una farmacia, reconstruido alrededor de cómo trabajan realmente el mostrador y la oficina.',
    'os.project.pos.stack': 'Backend en Java, dos frontends en TypeScript, escritorio con Tauri, sistema de diseño compartido',

    'os.taskbar.start': 'Inicio',
    'os.taskbar.here': 'en línea',
    'os.icon.open': 'Abrir',
    'os.window.close': 'Cerrar',
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. The "no key present in one language but missing in the other"
test is the one that catches a forgotten Spanish string; if it fails, it prints
the diff between the two key sets.

- [ ] **Step 9: Commit**

```bash
git add src/os src/i18n
git commit -m "Add the window registry, project data and OS translations

One array describes every window, so adding one is a data change. Project
detail windows are driven by src/os/projects.ts.

The registry test asserts that every key resolves in both languages and that
the two dictionaries have identical key sets, which is what catches a forgotten
Spanish string. It also asserts the ERP client is never named."
```

---

### Task 3: Window chrome and the desktop icon

**Files:**
- Create: `src/os/Window.tsx`
- Create: `src/os/DesktopIcon.tsx`
- Create: `src/os/__tests__/Window.test.tsx`

**Interfaces:**
- Consumes: `WindowId` from `@/os/types`
- Produces:
  - `interface WindowProps { id: WindowId; title: string; zIndex: number; hidden: boolean; onClose: () => void; onFocus: () => void; children: ReactNode }`
  - `function Window(props: WindowProps): JSX.Element`
  - `interface DesktopIconProps { id: WindowId; label: string; glyph: string; onOpen: () => void }`
  - `function DesktopIcon(props: DesktopIconProps): JSX.Element`

- [ ] **Step 1: Write the failing tests**

Create `src/os/__tests__/Window.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { Window } from '@/os/Window'
import { DesktopIcon } from '@/os/DesktopIcon'

afterEach(cleanup)

describe('Window', () => {
  it('renders its title and body', () => {
    render(
      <Window id="readme" title="readme.txt" zIndex={10} hidden={false} onClose={() => {}} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    expect(screen.getByText('readme.txt')).toBeTruthy()
    expect(screen.getByText('hello')).toBeTruthy()
  })

  it('is a labelled dialog for screen readers', () => {
    render(
      <Window id="readme" title="readme.txt" zIndex={10} hidden={false} onClose={() => {}} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    expect(screen.getByRole('dialog', { name: 'readme.txt' })).toBeTruthy()
  })

  it('calls onClose when the close control is used', () => {
    const onClose = vi.fn()
    render(
      <Window id="readme" title="readme.txt" zIndex={10} hidden={false} onClose={onClose} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Window id="readme" title="readme.txt" zIndex={10} hidden={false} onClose={onClose} onFocus={() => {}}>
        <p>hello</p>
      </Window>,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('focuses when the body is clicked', () => {
    const onFocus = vi.fn()
    render(
      <Window id="readme" title="readme.txt" zIndex={10} hidden={false} onClose={() => {}} onFocus={onFocus}>
        <p>hello</p>
      </Window>,
    )
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(onFocus).toHaveBeenCalled()
  })

  it('stays in the DOM when hidden, so crawlers still read it', () => {
    render(
      <Window id="readme" title="readme.txt" zIndex={-1} hidden onClose={() => {}} onFocus={() => {}}>
        <p>indexable</p>
      </Window>,
    )
    const el = screen.getByText('indexable')
    expect(el).toBeTruthy()
    expect(el.closest('[hidden]')).not.toBeNull()
  })
})

describe('DesktopIcon', () => {
  it('opens on click', () => {
    const onOpen = vi.fn()
    render(<DesktopIcon id="art" label="art" glyph="🎨" onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /art/ }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot resolve `@/os/Window`.

- [ ] **Step 3: Write the Window**

Create `src/os/Window.tsx`:

```tsx
import type { KeyboardEvent, ReactNode } from 'react'
import type { WindowId } from '@/os/types'

export interface WindowProps {
  id: WindowId
  title: string
  zIndex: number
  /** Closed windows stay mounted and hidden so crawlers still read them. */
  hidden: boolean
  onClose: () => void
  onFocus: () => void
  children: ReactNode
}

export function Window({ id, title, zIndex, hidden, onClose, onFocus, children }: WindowProps) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      role="dialog"
      aria-label={title}
      data-window={id}
      hidden={hidden}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onMouseDown={onFocus}
      style={{ zIndex: hidden ? undefined : zIndex }}
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-brand-400/30 bg-[#0b0e12]/95 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_18px_48px_rgba(0,0,0,0.6)] backdrop-blur"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-brand-400/25 bg-gradient-to-r from-brand-400/15 to-violet-500/15 px-3 py-1.5">
        <span className="truncate font-mono text-xs tracking-wide text-brand-200">{title}</span>
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
          className="grid h-5 w-5 shrink-0 place-items-center rounded border border-white/15 text-xs text-zinc-300 transition hover:bg-red-500/70 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm text-zinc-300">{children}</div>
    </div>
  )
}
```

- [ ] **Step 4: Write the DesktopIcon**

Create `src/os/DesktopIcon.tsx`:

```tsx
import type { WindowId } from '@/os/types'

export interface DesktopIconProps {
  id: WindowId
  label: string
  glyph: string
  onOpen: () => void
}

export function DesktopIcon({ id, label, glyph, onOpen }: DesktopIconProps) {
  return (
    <button
      type="button"
      data-icon={id}
      onClick={onOpen}
      className="flex w-20 flex-col items-center gap-1 rounded p-2 text-center transition hover:bg-brand-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <span aria-hidden="true" className="text-3xl leading-none drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">
        {glyph}
      </span>
      <span className="font-mono text-[11px] leading-tight text-zinc-300">{label}</span>
    </button>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. 43 tests total.

- [ ] **Step 6: Commit**

```bash
git add src/os
git commit -m "Add window chrome and the desktop icon

One Window component serves both the desktop and, later, the mobile cards.
Closed windows stay mounted with the hidden attribute rather than unmounting,
so crawlers and screen readers still reach the content behind them.

Escape closes the focused window, and the title bar close control is a real
labelled button rather than a styled div."
```

---

### Task 4: The taskbar

**Files:**
- Create: `src/os/Taskbar.tsx`
- Create: `src/os/__tests__/Taskbar.test.tsx`

**Interfaces:**
- Consumes: `WindowId` from `@/os/types`, `windowById` and `WINDOWS` from `@/os/registry`, `usePresence` from `@/play`, `useI18n` from `@/i18n`
- Produces:
  - `interface TaskbarProps { open: readonly WindowId[]; onSelect: (id: WindowId) => void }`
  - `function Taskbar(props: TaskbarProps): JSX.Element`

- [ ] **Step 1: Write the failing test**

Create `src/os/__tests__/Taskbar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { I18nProvider } from '@/i18n'
import { Taskbar } from '@/os/Taskbar'

afterEach(cleanup)

function renderTaskbar(open: Array<'readme' | 'work'>, onSelect = vi.fn()) {
  render(
    <I18nProvider>
      <Taskbar open={open} onSelect={onSelect} />
    </I18nProvider>,
  )
  return onSelect
}

describe('Taskbar', () => {
  it('lists one button per open window', () => {
    renderTaskbar(['readme', 'work'])
    expect(screen.getByRole('button', { name: /readme\.txt/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /work\.exe/ })).toBeTruthy()
  })

  it('reports the selected window', () => {
    const onSelect = renderTaskbar(['readme'])
    fireEvent.click(screen.getByRole('button', { name: /readme\.txt/ }))
    expect(onSelect).toHaveBeenCalledWith('readme')
  })

  it('offers a language toggle', () => {
    renderTaskbar([])
    expect(screen.getByRole('button', { name: /switch language/i })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `@/os/Taskbar`.

- [ ] **Step 3: Write the Taskbar**

Create `src/os/Taskbar.tsx`:

```tsx
import { useI18n } from '@/i18n'
import { usePresence } from '@/play'
import { windowById } from '@/os/registry'
import type { WindowId } from '@/os/types'

export interface TaskbarProps {
  open: readonly WindowId[]
  onSelect: (id: WindowId) => void
}

export function Taskbar({ open, onSelect }: TaskbarProps) {
  const { t, lang, setLang } = useI18n()
  const { count } = usePresence()

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-11 items-center gap-2 border-t border-brand-400/25 bg-black/70 px-2 backdrop-blur">
      <span className="hidden shrink-0 rounded border border-brand-400/40 bg-brand-400/10 px-3 py-1 font-mono text-xs text-brand-200 sm:inline">
        WILDEAX OS
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {open.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="flex shrink-0 items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-300 transition hover:bg-white/10"
          >
            <span aria-hidden="true">{windowById(id).glyph}</span>
            {t(windowById(id).titleKey)}
          </button>
        ))}
      </div>

      {/* Hidden below two people: "1 here now" advertises that the shared
          feature is dead, which is worse than saying nothing. */}
      {count >= 2 && (
        <span className="shrink-0 font-mono text-[11px] text-brand-300">
          {count} {t('os.taskbar.here')}
        </span>
      )}

      <button
        type="button"
        aria-label="Switch language"
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-300 transition hover:bg-white/10"
      >
        {lang === 'en' ? 'ES' : 'EN'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. 46 tests total.

If `usePresence` throws because there is no `PlayRoot` in the test tree, that is
a real defect in the seam rather than a test problem: `usePresence` already
guards on `isProviderMissing`. Report the actual error instead of wrapping the
test in a provider.

- [ ] **Step 5: Commit**

```bash
git add src/os
git commit -m "Add the OS taskbar

Carries the open windows, the language toggle and the presence count. The
count hides itself below two people, matching the presence badge it replaces."
```

---

### Task 5: Window content components

**Files:**
- Create: `src/os/content/ReadmeWindow.tsx`
- Create: `src/os/content/MeWindow.tsx`
- Create: `src/os/content/ContactWindow.tsx`
- Create: `src/os/content/ArtWindow.tsx`

**Interfaces:**
- Consumes: `useI18n` from `@/i18n`
- Produces: `function ReadmeWindow(): JSX.Element`, `function MeWindow(): JSX.Element`, `function ContactWindow(): JSX.Element`, `function ArtWindow(): JSX.Element`. All take no props.

- [ ] **Step 1: Write ReadmeWindow**

Create `src/os/content/ReadmeWindow.tsx`:

```tsx
import { useI18n } from '@/i18n'

export function ReadmeWindow() {
  const { t } = useI18n()
  return (
    <div className="space-y-3 font-mono text-[13px] leading-relaxed">
      <p className="text-brand-200">{t('os.readme.p1')}</p>
      <p>{t('os.readme.p2')}</p>
      <p className="text-zinc-400">{t('os.readme.p3')}</p>
    </div>
  )
}
```

- [ ] **Step 2: Write MeWindow**

Create `src/os/content/MeWindow.tsx`:

```tsx
import { useI18n } from '@/i18n'
import portrait from '@/assets/img/wildeax portrait2.jpg'

export function MeWindow() {
  const { t } = useI18n()
  return (
    <figure className="space-y-2">
      <img
        src={portrait}
        alt="Wildeax"
        loading="lazy"
        className="w-full rounded border border-white/10 object-cover"
      />
      <figcaption className="font-mono text-[11px] text-zinc-500">{t('os.me.caption')}</figcaption>
    </figure>
  )
}
```

- [ ] **Step 3: Write ContactWindow**

Create `src/os/content/ContactWindow.tsx`:

```tsx
import { useI18n } from '@/i18n'

const LINKS: ReadonlyArray<{ labelKey: string; href?: string }> = [
  { labelKey: 'os.contact.email', href: 'mailto:projects@wildeax.com' },
  { labelKey: 'os.contact.linkedin', href: 'https://www.linkedin.com/in/wildeax/' },
  { labelKey: 'os.contact.x', href: 'https://x.com/Wildeax_' },
  { labelKey: 'os.contact.instagram', href: 'https://www.instagram.com/wildeaxart/' },
  { labelKey: 'os.contact.podcast', href: 'https://open.spotify.com/show/022JC04g9oijOmPtHfsDUN' },
  // No href: a Discord username is not a link.
  { labelKey: 'os.contact.discord' },
]

export function ContactWindow() {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">{t('os.contact.heading')}</h2>
      <ul className="space-y-1.5 font-mono text-[13px]">
        {LINKS.map(({ labelKey, href }) => (
          <li key={labelKey}>
            {href ? (
              <a
                href={href}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noreferrer"
                className="text-brand-300 underline-offset-2 hover:underline"
              >
                {t(labelKey)}
              </a>
            ) : (
              <span className="text-zinc-400">{t(labelKey)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Write ArtWindow**

Create `src/os/content/ArtWindow.tsx`:

```tsx
import { useI18n } from '@/i18n'

/**
 * Placeholder tiles until real artwork lands in src/assets/img/art/. They are
 * visibly placeholders on purpose: a fake-looking gallery is worse than an
 * honest empty one.
 */
const TILE_COUNT = 6

export function ArtWindow() {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">{t('os.art.heading')}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: TILE_COUNT }, (_, i) => (
          <div
            key={i}
            className="grid aspect-square place-items-center rounded border border-dashed border-brand-400/25 bg-brand-400/5 font-mono text-[10px] text-zinc-600"
          >
            {t('os.art.placeholder')}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npm run build`
Expected: build succeeds. The components are not yet rendered anywhere, so
nothing changes visually.

- [ ] **Step 6: Commit**

```bash
git add src/os/content
git commit -m "Add readme, me, contact and art window bodies

Art ships deliberately obvious placeholder tiles. A gallery that pretends to
have work in it is worse than one that admits it does not yet."
```

---

### Task 6: The work window and project detail windows

**Files:**
- Create: `src/os/content/WorkWindow.tsx`
- Create: `src/os/content/ProjectWindow.tsx`
- Create: `src/os/__tests__/WorkWindow.test.tsx`

**Interfaces:**
- Consumes: `PROJECTS`, `Project` from `@/os/projects`; `WindowId` from `@/os/types`
- Produces:
  - `interface WorkWindowProps { onOpen: (id: WindowId) => void }`
  - `function WorkWindow(props: WorkWindowProps): JSX.Element`
  - `interface ProjectWindowProps { project: Project }`
  - `function ProjectWindow(props: ProjectWindowProps): JSX.Element`

- [ ] **Step 1: Write the failing test**

Create `src/os/__tests__/WorkWindow.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { I18nProvider } from '@/i18n'
import { WorkWindow } from '@/os/content/WorkWindow'
import { PROJECTS } from '@/os/projects'

afterEach(cleanup)

describe('WorkWindow', () => {
  it('lists every project', () => {
    render(
      <I18nProvider>
        <WorkWindow onOpen={() => {}} />
      </I18nProvider>,
    )
    expect(screen.getAllByRole('button')).toHaveLength(PROJECTS.length)
  })

  it('opens the matching window when a row is chosen', () => {
    const onOpen = vi.fn()
    render(
      <I18nProvider>
        <WorkWindow onOpen={onOpen} />
      </I18nProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Splitwars Online/ }))
    expect(onOpen).toHaveBeenCalledWith('splitwars')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `@/os/content/WorkWindow`.

- [ ] **Step 3: Write WorkWindow**

Create `src/os/content/WorkWindow.tsx`:

```tsx
import { useI18n } from '@/i18n'
import { PROJECTS } from '@/os/projects'
import type { WindowId } from '@/os/types'

export interface WorkWindowProps {
  onOpen: (id: WindowId) => void
}

export function WorkWindow({ onOpen }: WorkWindowProps) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">{t('os.work.heading')}</h2>
      <ul className="space-y-1">
        {PROJECTS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className="flex w-full items-center justify-between gap-3 rounded border border-white/5 px-2 py-2 text-left transition hover:border-brand-400/40 hover:bg-brand-400/10"
            >
              <span className="font-mono text-[13px] text-zinc-200">{t(p.nameKey)}</span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                {t('os.work.open')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Write ProjectWindow**

Create `src/os/content/ProjectWindow.tsx`:

```tsx
import { useI18n } from '@/i18n'
import type { Project } from '@/os/projects'

export interface ProjectWindowProps {
  project: Project
}

export function ProjectWindow({ project }: ProjectWindowProps) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed">{t(project.descKey)}</p>

      <div className="space-y-1">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          {t('os.project.stackLabel')}
        </h3>
        <p className="font-mono text-[11px] leading-relaxed text-zinc-400">{t(project.stackKey)}</p>
      </div>

      {project.href && (
        <a
          href={project.href}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded border border-brand-400/40 bg-brand-400/10 px-3 py-1.5 font-mono text-[11px] text-brand-200 transition hover:bg-brand-400/20"
        >
          {t('os.project.visit')} →
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. 48 tests total.

- [ ] **Step 6: Commit**

```bash
git add src/os
git commit -m "Add the work window and project detail windows

One ProjectWindow driven by src/os/projects.ts, so adding a project is a data
change. The pharmacy ERP has no href because there is no public site, and the
component simply omits the link rather than rendering a dead one."
```

---

### Task 7: The Desktop, and the mobile branch

The composition layer, and the only place that knows about viewport size.

**Files:**
- Create: `src/os/Desktop.tsx`
- Create: `src/os/useIsDesktop.ts`
- Create: `src/os/__tests__/Desktop.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1 to 6, plus `Playable` from `@/play`
- Produces: `function Desktop(): JSX.Element`, `function useIsDesktop(): boolean`

- [ ] **Step 1: Write the media-query hook**

Create `src/os/useIsDesktop.ts`:

```ts
import { useEffect, useState } from 'react'

/** Tailwind's md breakpoint. Below it, the desktop metaphor is unusable. */
const DESKTOP_QUERY = '(min-width: 768px)'

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
    return window.matchMedia(DESKTOP_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
```

- [ ] **Step 2: Write the failing test**

Create `src/os/__tests__/Desktop.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { I18nProvider } from '@/i18n'
import { Desktop } from '@/os/Desktop'
import { WINDOWS } from '@/os/registry'

afterEach(cleanup)

/** jsdom has matchMedia but it always reports false; drive it explicitly. */
function setViewport(isDesktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isDesktop,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

beforeEach(() => vi.unstubAllGlobals())

describe('Desktop at mobile widths', () => {
  it('renders every window as a card and no taskbar', () => {
    setViewport(false)
    render(
      <I18nProvider>
        <Desktop />
      </I18nProvider>,
    )
    expect(screen.getAllByRole('dialog')).toHaveLength(WINDOWS.length)
    expect(screen.queryByRole('button', { name: /switch language/i })).toBeTruthy()
    expect(document.querySelector('[data-taskbar]')).toBeNull()
  })
})

describe('Desktop at desktop widths', () => {
  it('renders the taskbar and the desktop icons', () => {
    setViewport(true)
    render(
      <I18nProvider>
        <Desktop />
      </I18nProvider>,
    )
    expect(document.querySelector('[data-taskbar]')).not.toBeNull()
    expect(document.querySelectorAll('[data-icon]').length).toBeGreaterThan(0)
  })

  it('keeps closed windows in the DOM so crawlers read them', () => {
    setViewport(true)
    render(
      <I18nProvider>
        <Desktop />
      </I18nProvider>,
    )
    expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(WINDOWS.length)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `@/os/Desktop`.

- [ ] **Step 4: Write the Desktop**

Create `src/os/Desktop.tsx`:

```tsx
import { useCallback, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { Playable } from '@/play'
import { DesktopIcon } from '@/os/DesktopIcon'
import { Taskbar } from '@/os/Taskbar'
import { Window } from '@/os/Window'
import { DESKTOP_ICON_IDS, WINDOWS } from '@/os/registry'
import { PROJECTS } from '@/os/projects'
import { initialOsState, isOpen, osReducer, zIndexOf } from '@/os/windowState'
import { useIsDesktop } from '@/os/useIsDesktop'
import type { WindowId } from '@/os/types'
import { ArtWindow } from '@/os/content/ArtWindow'
import { ContactWindow } from '@/os/content/ContactWindow'
import { MeWindow } from '@/os/content/MeWindow'
import { ProjectWindow } from '@/os/content/ProjectWindow'
import { ReadmeWindow } from '@/os/content/ReadmeWindow'
import { WorkWindow } from '@/os/content/WorkWindow'

export function Desktop() {
  const { t } = useI18n()
  const isDesktop = useIsDesktop()
  const [state, dispatch] = useReducer(osReducer, WINDOWS, initialOsState)

  const open = useCallback((id: WindowId) => dispatch({ type: 'open', id }), [])
  const close = useCallback((id: WindowId) => dispatch({ type: 'close', id }), [])
  const focus = useCallback((id: WindowId) => dispatch({ type: 'focus', id }), [])

  const bodies = useMemo(() => {
    const map = new Map<WindowId, ReactNode>([
      ['readme', <ReadmeWindow key="readme" />],
      ['work', <WorkWindow key="work" onOpen={open} />],
      ['art', <ArtWindow key="art" />],
      ['me', <MeWindow key="me" />],
      ['contact', <ContactWindow key="contact" />],
    ])
    for (const p of PROJECTS) map.set(p.id, <ProjectWindow key={p.id} project={p} />)
    return map
  }, [open])

  // Mobile: the same windows as a plain scrolling stack. One branch, not a
  // parallel component tree, or the two would drift within a month.
  // On mobile every window is already expanded, so WorkWindow's row buttons
  // dispatch an open for something already visible. Harmless, and cheaper than
  // a second code path; revisit only if it confuses anyone.
  if (!isDesktop) {
    return (
      <div className="relative z-10 mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
        <MobileHeader />
        {WINDOWS.map((w) => (
          <div key={w.id} className="h-[min(70vh,520px)]">
            <Window
              id={w.id}
              title={t(w.titleKey)}
              zIndex={0}
              hidden={false}
              onClose={() => {}}
              onFocus={() => {}}
            >
              {bodies.get(w.id)}
            </Window>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative z-10 h-screen overflow-hidden">
      <ul className="absolute left-3 top-3 z-[5] flex w-24 flex-col gap-1">
        {DESKTOP_ICON_IDS.map((id) => {
          const def = WINDOWS.find((w) => w.id === id)
          if (!def) return null
          return (
            <li key={id}>
              <Playable id={`icon-${id}`} caps={['move']}>
                <DesktopIcon id={id} label={t(def.titleKey)} glyph={def.glyph} onOpen={() => open(id)} />
              </Playable>
            </li>
          )
        })}
      </ul>

      {WINDOWS.map((w) => {
        const shown = isOpen(state, w.id)
        return (
          <div key={w.id} className="absolute" style={{ left: w.x, top: w.y }}>
            <Playable id={`win-${w.id}`} caps={['move']}>
              <div style={{ width: w.width, height: w.height }}>
                <Window
                  id={w.id}
                  title={t(w.titleKey)}
                  zIndex={zIndexOf(state, w.id)}
                  hidden={!shown}
                  onClose={() => close(w.id)}
                  onFocus={() => focus(w.id)}
                >
                  {bodies.get(w.id)}
                </Window>
              </div>
            </Playable>
          </div>
        )
      })}

      <div data-taskbar>
        <Taskbar open={state.open} onSelect={focus} />
      </div>
    </div>
  )
}

function MobileHeader() {
  const { lang, setLang } = useI18n()
  return (
    <header className="flex items-center justify-between">
      <span className="font-mono text-sm tracking-widest text-brand-300">WILDEAX OS</span>
      <button
        type="button"
        aria-label="Switch language"
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-300"
      >
        {lang === 'en' ? 'ES' : 'EN'}
      </button>
    </header>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. 51 tests total.

- [ ] **Step 6: Commit**

```bash
git add src/os
git commit -m "Add the Desktop composition and the mobile branch

Desktop.tsx is the only file that knows about viewport size. Below Tailwind's
md breakpoint the same Window components render as a plain scrolling stack,
rather than a second component tree that would drift.

Window and icon positions come from Playable, so they are shared and permanent.
Open/closed and z-order live in a useReducer and are per visitor, which is what
stops one person closing every window and leaving the page blank for everyone."
```

---

### Task 8: Wire it into App and delete the old page

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/index.ts`
- Delete: `src/components/sections/Hero.tsx`, `Features.tsx`, `About.tsx`, `Contact.tsx`, `Footer.tsx`
- Delete: `src/components/navigation/Navbar.tsx`
- Delete: `src/components/PresenceBadge.tsx`
- Delete: `src/reactbits/TextPressure.tsx`

**Interfaces:**
- Consumes: `Desktop` from `@/os/Desktop`
- Produces: nothing

- [ ] **Step 1: Rewrite App.tsx**

Replace the whole file with:

```tsx
// no default React import needed in React 17+ JSX runtime
import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Aurora from '@/reactbits/Aurora'
import { PlayRoot } from '@/play'
import { StickerLayer } from '@/play/StickerLayer'
import { Desktop } from '@/os/Desktop'

// Split out so `three` (AsciiCanvasText, used only by NotFound) and
// `react-icons` (used only by Links) leave the main chunk.
const Links = lazy(() => import('@/pages/Links'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function App() {
  const { pathname } = useLocation()
  return (
    <PlayRoot pathname={pathname}>
      <div className="relative min-h-screen bg-[#0b0e12] text-zinc-200 antialiased">
        {/* Wallpaper */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-80">
            <Aurora colorStops={['#0ea5e9', '#7c3aed', '#0ea5e9']} amplitude={1.3} blend={0.7} />
          </div>
          <div className="absolute inset-0 bg-grid [background-size:24px_24px] opacity-[0.05]" />
          {/* Scanlines */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)',
            }}
          />
        </div>

        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Desktop />} />
            <Route
              path="/links"
              element={
                <div className="relative z-10">
                  <Links />
                </div>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        <StickerLayer />
      </div>
    </PlayRoot>
  )
}

export default App
```

The presence count moved into the taskbar, so `PresenceBadge` is gone.

- [ ] **Step 2: Stop Aurora under prefers-reduced-motion**

The spec requires ambient motion to stop for visitors who ask for it. Window
open and close already animate instantly, since closing sets `hidden` rather
than transitioning, but Aurora runs a WebGL loop regardless.

In `src/App.tsx`, add above the `App` function:

```tsx
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
```

and render the wallpaper's animated layer conditionally, keeping the static
gradient so the page is not black:

```tsx
        <div className="pointer-events-none fixed inset-0 z-0">
          {prefersReducedMotion() ? (
            <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(14,165,233,0.35),transparent),radial-gradient(60%_60%_at_80%_90%,rgba(124,58,237,0.3),transparent)]" />
          ) : (
            <div className="absolute inset-0 opacity-80">
              <Aurora colorStops={['#0ea5e9', '#7c3aed', '#0ea5e9']} amplitude={1.3} blend={0.7} />
            </div>
          )}
          <div className="absolute inset-0 bg-grid [background-size:24px_24px] opacity-[0.05]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)',
            }}
          />
        </div>
```

Replace the wallpaper block written in Step 1 with this version.

- [ ] **Step 3: Trim the component barrel**

Replace `src/components/index.ts` with:

```ts
export { default as Button } from './Button'
export { default as Card } from './Card'
export { default as ThemeToggle } from './navigation/ThemeToggle'
```

- [ ] **Step 4: Delete the old page**

```bash
rm src/components/sections/Hero.tsx \
   src/components/sections/Features.tsx \
   src/components/sections/About.tsx \
   src/components/sections/Contact.tsx \
   src/components/sections/Footer.tsx \
   src/components/navigation/Navbar.tsx \
   src/components/PresenceBadge.tsx \
   src/reactbits/TextPressure.tsx
```

`SpotlightCard` and `ScrambledText` are NOT deleted. `src/pages/Links.tsx`
imports both, and this work leaves `/links` untouched.

- [ ] **Step 5: Check nothing still references the deleted files**

Run: `grep -rn "Hero\|Features\|About\|Footer\|Navbar\|PresenceBadge\|TextPressure" src --include=*.tsx --include=*.ts`

Expected: no matches outside comments. If `Contact` matches, check whether it is
`ContactWindow`, which is fine.

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: both succeed. Report the new main chunk size against the 657.49 KB it
measured before this task; deleting `TextPressure` should reduce it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Replace the scrolling page with WILDEAX OS

Hero, Features, About, Contact, Footer and Navbar are gone. The home route
renders the Desktop. Aurora stays as wallpaper with a scanline overlay, and the
presence count moved into the taskbar.

Deleting TextPressure also fixes the clipped wordmark: it measured its
container once on mount and again only on resize, so when Inter finished
loading the text overflowed its overflow-hidden box.

SpotlightCard and ScrambledText stay, because /links imports them."
```

---

### Task 9: Prune dead translations and verify the whole thing

**Files:**
- Modify: `src/i18n/index.tsx`

**Interfaces:**
- Consumes: the registry test from Task 2
- Produces: nothing

- [ ] **Step 1: Remove the dead keys**

From BOTH `en` and `es` in `src/i18n/index.tsx`, delete every key belonging to
a deleted component:

```
nav.tagline  nav.arena  nav.splitwars  nav.minesweeper
hero.badge  hero.title  hero.tagline  hero.btn.start  hero.btn.explore
ethos.title  ethos.point1  ethos.point2  ethos.point3
features.heading  features.sub
features.generalist.title  features.generalist.desc
features.graphics.title  features.graphics.desc
features.arch.title  features.arch.desc
features.educator.title  features.educator.desc
about.title  about.body  about.badge.ceo
about.chip.unity  about.chip.shaders  about.chip.gameplay  about.chip.tools
contact.title  contact.sub  contact.email  contact.comingSoon
contact.linkedin  contact.x
footer.about  footer.features  footer.contact  footer.email
footer.linkedin  footer.x  footer.rights
```

Keep every `arena.*` and `notfound.*` key: `src/pages/ArenaAssistant.tsx` and
`src/pages/NotFound.tsx` still use them.

- [ ] **Step 2: Confirm no component still asks for a removed key**

Run: `grep -rnoE "t\('(nav|hero|ethos|features|about|contact|footer)\.[a-zA-Z.]+'\)" src --include=*.tsx`

Expected: no matches. A match means a component survived that should not have,
or a key was removed too eagerly.

- [ ] **Step 3: Verify both dictionaries still agree**

Run: `npm test`
Expected: PASS. The "no key present in one language but missing in the other"
test from Task 2 fails loudly if the two deletions drifted.

- [ ] **Step 4: Full verification**

```bash
npm test
npm run build
npm run lint
```

Expected: 51 tests pass. Build succeeds. Lint reports no NEW errors; the
pre-existing `@typescript-eslint/no-explicit-any` errors in `src/reactbits/`
remain and are not this work's job. Record the main chunk size.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Prune translations for the deleted page

Removes the nav, hero, ethos, features, about, contact and footer keys from
both dictionaries. arena.* and notfound.* stay, since ArenaAssistant and
NotFound still use them.

The registry test asserts both dictionaries hold identical key sets, so a
one-sided deletion fails rather than shipping a missing Spanish string."
```

---

## Browser verification

Not a task, because it cannot be automated in this environment. Before this
goes to production, on a preview URL:

1. The desktop loads with `readme.txt`, `work.exe` and `me.jpg` already open.
2. Dragging a window in one browser moves it in another within a second.
3. Reloading keeps the moved position.
4. Closing a window in one browser does NOT close it in the other. This is the
   per-visitor half of the state split, and it is the thing most likely to be
   wrong.
5. Clicking `work.exe` rows opens project windows, and their links work.
6. At a phone width the page scrolls, every window is a full-width card, and
   there is no taskbar.
7. `wildeax.com/links` still renders unchanged.

## Deployment

Deploying is the site owner's call and needs explicit approval each time.

```bash
npm run build
npx wrangler versions upload     # preview URL, production untouched
npx wrangler versions deploy     # promote to wildeax.com
```
