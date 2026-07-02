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

Create in core: `supabase/mapping.ts` (`toSnakeCase`/`toCamelCase` + row types; F-13 `?? null`; F-14 validated `updated_at`; mobile's `CloudPreferences` cloud-subset split + `updatedAt`), `supabase/data.ts` (CRUD as factory `createCloudData({supabase, hooks, timeoutMs})` — all calls timeout-wrapped (F-9), review-log writes dedupe-key upserts (F-8)), `leetcode/activityData.ts` (**mobile**, timeout-wrapped).

Web: delete mapping/CRUD from `src/utils/supabaseData.ts` + `leetcodeActivityData.ts`; keep `supabaseClient.ts`; construct the factory once in new `src/utils/cloudData.ts`; rewire `usePreferences`/`useProblems`/`useLeetCodeActivity`. Tests moved: supabaseData, supabaseFieldMapping (F-13/14 flip), leetcodeActivityData — against injected mock client. New: dedupe-key format contract test (byte-identical across platforms), timezone-boundary `review_date`, batch partial-failure surfaces error.

**Gate:** full green + **manual cloud smoke against live Supabase from the preview deploy before merging** (log a review → row has `dedupe_key`; confirm mobile build replaces rather than duplicates it).

## Phase 5 — sync merge core + fullSync orchestration (map #17–18; F-3/5/6/7 land) — highest risk

Create in core: `sync/reviewEvents.ts` (mobile's split; 5s tolerance; **event matching includes `date`** so a streak day can't be silently collapsed — pinned by Phase 1 test), `sync/merge.ts` (mergeProblems/ReviewLog/Tombstones/ReviewEvents + reset/tombstone filters; mobile NaN guards; **web's richer stats returns**; `{prunedBefore}` param), `sync/fullSync.ts` (single `performFullSync(deps)` — fail-closed, orphan filter, prefs newest-wins, watermark merge + post-sync prune, reset ordering guaranteed), `preferences.ts` (`mergePreferences` newest-wins + epoch shim).

Web: `src/utils/sync.ts` shrinks to the fire-and-forget push layer + deps assembly; local `deduplicateProblems` copy deleted; `useCloudSync` calls core `performFullSync`, surfaces `error` state honestly, stays non-blocking. Tests: sync.test + syncOnSignIn.test consolidate to `packages/core/tests/sync/`; Phase 1 `it.fails` all flip green (F-3, F-6, F-17, tolerance, reset ordering); new partial-failure mid-sync test (tombstone upsert fails → local state not poisoned). Web keeps useCloudSync/syncPush/usePreferences hook tests rewired.

**Gate:** full green; **two-browser manual sync matrix on preview** (sign-in merge; clear-all + reset marker; offline change → reconnect; prefs changed signed-out → sign-in); F-20/21/22 areas not worsened. Merge only after matrix passes.

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
// createCloudData({ supabase, hooks?, timeoutMs? }) → bound CRUD (throws on failure — F-5)
// performFullSync({ storage, cloud, userId, hooks?, eventRetentionDays? /* null=web, 180=mobile */ })
//   → { ok: true; stats } | { ok: false; error }
```

Mutation queue + notifications deliberately have **no** core interface in v1.

## Phase 6 — Publish + versioning

- Create free npm org `patternbank`; publish `@patternbank/core@0.1.0`: root green → `cd packages/core && npm publish` (prepublishOnly builds) → `git tag core-v0.1.0 && git push --tags`. Bumps via `npm version patch|minor --no-git-tag-version` thereafter. **Manual publish, no CI token** (a solo dev publishing a few times a quarter doesn't earn NPM_TOKEN management in a public repo).
- One-time pre-publish validation: `npx publint` + `npx @arethetypeswrong/cli --pack .` from `packages/core` (validates the exports map for Metro/bundler resolution).
- 0.x semver; `1.0.0` when mobile adoption completes. Mobile pins **exact** (`"0.1.0"`, no caret) and records the tag SHA in its PR.

## Phase 7 — Mobile adoption (follow-up plan, in `patternbank-mobile`, ships as V2.1)

Sequenced **after V2.0 ships** from `V2.0-release-check`. One exception rides V2.0 independently: relative-date rewrite of the 3 rotting suites (`storage`/`ProgressScreen`/`ProjectionCalculator` tests) — needed regardless so baseline failures don't mask regressions.

1. Re-diff mobile `src/utils/` vs core (utils may have moved after the extraction-map commit); publish matching `0.1.x` before swapping.
2. `npm i -E @patternbank/core@0.1.x`; jest: add `@patternbank/core` to `transformIgnorePatterns` whitelist; Metro: **no config change** (default node_modules transpilation + standard exports map; validated by publint in Phase 6).
3. Swap in per-family atomic commits (delete local util + its duplicated `__tests__` suite in the same commit): types/constants split → leaf utils → domain layer (+ AsyncStorage `StorageAdapter`) → supabase mapping/data (inject mobile client + PostHog hook) → sync merge + `performFullSync` (mutation queue keeps calling core cloud functions).
4. Stays mobile-side: `cloudMutationQueue/Processor`, `notifications`, `posthog`, `supabaseAuthStorage`, `supabaseClient`, `syncStatus`, `uiState`, import/export. Core has no import-time side effects (`sideEffects: false`).
5. Delete mobile's parity suite after the swap (same code now, asserted in core CI). QA the deltas core introduces: F-3 watermark key, F-6 newest-wins, F-14 validation, resolver `date`-aware event matching.
6. Release: normal EAS `production` profile (`autoIncrement`); pure-JS dep, no native modules → no `runtimeVersion` implications.

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
