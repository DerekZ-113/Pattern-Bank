# Pattern Bank

React app for tracking LeetCode problems with spaced repetition. localStorage-first with optional Supabase cloud sync. Deployed on Vercel.

## Commands

- `npm run dev` — Vite dev server (port 5173)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Vitest (run once)
- `npm run test:watch` — Vitest watch mode

## Architecture

- **Storage**: localStorage (source of truth) → Supabase PostgreSQL (async cloud backup)
- **Sync**: Fire-and-forget — write local first, push to cloud non-blocking. Errors logged, never thrown to UI.
- **Conflict resolution**: most recent `updatedAt` timestamp wins
- **Field mapping**: camelCase (frontend) ↔ snake_case (Supabase) via `toSnakeCase()`/`toCamelCase()` in `src/utils/supabaseData.js`
- **Spaced repetition**: SM-2 simplified — confidence 1→1d, 2→1d, 3→3d, 4→7d, 5→14d

## Code Conventions

- Functional React components with hooks (no classes)
- Components: PascalCase `.jsx` — Utils: camelCase `.js` — Hooks: `use*.js`
- Tests: `tests/*.test.js` using Vitest with globals
- State hooks: `useProblems` (data), `useUI` (UI state), `useAuth` (auth) — wired together in `App.jsx`
- No TypeScript — plain JS + JSX
- Tailwind CSS for all styling, custom `pb-*` color tokens
- Props passed explicitly (no global state except AuthContext)
- Handlers named `handle*` internally, passed as `on*` props

## Key Rules

- New problem fields must be added to both `toSnakeCase()` and `toCamelCase()` in `src/utils/supabaseData.js`, and to the Supabase `problems` table
- Don't change the localStorage-first architecture
- Don't make cloud sync blocking
- Don't modify `src/utils/leetcodeProblems.js` (3,846-entry static database)
