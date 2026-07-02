# Core Extraction Plan — `@patternbank/core`

**Date:** 2026-07-01 · **Approved by:** Derek · **Precedes:** mobile adoption plan (patternbank-mobile, V2.1)

## Context

Web (this repo, public) and `patternbank-mobile` (private, `~/Documents/Development/patternbank-mobile`) duplicate ~21 logic modules that have drifted — the review confirmed the drift is one-directional (mobile evolved; canonical = mobile almost everywhere) and that most confirmed client bugs (F-4, F-5, F-8, F-9, F-13–F-17) are fixed *by* adopting the canonical versions in one shared package. Architecture already decided with the user: **hybrid** — `packages/core` npm workspace inside this public repo; web imports it in-repo; mobile consumes it as a published public npm package.

User decisions (2026-07-01): package name **`@patternbank/core`** (create free npm org `patternbank` at publish time); mobile adopts core **after V2.0 ships, as V2.1** — V2.0 release-check branch stays untouched except the date-rotting test fix.

Source of truth for module verdicts: `docs/reviews/2026-07-01-cross-repo-review/extraction-map.md`. Both repos use npm + package-lock; web is Vite 7/Vitest 4/TS 5.9 `moduleResolution: bundler`, no aliases, tests in `tests/`; mobile is Expo 54/RN 0.81/jest 29 + jest-expo, default Metro (no `unstable_enablePackageExports`), strictly relative imports (73 util import sites).

**Invariants (every phase):** web green (`npm run typecheck && npm run lint && npm test && npm run build`) and Vercel-deployable; one phase = one PR/merge commit so rollback = one revert. localStorage-first unchanged; web cloud sync stays non-blocking; `leetcodeProblems.js` stays JS + `.d.ts` (verified ESM — `export function`/`export default` — so it bundles cleanly).

## Decision record (settled once — implementers don't re-litigate)

| ID | Decision |
|----|----------|
| **F-3** | **Persisted prune watermark.** Core `pruneOldEvents(events, {retentionDays})` is pure, returns `{kept, cutoffIso}`; platform persists `cutoffIso` under new storage key `patternbank-review-events-pruned-before` (added to core `constants.ts`). `mergeReviewEvents(local, cloud, {prunedBefore})` drops **cloud** events older than the watermark. Pruning becomes an explicit post-sync maintenance step, never a load-time side effect. Why watermark over a `since` fetch param: correct at the merge layer no matter how events arrive; directly testable ("sync twice → zero re-added events"); cloud keeps full history. Web passes `retentionDays: null` (behavior unchanged); mobile keeps 180d. |
| **F-5** | Core `performFullSync` is **fail-closed** (mobile semantics): every cloud write awaited; any failure returns `{ok:false, error}`; platforms show unsynced state and retry. Web hook's `synced`-on-error path disappears; sync stays non-blocking (fire it, render from localStorage immediately). |
| **F-6** | `CorePreferences` gains `updatedAt` (ISO string); newest-wins merge like problems (`preferences.updated_at` column already exists in Supabase). Migration shim: stored prefs without `updatedAt` get epoch (`1970-01-01…`) so existing users' first sync preserves today's cloud-wins, newest-wins thereafter. |
| **F-7** | Adopt mobile's orphan-review-event filtering (post-merge, events filtered to surviving problems). Cloud `review_log` cleanup of already-orphaned rows = out-of-scope follow-up. |
| **F-8** | All core review-log writes use upsert `onConflict: 'dedupe_key'` (mobile's discipline — web behavior change, backward compatible with existing rows). |
| **F-9** | Mobile's `syncTimeout.ts` moves to core; every core cloud call wrapped in `withCloudOperationTimeout`. |
| **F-13/14** | Mapping uses `?? null` (web's) for `leetcodeNumber/url/notes`; `updated_at` stays typed `string`, validated on read — corrupt row missing it → epoch fallback + `warn` hook (never `null!`, never silent `now()`). |
| **F-15/16/4** | Mobile canonical: `Math.max(0, dailyGoal)` clamp; keep non-today completion records in merge; mobile `mergeImportedProblems` (canonical-id remap, NaN-guarded `timestampMs`) + single `deduplicateProblems`. |
| Out of scope | Web-only UI bugs F-20/21/22 (standalone PR later); mutation queue + notifications stay mobile-side (map #19); Edge Function/DB already fixed in Step 0. |

## Status ledger (Phases 0–3 complete)

| Phase | Commit | Outcome |
|---|---|---|
| 0 scaffold | `92d46ce` | packages/core workspace; tsup dual ESM+CJS; web consumes core AS SOURCE (tsconfig paths + Vite alias, `import.meta.dirname`); CI `build:core` gate; Vercel untouched |
| 1 tests | `966eedb` | Parity fixture byte-identical + date-shift layer; 10 `it.fails` FIXED-BY markers; pins: web already fail-closes batch inserts, already orders reset deletes before re-upserts, `replaceReviewLog` already shares mobile's dedupe format |
| 2 leaf utils | `3f68d4e` | types/constants/dateHelpers/spacedRepetition/progress*/leetcode{problems,importTransforms,problemLists} in core; permanent shims `src/types.ts` + `src/utils/constants.ts`; SyncStatus superset; `CorePreferences.updatedAt?` + prune-watermark key |
| 3 domain | `d55f2e5` | problemTransforms (F-4 ✓), projectionEngine (F-15 ✓), todayView, todayResolver (timestamp), todayCompletions (F-16 ✓, pure parse/serialize + async adapter load/save); syncTimeout, StorageAdapter+CoreHooks, pure `pruneOldEvents` |
| Mobile prep | `fceb7f1` (mobile repo, `fix/test-fixture-rot`) | 3 rotting suites → relative dates; mobile baseline 466 pass / 0 fail (57/57 in Derek's checkout) |

## Overnight run order + limit-recovery protocol (Phases 4–7)

Run order (unattended): seed `OVERNIGHT-REPORT.md` ledger first → Phase 4 (web) → gate → commit → automated live smoke → Phase 5 (web, incl. two-device simulation suite) → gate → commit → Phase 6 validation + pack only (NO publish) → Phase 7 mobile adoption in an isolated worktree consuming the packed tarball (per-sub-step commits; NO EAS release, NO merges, NO push).

Hard rails: never `git push` (either repo); never publish to npm; never touch mobile's `V2.0-release-check` branch or Derek's mobile working copy; no Supabase admin-write MCP tools; one checkpoint = one commit.

Limit-hit recovery: `OVERNIGHT-REPORT.md` is a live checkbox ledger (step → commit SHA → suite result). Every checkpoint ends committed-green or reverted-to-last-green; a mid-step cutoff loses at most one step (`git status`; if dirty, discard and redo that step). No auto-resume — the report ends with a paste-to-resume prompt Derek uses in the morning. Web phases run first because they gate the morning publish; Phase 7 runs last so a cutoff costs only mobile-adoption progress.

## Phase 0 — Workspace scaffolding (no logic moves; web byte-identical at runtime)

- **Root `package.json`:** add `"workspaces": ["packages/*"]`, `"engines": {"node": ">=22"}` (matches CI), scripts `build:core` / `typecheck:core` (`npm run <x> -w @patternbank/core`). Run `npm install` once to regenerate the lockfile with workspace metadata.
- **`packages/core/package.json`:** name `@patternbank/core`, version `0.1.0`, `"type": "module"`, `sideEffects: false`, dual exports — `"exports": {".": {"types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs"}, "./package.json": "./package.json"}` — `files: ["dist"]`, `publishConfig.access: "public"`, `prepublishOnly: npm run build`. `@supabase/supabase-js` as devDep + **optional peerDep** (types-only in core; client is injected — neither app double-installs).
- **Build tool: tsup** (`format: ["esm","cjs"], dts: true, target: "es2020"`, entry `src/index.ts`). Why: mobile audit recommends dual CJS+ESM (jest 29/jest-expo take CJS happily, Metro/`bundler` resolution take ESM); tsc can't emit dual without two configs. Single entry barrel, **no subpath exports in v1** — keeps the exports map trivially correct for Metro without `unstable_enablePackageExports`.
- **Dev-time resolution: source-linked, dist never used by web.** Root `tsconfig.json`: add `paths: {"@patternbank/core": ["packages/core/src/index.ts"]}`, extend `include` to `["src","tests","packages/core/src","packages/core/tests"]`, exclude `packages/core/dist`. `vite.config.js`: exact-match alias `"@patternbank/core": path.resolve(import.meta.dirname, "packages/core/src/index.ts")` (**not `__dirname`** — repo is ESM). No watch build, no stale-dist bugs; `dist` exists only as the publish artifact. **No composite/project references** (all `noEmit`, one package, one consumer — `tsc -b` orchestration buys nothing for a solo dev). Core gets its own standalone `tsconfig.json` (same options as root minus jsx) for tsup's dts pass.
- **Vitest:** extend include to `["tests/**/*.test.{ts,tsx}", "packages/core/tests/**/*.test.ts"]` — core tests run under root vitest (globals inherited, no second config). Core tests import core internals **relatively** (`../src/sync/merge`), not via the barrel.
- **ESLint (flat config):** globalIgnores += `'packages/*/dist'`; change `'src/utils/leetcodeProblems.js'` ignore → `'**/leetcodeProblems.js'`; TS block files += `'packages/*/src/**/*.{ts,tsx}'`; tests block += `'packages/*/tests/**/*.{ts,tsx}'`.
- **CI/Vercel:** `vercel.json` and build command **unchanged** (build never needs dist; `npm ci` handles workspaces natively). `.github/workflows/ci.yml`: add `npm run build:core` step before the vite build — the artifact gate proving the publishable package always compiles. Tailwind: no change (core has zero JSX/classes by design).
- **Scaffold:** `src/index.ts` placeholder export + core smoke test + web-side `tests/coreLink.test.ts` importing `@patternbank/core`.
- **Also commit this plan** to `docs/plans/2026-07-01-core-extraction-plan.md` (repo convention: docs/ holds review + ops docs).

**Gate:** `npm install && npm run typecheck && npm run lint && npm test && npm run build:core && npm run build`; Vercel preview deploys unchanged app.

## Phase 1 — Test-first: parity fixtures + write-before-extraction suites

All new tests land at their permanent home `packages/core/tests/`. Where core doesn't own the behavior yet they import the **web** implementation via relative path; each later phase flips imports to `../src/...` and deletes the web copy. Where web is non-canonical, mark `it.fails` + `// FIXED-BY: Phase N (F-xx)`; the fixing phase flips them.

1. **Parity fixtures — core owns them.** Copy mobile's untracked `crossPlatformParity.test.ts` + `crossPlatformReviewParity.json` → `packages/core/tests/parity/` + `tests/fixtures/`. **Rewrite fixture dates relative to "today"** (computed in setup) — also kills the fixture-rot mechanism that broke mobile's 3 baseline suites. Five families: confidence intervals, five-star graduation, today due-state (goal cap, excludeFromReview, ordering), Done Today feed, LC completion identity.
2. **F-4 fixtures:** `problemTransforms.mergeImported.test.ts` — cross-device import (id→leetcodeNumber remap, NaN-guarded timestamps, `changedProblems`/`importedIdToCanonicalId`). `it.fails` until Phase 3.
3. **Sync-merge fixtures:** `sync/mergeFixtures.test.ts` — NaN/missing timestamps (F-17), tombstone resurrection, reset-marker filtering, 5s event tolerance **including same-`problemId`-different-`date`** (untested streak-day-drop path). Owned in Phase 5.
4. **F-6 acceptance:** `preferences.roundTrip.test.ts` — signed-out change survives next sign-in (`it.fails` until Phase 5).
5. **F-3 regression:** `sync/pruneMergeChurn.test.ts` — prune → sync twice → zero re-added events, zero churn (`it.fails` until Phase 5).
6. **Untested paths (from coverage report):** `review_date`/`dedupe_key` near-local-midnight boundary; `batchInsertReviewLogs` partial-chunk failure; reset ordering (deleteAll completes before re-upsert).

**Consolidation rule for the 17 duplicated suites:** each moves to core in the phase its module extracts, web copy deleted same commit, mobile copies deleted in Phase 7. Web keeps only platform tests (hooks/components/adapters/push). No web parity mirror needed — core's parity suite runs in web CI via the vitest glob.

## Phase 2 — types, constants, leaf utils (map #1–9)

| Core file | Canonical | Notes |
|---|---|---|
| `types.ts` | split | `SyncStatus` = mobile superset (+`pending/offline`); `CorePreferences` base incl. new `updatedAt` |
| `constants.ts` | split | patterns, `DIFFICULTIES`, storage keys (+ prune watermark key), base `DEFAULT_PREFERENCES` |
| `dateHelpers.ts` | **web** | wider `utcToLocalDateStr(string\|null\|undefined)` |
| `spacedRepetition.ts`, `progressVisuals.ts`, `leetcodeReviewActions.ts`, `leetcode/problems.js`+`.d.ts`, `leetcode/importTransforms.ts` | either | verbatim |
| `progressUtils.ts` | **mobile** | `CONFIDENCE_BAR_COLORS` stays web (`src/utils/theme.ts`) |
| `leetcode/problemLists.ts` | **mobile** | + web's `typeof !== "number"` guard |

Web: delete each extracted `src/utils/*`, rewire imports to `@patternbank/core`. **Exception — permanent platform shims** for the two widest-fan-out files: `src/types.ts` and `src/utils/constants.ts` re-export core + keep web-only pieces (`PATTERN_COLORS` CSS vars, `ToastState` w/ `onClick`, `ActiveTab`, `Preferences = CorePreferences & {...}`) so consumers don't churn. Tests moved: dateHelpers, spacedRepetition, leetcodeProblems, leetcodeReviewActions, problemLists, importTransforms, progressUtils (union web+mobile assertions).

**Gate:** full green + Vercel preview; parity families "confidence intervals" + "graduation" flip to core imports.

## Phase 3 — domain layer + StorageAdapter (map #11–14, #16, #21, syncTimeout)

Create in core: `projectionEngine.ts` (**mobile**, F-15 clamp, mobile's type names — rename web call sites), `todayView.ts` (**union**), `leetcode/todayResolver.ts` (**mobile** — timestamp-based `getReviewedTodayTimestamp`; web's debug snapshot moves to new `src/utils/todayDebug.ts` via debug hook), `leetcode/todayCompletions.ts` (**mobile** pure parts, F-16 keep non-today records; load/save behind adapter), `problemTransforms.ts` (**mobile**, F-4 + single `deduplicateProblems`), `syncTimeout.ts` (**mobile** verbatim), `storage/adapter.ts` (interface below), `storage/logic.ts` (mobile's parameterized `calculateStreak(log)`, `countReviewedToday`, pure `pruneOldEvents` per F-3).

Web: delete the five utils; add `src/adapters/webStorage.ts` (localStorage behind Promises); `src/utils/storage.ts` shrinks to import/export (File APIs) + adapter instance + re-exports. **The one non-mechanical rewire:** resolver's boolean→timestamp return — update Today view call sites. Tests moved: duplicatePrevention, excludeFromReview, problemTransforms (F-4 flips green), projectionEngine (F-15 flips), todayLeetCodeCompletions (F-16 flips), todayLeetCodeResolver, todayView (consolidated), deduplicateProblems + syncTimeout (recreated from mobile), new pruneOldEvents purity/cutoff tests.

**Gate:** full green; parity families "today due-state" / "Done Today feed" / "LC completion identity" on core; manual Today-view smoke on preview (resolver semantics changed).

## Phase 4 — Supabase mapping + data layer (map #15, #20) — first shared-backend behavior change

Create in core: `supabase/mapping.ts` (`toSnakeCase`/`toCamelCase` + row types; F-13 `?? null` for leetcodeNumber/url/notes; F-14 `updated_at` typed `string`, validated on read → epoch fallback + `warn` hook; mobile's `CloudPreferences` cloud-subset split + `updatedAt`), `supabase/data.ts` (factory `createCloudData({supabase, hooks, timeoutMs})` — every call wrapped in the cloud-operation timeout (F-9), review-log writes upsert `onConflict: 'dedupe_key'` (F-8)), `leetcode/activityData.ts` (**mobile** canonical, timeout-wrapped, factory `createLeetCodeActivityData`), and `leetcode/reviewActions.ts` (deferred from Phase 2 — its type imports resolve once activityData lands).

**Phase 7 constraint:** `createCloudData` accepts `supabase: SupabaseClient | null` and, when null, every returned function no-ops with the exact per-function guard shape both platforms use today (`{ data: null, error: null }` style) — mobile injects a nullable client. All new symbols (`createCloudData`, `toSnakeCase`, `toCamelCase`, row types, `CloudPreferences`, activityData + reviewActions exports) export from the barrel — Phase 7's canary imports them from `@patternbank/core`.

Refinements from execution (don't re-fix): `review_date` derivation already identical on both platforms (pinned contract test); `batchInsertReviewLogs` already surfaces chunk errors (pinned); only `logReview` + batch rows need dedupe keys — contract `review:${userId}:${problemId}:${timestamp}`; `replaceReviewLog` already uses `leetcode-rating:${userId}:${problemId}:${reviewDate}`.

Web: `src/utils/supabaseData.ts` + `leetcodeActivityData.ts` shrink to re-export shims (they stay as vi.mock targets); `leetcodeReviewActions.ts` deletes; keep `supabaseClient.ts`; new `src/utils/cloudData.ts` constructs the factories once. Tests: supabaseData, supabaseFieldMapping, leetcodeActivityData, leetcodeReviewActions suites move to `packages/core/tests/` (union with mobile's richer versions) against injected mock clients; the 2 F-8 `it.fails` markers flip.

**Gate:** full green + **manual cloud smoke against live Supabase from a preview deploy before merging** (log a review signed-in → row carries `dedupe_key`; replay to confirm idempotent upsert). This plan doc synced in the same working tree.

## Phase 5 — sync merge core + performFullSync (map #17–18; F-3/5/6/7/17 land) — highest risk

Create in core: `sync/reviewEvents.ts` (mobile's file split; 5s tolerance; **date-aware event matching is NEW canonical behavior — neither platform has it today**, pinned by the mergeFixtures marker), `sync/merge.ts` (merges + reset/tombstone filters; NaN guards (F-17); web's richer stats returns; `{prunedBefore}` param (F-3)), `sync/fullSync.ts` (`performFullSync(deps)` — fail-closed (F-5), orphan filter (F-7), prefs newest-wins (F-6), watermark merge + post-sync prune; reset ordering already correct — keep the passing pin green), `preferences.ts` (`mergePreferences` newest-wins + epoch shim for blobs without `updatedAt`).

Web: `src/utils/sync.ts` shrinks to fire-and-forget push layer + deps assembly (delete its `deduplicateProblems` copy — core's is the covered one); `useCloudSync` calls core `performFullSync`, surfaces `error` honestly (no more synced-on-error), stays non-blocking; `webStorage` adapter finally consumed; web passes `eventRetentionDays: null` (never prunes — unchanged behavior). Tests: `sync.test.ts` + `syncOnSignIn.test.ts` consolidate into `packages/core/tests/sync/` (union with mobile's); flip the 4 remaining markers; new partial-failure mid-sync test (tombstone upsert fails → local state not poisoned, error returned).

**Gate (overnight):** full green, zero remaining `it.fails`, plus NEW `packages/core/tests/sync/twoDeviceSimulation.test.ts` — two in-memory adapters + one fake cloud, 5 scenarios (sign-in merge both directions / clear-all + reset marker / offline edit → reconnect / prefs newest-wins across devices / prune watermark churn). The **manual two-browser matrix on a preview deploy stays as Derek's gate before merging to main** (morning checklist), not the overnight run's.

## Adapter contracts (fixed now, implemented Phases 3–5)

```ts
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove?(keys: string[]): Promise<void>;   // AsyncStorage native; web loops
}
export interface CoreHooks {                      // core never imports posthog/sentry/console
  analytics?: (event: string, props?: Record<string, unknown>) => void;
  debugLog?: (message: string, data?: unknown) => void;   // web Today-LC snapshot
  warn?: (message: string, data?: unknown) => void;        // F-14 corrupt-row warnings
  now?: () => Date;                                        // testability
}
// createCloudData({ supabase: SupabaseClient | null, hooks?, timeoutMs? }) → bound CRUD
//   ({ data, error } returns; null client → per-function no-op guard shapes)
// performFullSync({ storage, cloud, userId, hooks?, eventRetentionDays? /* null=web, 180=mobile */ })
//   → { ok: true; stats } | { ok: false; error }
```

Mutation queue + notifications deliberately have **no** core interface in v1.

## Phase 6 — split: validation + pack overnight; publish is Derek's morning step

- **Overnight (unattended):** from `packages/core`: `npm run build` → `npx publint` → `npx @arethetypeswrong/cli --pack .` → `npm pack` producing `patternbank-core-0.1.0.tgz` (left untracked in `packages/core/`; absolute path recorded in the report). The tarball is byte-identical to what `npm publish` would upload — Phase 7 installs from it, so mobile adoption is NOT blocked on npm login.
- **Morning (Derek, ~5 min):** `npm login` (verified: no auth on this machine) + create free npm org `patternbank` (`@patternbank/core` confirmed unclaimed) → `cd packages/core && npm publish` (prepublishOnly rebuilds) → `git tag core-v0.1.0`. Then in the mobile worktree: `npm i -E @patternbank/core@0.1.0` swaps the tarball dep for the registry dep (tiny follow-up commit). 0.x semver; `1.0.0` when mobile adoption ships as V2.1. Manual publish, no CI token.

## Phase 7 — Mobile adoption (isolated worktree, tarball dep; ships later as V2.1)

Runs unattended after Phase 6-validate, in a fresh worktree of patternbank-mobile — Derek's checkout (on `fix/test-fixture-rot`, with untracked parity suite) is never touched. NO EAS release, NO merges, NO push; the branch waits for V2.0 to ship, then rides as V2.1.

**Verified resolution facts:** mobile tsconfig extends `expo/tsconfig.base` → `moduleResolution: "bundler"` reads core's exports map; core package.json has top-level `main`/`module`/`types` fallbacks — no core or tsconfig edits needed. jest-expo's `customExportConditions ['require','react-native']` loads `dist/index.cjs` untransformed. Mobile-only surface stays as shims: `Preferences extends CorePreferences` (+notification fields), `PATTERN_COLORS`, nav/UI types. Measure the tracked baseline at F7.0 (expect 55 suites / ~458 tests), don't assume.

Sub-steps — every one ends `npm run typecheck && npm run lint && npm test` green + ONE commit + ledger row:

- **F7.0 setup:** `git worktree add .claude/worktrees/core-adoption -b feat/core-adoption fceb7f1`; append `.claude/` to `.git/info/exclude`; `npm ci`; record baseline counts (if not green, STOP and record why); empty baseline commit.
- **F7.1 tarball + canary:** copy the tarball into `vendor/` (source path has a space; vendored copy keeps the lockfile relative) → `npm i file:vendor/patternbank-core-0.1.0.tgz`. Append `|@patternbank/core` to jest transformIgnorePatterns' negative lookahead (insurance). Canary suite `coreResolution.test.ts` imports `CORE_PACKAGE_NAME, LEETCODE_PROBLEMS, searchProblems, createCloudData, performFullSync, toSnakeCase` from the barrel. Paste `createCloudData`/`performFullSync` d.ts signatures into the ledger.
- **F7.2 types/constants shims** (no importer changes): `src/types.ts` re-exports core types keeping local `Preferences extends CorePreferences`, nav/UI types; `src/utils/constants.ts` re-exports core constants keeping `PATTERN_COLORS` + local `DEFAULT_PREFERENCES` spread over core's.
- **F7.3 leaf utils** (~25 importers): delete dateHelpers/spacedRepetition/progressUtils/progressVisuals/projectionEngine/syncTimeout/leetcodeProblems{.js,.d.ts}; rewire to `@patternbank/core`; rewrite the one dying mock target (`useLeetCodePendingImports.test.ts` → `jest.mock("@patternbank/core", () => ({...jest.requireActual(...), <fakes>}))`); delete 6 duplicated suites.
- **F7.4 domain + AsyncStorage adapter:** delete problemTransforms/todayView/todayLeetCodeResolver/problemLists/leetcodeImportTransforms + rewire (todayResolver timestamp delta is intended — update callers, don't re-pin); `todayLeetCodeCompletions.ts` becomes a thin wrapper binding core's adapter-based load/save with AsyncStorage passed directly as the StorageAdapter; delete 8 duplicated suites.
- **F7.5 supabase factory injection** (paths KEPT as shims — processor/hook tests mock them): `supabaseData.ts` → `createCloudData({supabase, hooks: {analytics: posthog.capture, warn: console.warn}})`, destructure-re-export all current named exports + `toSnakeCase`/`toCamelCase`; `leetcodeActivityData.ts` same treatment; `leetcodeReviewActions.ts` deletes (rewire `DataContext.tsx`). Mutation queue/processor: ZERO changes. Delete 3 suites.
- **F7.6 performFullSync** (highest risk): delete `reviewEvents.ts`; `sync.ts` shrinks — `syncOnSignIn(...)` keeps its 7-arg signature, delegates to core `performFullSync(deps)` with `eventRetentionDays: 180` (mobile prunes; web passes null) + watermark from `REVIEW_EVENTS_PRUNED_BEFORE_KEY`; re-export core merge helpers so `useCloudSync`'s `jest.mock("../../utils/sync")` survives; `storage.ts` swaps calculateStreak/countReviewedToday/pruneOldEvents to core (`savePreferences` stamps `updatedAt`). Update surviving tests to the four intentional deltas (F-3/F-6/F-14/date-aware) — never re-pin old behavior. Contingency: if deps don't map cleanly, keep mobile's syncOnSignIn internals but swap all merge helpers to core (partial adoption, still green) and flag in the ledger.
- **F7.final:** delete canary; grep sweep proves zero references to deleted utils (deliberate survivors: the shim/platform paths); drop `leetcodeProblems.js` from mobile eslint globalIgnores; final gate + commit + ledger.

Stays mobile-side: `cloudMutationQueue/Processor`, `notifications`, `posthog`, `supabaseAuthStorage`, `supabaseClient`, `syncStatus`, `uiState`, import/export. Delete mobile's parity suite after the swap (core CI owns parity). Release later: normal EAS `production` profile; pure-JS dep → no `runtimeVersion` implications.

## Risks & rollback

| Phase | Top risk | Mitigation |
|---|---|---|
| 0 | Lockfile/workspace churn breaks Vercel/CI install | Pure scaffolding; Vercel preview is the gate; revert one commit |
| 0 | tsup `dts` rollup chokes on `problems.js`+`.d.ts` pair | Fallback: exclude from dts rollup and copy the hand-written `.d.ts` into dist |
| 1 | `it.fails` markers mask real breaks | Every marker carries `FIXED-BY: Phase N (F-xx)`; PR description lists all |
| 2 | Wide import churn (types/constants) | Permanent platform shims absorb it; rest mechanical |
| 3 | Resolver boolean→timestamp changes Today view | Manual Today smoke + parity ordering/goal-cap family |
| 4 | **Web starts writing `dedupe_key` + gains timeouts (shared backend)** | Live-Supabase smoke before merge; upserts backward-compatible with plain rows |
| 5 | **Sync semantics change (fail-closed, prefs merge, orphan filter, watermark)** | Two-browser sync matrix gate; each policy has a dedicated Phase-1 acceptance test; one-revert restores old web sync wholesale |
| 6 | Broken published artifact | publint + attw + CI `build:core` gate; bad version → publish `0.1.1`, never unpublish |
| 7 | Version skew vs RC branch; jest/Metro resolution | Exact pin + tag SHA; re-diff before swap; jest whitelist; per-family atomic commits |

Public-repo note: nothing secret moves — core's logic was already public via this repo and the browser bundle; verify no mobile-only config constants ride along in `constants.ts` during Phase 2.

## Definition of done (in-web-repo portion)

1. All 21 mapped modules live in `packages/core/src/`; web `src/utils/` keeps only platform files (`supabaseClient`, `theme`, `todayDebug`, thin `storage`, push-layer `sync`, `cloudData`) + the two permanent shims.
2. F-3/4/5/6/7/8/9/13/14/15/16/17 each have a green acceptance test in core; zero remaining `it.fails`.
3. Parity suite (5 families, relative dates) runs in core under web CI.
4. Root typecheck/lint/test cover core; CI builds the publish artifact; Vercel config unchanged.
5. `@patternbank/core@0.1.x` on npm, tagged, publint/attw-clean — consumable by mobile with zero web-repo follow-up.

## Verification summary

Per-phase gates above; end-to-end: full local suite green at every phase boundary, Vercel preview manually smoked at Phases 3 & 5, live-Supabase smoke at Phase 4, publint/attw at Phase 6. Phase 7 verified in the mobile repo (jest green incl. formerly-rotting suites, device QA of the four behavior deltas).
