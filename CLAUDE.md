# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # TypeScript check + production build (tsc -b && vite build)
npm run lint       # Run ESLint
npm run preview    # Preview production build locally

# Cloudflare Workers deployment
npm run cf:dev     # Local worker development (wrangler dev)
npm run cf:deploy  # Deploy to Cloudflare Workers
```

## Architecture Overview

This is a React 19 SPA portfolio site for Wildeax (Unity game developer/artist) deployed to Cloudflare Workers.

### Stack
- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS** for styling
- **React Router DOM v7** for client-side routing
- **Cloudflare Workers** with R2 bucket for edge deployment

### Project Structure

```
src/
├── components/         # UI components (Button, Card, sections/, navigation/)
├── pages/              # Route pages (ArenaAssistant, Links, NotFound)
├── reactbits/          # Visual effects (Aurora, Particles, BlobCursor, etc.)
├── i18n/index.tsx      # Custom i18n Context (English/Spanish)
├── config/featureFlags.ts  # Feature toggles
├── worker.ts           # Cloudflare Worker request handler
└── App.tsx             # Main app with routing
```

### Key Patterns

**Path aliases**: Use `@/` for src imports (e.g., `@/components`, `@/pages`)

**i18n**: Custom React Context-based system in `src/i18n/index.tsx`
- Use `useI18n()` hook to get `t()` function and `lang`/`setLang`
- Translation keys use dot notation: `'hero.title'`, `'arena.download'`
- Add translations to both `en` and `es` objects in the resources

**Visual effects**: WebGL/Canvas components in `src/reactbits/` using OGL, Three.js, GSAP, Framer Motion

**Feature flags**: Toggle features via `src/config/featureFlags.ts`

### Cloudflare Worker (`src/worker.ts`)

Handles edge routing:
- SPA fallback (serves index.html for client routes)
- `/api/arena-release` - Proxies version info from arena.wildeax.com
- `/api/arena-download` - Proxies installer download
- `/downloads/arena-assistant/latest` - R2 bucket download with semver resolution
- `/robots.txt` - Dynamic generation (disallows /arena-assistant)
- Static assets get 1-year cache headers

### Routes

- `/` - Main portfolio landing page
- `/arena-assistant` - Arena Assistant product page
- `/links` - Links page
- `*` - 404 Not Found
