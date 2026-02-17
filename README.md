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

## 📝 Notes for Next AI Agent

This project is set up with:
- Modern React patterns and hooks
- TypeScript for type safety
- Tailwind CSS for styling
- Component-based architecture
- Path aliases configured (`@/components`, `@/`)
- Development-ready configuration

Feel free to build upon this foundation!