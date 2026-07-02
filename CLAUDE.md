# Pattern Bank

React app for tracking LeetCode problems with spaced repetition. localStorage-first with optional Supabase cloud sync. Deployed on Vercel. Shared domain logic lives in the npm workspace `packages/core`, published as **@patternbank/core** and also consumed by the private React Native app (patternbank-mobile).

## Commands

- `npm run dev` — Vite dev server (port 5173)
- `npm run build` — production build (CI runs `build:core` first)
- `npm run build:core` — tsup build of packages/core (dual ESM+CJS, dist used only for publishing)
- `npm run typecheck` / `npm run typecheck:core` — tsc, root and core
- `npm run lint` — ESLint
- `npm test` — Vitest (runs web `tests/` AND `packages/core/tests/`)
- `npm run test:watch` — Vitest watch mode

## Architecture

- **Workspace**: npm workspaces; the web app consumes core AS SOURCE (root tsconfig `paths` + Vite alias → `packages/core/src/index.ts`). `dist/` exists only for `npm publish`.
- **Storage**: localStorage (source of truth) → Supabase PostgreSQL (async cloud backup)
- **Sync**: Fire-and-forget — write local first, push to cloud non-blocking. Errors logged, never thrown to UI. Sign-in sync = core `performFullSync` (fail-closed, orphan-event filter, prune watermark); web assembles its deps in `src/utils/sync.ts` and passes `eventRetentionDays: null` (web never prunes; mobile uses 180).
- **Conflict resolution**: most recent `updatedAt` timestamp wins (problems AND preferences — `usePreferences` stamps `updatedAt` on user edits)
- **Field mapping**: camelCase ↔ snake_case via `toSnakeCase()`/`toCamelCase()` in `packages/core/src/supabase/mapping.ts`; all cloud calls go through core's `createCloudData()` factory (`src/utils/cloudData.ts` binds it once; `src/utils/supabaseData.ts` is a re-export shim)
- **Spaced repetition**: SM-2 simplified — confidence 1→1d, 2→2d, 3→5d, 4→10d, 5→30d; repeated 5-star reviews graduate up to 365d

## Code Conventions

- Functional React components with hooks (no classes)
- Components: PascalCase `.tsx` — Utils: camelCase `.ts` — Hooks: `use*.ts`
- Shared domain types come from `@patternbank/core`; `src/types.ts` is a permanent shim that re-exports them plus web-only UI types
- Pure business logic lives in `packages/core/src/` (problemTransforms, sync/, supabase/, leetcode/, projectionEngine, todayView, …); `src/utils/` holds platform files + permanent shims (`constants.ts`, `supabaseData.ts`, `leetcodeActivityData.ts`, `sync.ts`)
- Tests: web `tests/*.test.ts(x)` (jsdom via `// @vitest-environment jsdom` docblocks) and `packages/core/tests/**` (NODE env — no localStorage/DOM; inject in-memory StorageAdapters and mock clients)
- State hooks: `useProblems` (coordinator), `usePreferences`, `useCloudSync`, `useUI`, `useAuth` — wired together in `App.tsx`
- TypeScript with `strict: true`; repo is ESM (`import.meta.dirname`, never `__dirname`)
- Tailwind CSS for all styling, custom `pb-*` color tokens
- Props passed explicitly (no global state except AuthContext)
- Handlers named `handle*` internally, passed as `on*` props

## Key Rules

- New problem fields: add to `Problem` in `packages/core/src/types.ts`, both directions in `packages/core/src/supabase/mapping.ts`, and the Supabase `problems` table — then coordinate a core version bump for mobile
- Don't change the localStorage-first architecture; don't make cloud sync blocking
- Don't modify `packages/core/src/leetcode/problems.js` (3,846-entry static database, stays JS with `.d.ts` companion)
- Never `vi.mock("@patternbank/core")` (the barrel doesn't intercept core-internal imports) — mock the core FILE or the web shim path instead (`tests/useLeetCodePendingImports.test.tsx` shows the pattern)
- `packages/core/tests/fixtures/crossPlatformReviewParity.json` is byte-shared with mobile — never hardcode new dates; the suite date-shifts at runtime
- Core shim paths in `src/utils/` are stable mock targets for tests — keep the paths even when internals change
