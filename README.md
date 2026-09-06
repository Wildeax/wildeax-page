# Wildeax Portfolio Webpage

A modern React application built with Vite, TypeScript, and Tailwind CSS.

## 🚀 Tech Stack

- **React 19** - Component-based UI library
- **Vite** - Lightning fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS & Autoprefixer** - CSS processing

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx      # Button component with variants
│   ├── Card.tsx        # Card wrapper component
│   └── index.ts        # Component exports
├── assets/             # Static assets
├── App.tsx             # Main application component
├── main.tsx            # React DOM entry point
├── index.css           # Global styles (Tailwind imports)
└── vite-env.d.ts       # Vite type definitions
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 Components

### Button Component
A flexible button component with multiple variants and sizes:
- **Variants:** `primary`, `secondary`, `outline`
- **Sizes:** `sm`, `md`, `lg`
- **Props:** `onClick`, `disabled`, `className`

### Card Component
A simple card wrapper with optional title:
- **Props:** `title`, `className`, `children`

## 🔧 Development Features

- **Path Aliases:** Use `@/` for src directory imports
- **Hot Module Replacement (HMR)** - Instant updates during development
- **TypeScript Support** - Full type checking and IntelliSense
- **Tailwind CSS** - Utility-first styling with custom animations
- **ESLint** - Code linting and formatting

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Notes for the next agent

Start with `docs/HANDOFF.md`. It says what is in production, where every
piece lives, how to run the browser gate, and what is pending (wcat, the
pet, is implemented on `feat/wcat` and awaits preview review. Its design
and verification record are in `docs/superpowers/`).

## The shared play layer

Every visitor can drag, spin and scale the page's elements and place stickers,
and that state is shared with everyone else and persists. Visitors also see each
other's cursors. Design notes are in
`docs/superpowers/specs/2026-09-04-shared-play-layer-design.md`.

Sticker placements are shared within each layout, not between layouts:
desktop uses `wildeax-stickers`, mobile uses `wildeax-stickers-mobile`.
The cat and yarn toy are private. On phones, tap **Play** to open the palette;
use **Remove stickers** to remove a placed sticker by tapping it.

There is no admin UI and no moderation queue. Stickers come from a fixed palette
and there is no text input anywhere in the feature, so the worst case is an
arrangement you dislike rather than something written about you.

### Resetting it

Bump the room number in `src/play/room.ts`:

```ts
const DEFAULT_ROOM = 'wildeax-2'  // increment this value to reset
```

Then `npm run build && npx wrangler deploy`. The old room is abandoned rather
than deleted, so the number only ever goes up.

playhtml prefixes rooms with the host: production, preview hosts and localhost
have separate storage. To look at a clean desktop or run a check without
rearranging other visitors' layouts on that host, add `?room=anything` to the
URL (1–40 letters, digits or hyphens). Always use a fresh room for browser
tests. Do not bump the default room just to deploy: that abandons live data.

### Adding stickers

Extend `STICKER_KINDS` in `src/play/stickers.ts`. Emoji use `glyph`, images use
`src` and are imported from `src/assets/img/`.

### Changing the sync backend

`src/play/sync.tsx` is the only file allowed to import playhtml, enforced by a
`no-restricted-imports` ESLint rule. Everything else imports from `@/play`.
Self-hosting the PartyKit server is a one-line change to `initOptions.host` in
that file; replacing playhtml entirely means rewriting that file and nothing
else.
