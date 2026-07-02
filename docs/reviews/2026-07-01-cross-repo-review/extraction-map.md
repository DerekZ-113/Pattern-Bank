# Extraction Map — `@patternbank/core`

**Date:** 2026-07-01
**Reviewed:** web @ `09b6efe` (branch `dev/2026-07-01`) × mobile @ `V2.0-release-check` (incl. untracked parity tests)
**Target architecture (decided):** hybrid — `packages/core` npm workspace inside the public web repo; web imports it directly; the private mobile repo consumes it as a published public package.

## Verdict legend

- **identical** — byte- or semantically identical; extract as-is
- **platform-diff** — intentional divergence; core exposes the pure part, platforms keep adapters
- **drift** — accidental divergence; one side is canonical, the other has a live inconsistency

## Module-by-module

| # | Module | Verdict | Canonical | Extraction notes |
|---|--------|---------|-----------|------------------|
| 1 | `spacedRepetition.ts` | identical | either | Extract verbatim. |
| 2 | `progressVisuals.ts` | identical | either | Extract verbatim. |
| 3 | `leetcodeReviewActions.ts` | identical | either | Extract verbatim. |
| 4 | `leetcodeProblems.js` + `.d.ts` | identical | either | Extract verbatim; keep as JS + `.d.ts` (per both CLAUDE.md rules). |
| 5 | `dateHelpers.ts` | drift (trivial) | **web** | Web's wider `utcToLocalDateStr(string \| null \| undefined)` signature wins; removes mobile's `?? null` call-site noise. |
| 6 | `leetcodeImportTransforms.ts` | drift (trivial) | either | Only the dateHelpers knock-on + brace style. |
| 7 | `progressUtils.ts` | drift (trivial) | **mobile** | Web's `CONFIDENCE_BAR_COLORS` moves to web UI layer; rest identical. |
| 8 | `problemLists.ts` | drift (trivial) | **mobile** | Mobile moved `ProblemList`/`ListSummary` types to `types.ts` (cleaner); adopt web's `typeof !== "number"` guard in `getPatternsForProblemNumber`. |
| 9 | `constants.ts` | platform-diff | split | Core: `CORE_PATTERNS`, `EXTRA_PATTERNS`, `getVisiblePatterns`, `DIFFICULTIES`, storage keys, base `DEFAULT_PREFERENCES`. Platform: `PATTERN_COLORS` (CSS vars on web vs hex on mobile), notification defaults (mobile). |
| 10 | `types.ts` | platform-diff | split | Core: all shared domain types; `SyncStatus` takes **mobile's** superset (`+pending/offline`). `Preferences` becomes core base + platform extension (mobile adds notification fields). Platform: nav types, `ToastState` (`onClick` vs `onPress`), `ActiveTab` (web). |
| 11 | `todayView.ts` | drift (modest) | union | Core = union: mobile's `buildTodayLeetCodeItemKey` / `buildRemovedTodayLeetCodeItems` + web's `buildDoneTodayFeedItems` / `DoneTodayFeedItem`. |
| 12 | `projectionEngine.ts` | drift | **mobile** | Mobile clamps `dailyGoal ≥ 0` (finding F-15); mass renames (`ProjectionDistribution` etc.) — pick mobile's names, alias web's. |
| 13 | `todayLeetCodeResolver.ts` | drift | **mobile** | Mobile's `getReviewedTodayTimestamp` (timestamps, `completedAt`) supersedes web's boolean version — never backported. Web's `logTodayLeetCodeDebugSnapshot` stays web-side (localStorage debug tool). |
| 14 | `todayLeetCodeCompletions.ts` | platform-diff + drift | **mobile** (pure parts) | Pure merge/identity logic → core (mobile's, incl. no-op early return; reconcile non-today-record semantics, finding F-16). `load/save` go behind the storage adapter. |
| 15 | `leetcodeActivityData.ts` | drift | **mobile** | Mobile wraps every call in `withCloudOperationTimeout` (+ `syncTimeout.ts` → core). Web currently has **no timeouts** (finding F-9). |
| 16 | `problemTransforms.ts` | **drift (major)** | **mobile** | Mobile's `mergeImportedProblems` (id → leetcodeNumber canonical-id remap, NaN-guarded `timestampMs`, `changedProblems` + `importedIdToCanonicalId` outputs) fixes web's duplicate-on-cross-device-import bug (finding F-4). Mobile-only `deduplicateProblems` also comes along (web keeps a copy in `sync.ts` — unify to one). |
| 17 | `sync.ts` (merge core) | strong parity | **mobile** (guards) | `mergeProblems` / `mergeReviewLog` / `mergeProblemTombstones` / `mergeReviewEvents` + reset/tombstone filters → core with mobile's `timestampMs` NaN guards; keep web's stats-struct return shapes (richer). Mobile's `reviewEvents.ts` split is the cleaner file layout. |
| 18 | `sync.ts` (orchestration) | platform-diff → converge | **mobile** (design) | `syncOnSignIn` bodies are ~identical in skeleton; mobile's fails-closed error handling and orphan-event filtering are design decisions core must settle (findings F-5, F-7). Recommend: core exposes one `performFullSync` with mobile's fail-closed semantics; orphan-event policy decided once (see F-7). |
| 19 | `sync.ts` (push layer) vs mutation queue | platform-diff (for now) | n/a | Web fire-and-forget vs mobile durable queue stay platform-side in v1 of core. Queue is core-worthy later (it's platform-agnostic except AsyncStorage — adapter handles that). |
| 20 | `supabaseData.ts` | drift | **mobile** | Field mappings → core (settle `?? null` vs `\|\| null`, `updatedAt` fallback — findings F-13, F-14). CRUD functions → core with injected Supabase client. **Adopt mobile's `dedupe_key` discipline on web** (finding F-8). Mobile's `CloudPreferences` split (cloud-synced subset vs local-only fields) is the right core shape. |
| 21 | `storage.ts` | platform-diff | **mobile** (shape) | Core defines an **async-first `StorageAdapter` interface** (mobile's Promise signatures; web wraps sync localStorage). Pure logic (`calculateStreak(log)` — mobile's parameterized version, `countReviewedToday`, `pruneOldEvents` policy) → core. `importData`/`exportData` stay platform-side (File vs document picker). |

## Adapter interfaces core must expose

1. **`StorageAdapter`** — async `get/set/remove` (web: localStorage behind Promises; mobile: AsyncStorage).
2. **Supabase client injection** — core CRUD takes the client (each app constructs its own with its env/auth-storage).
3. **`Preferences` extension point** — core base type + generic platform extension; cloud-sync layer serializes only the core subset (mobile's `CloudPreferences` pattern).
4. **Platform hooks (optional callbacks)** — analytics (PostHog event emission), debug logging (web's Today-LC snapshot), notifications (mobile-only, stays out of core).

## Sequencing constraints (blocking items before/during extraction)

1. **Redeploy the Edge Function** (F-1) and **fix the `daily_review_goal` CHECK** (F-2) — contract fixes, independent of extraction, do first.
2. **Fix web `mergeImportedProblems`** by adopting mobile's version (F-4) — happens naturally during extraction; if extraction is delayed, backport.
3. **Decide the orphan-review-event policy** (F-7) and the **preferences newest-wins policy** (F-6) — semantic decisions that must be made once, in core, not twice.
4. **Resolve the prune/merge loop** (F-3) — either fetch cloud events with `since` = prune cutoff, or stop persisting pruned lists; must be settled before core owns `pruneOldEvents`.
5. **Mirror the parity fixtures on web** (or land core with the fixture suite as its test base) — currently parity is asserted only on mobile.

## Proposed `packages/core` layout

```
packages/core/
├── src/
│   ├── types.ts                  # shared domain types
│   ├── constants.ts              # patterns, difficulties, storage keys, base defaults
│   ├── dateHelpers.ts
│   ├── spacedRepetition.ts
│   ├── problemTransforms.ts      # mobile-canonical (canonical-id merge, dedupe)
│   ├── todayView.ts              # union
│   ├── projectionEngine.ts
│   ├── progressUtils.ts / progressVisuals.ts
│   ├── sync/
│   │   ├── merge.ts              # mergeProblems/ReviewLog/Tombstones + reset filters
│   │   ├── reviewEvents.ts       # event key/match/merge
│   │   └── fullSync.ts           # syncOnSignIn orchestration (fail-closed)
│   ├── supabase/
│   │   ├── mapping.ts            # toSnakeCase/toCamelCase + row types
│   │   └── data.ts               # CRUD with injected client (+ timeouts)
│   ├── leetcode/
│   │   ├── problems.js + .d.ts   # static DB
│   │   ├── problemLists.ts
│   │   ├── importTransforms.ts / activityData.ts / reviewActions.ts
│   │   ├── todayResolver.ts / todayCompletions.ts
│   ├── storage/
│   │   ├── adapter.ts            # StorageAdapter interface
│   │   └── logic.ts              # calculateStreak, pruning policy, pure helpers
│   └── syncTimeout.ts
└── tests/                        # consolidated 17 duplicated suites + parity fixtures
```
