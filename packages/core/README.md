# @patternbank/core

[![npm](https://img.shields.io/npm/v/@patternbank/core)](https://www.npmjs.com/package/@patternbank/core)

Shared domain logic for [PatternBank](https://pattern-bank.vercel.app) — spaced repetition, sync merge, and LeetCode import for the [web app](https://github.com/DerekZ-113/Pattern-Bank) and the iOS app. One implementation, tested once, shipped to both.

## Install

```bash
npm install @patternbank/core
```

`@supabase/supabase-js ^2` is an **optional** peer dependency — only needed if you use the cloud-data factories. The domain logic (scheduling, merging, transforms) has zero runtime dependencies.

**How PatternBank consumes it:** the web app imports the package **as workspace source** (this repo's `packages/core`, via tsconfig paths — changes ship with the app, no publish step). The React Native app **exact-pins the npm release**. `dist/` (dual ESM + CJS, bundler-friendly types) exists for the npm consumers.

## Quick start

Bind the cloud layer once, injecting your platform's Supabase client:

```ts
import { createCloudData } from "@patternbank/core";
import { supabase } from "./supabaseClient"; // your platform client, or null

// null client → every function no-ops with { data: null, error: null },
// so signed-out / unconfigured builds need no branching.
export const cloudData = createCloudData({ supabase, timeoutMs: 10_000 });
```

Run a full sign-in sync — fail-closed, platform persists the result:

```ts
import { performFullSync } from "@patternbank/core";

const result = await performFullSync({
  userId,
  cloud: cloudData,          // the functions createCloudData returned
  storage,                   // StorageAdapter — used ONLY for the prune watermark
  local: { problems, reviewLog, reviewEvents, preferences, problemTombstones, dataReset },
  eventRetentionDays: null,  // null = never prune (web); mobile passes 180
});

if (result.status === "success") {
  // Merged state is RETURNED, never written by core — persist it yourself.
  // A failed sync therefore leaves local state completely untouched.
  persist(result);
}
```

## API surface

Everything exports from the barrel (`import { … } from "@patternbank/core"`).

| Area | Modules | Highlights |
|---|---|---|
| Spaced repetition | `spacedRepetition` | Confidence 1–5 → 1/2/5/10/30-day intervals; repeated 5★ reviews graduate 60→120→240→365d; daily-cap priority sort (lowest confidence → overdue before due today → daily rotation, so cards inside a level take turns) |
| Domain transforms | `problemTransforms`, `todayView`, `projectionEngine`, `progressUtils`, `progressVisuals`, `preferences` | Import merge with canonical-id remapping (no duplicates on cross-device restore), Today feed builders, 30-day projection engine |
| Sync | `sync/fullSync`, `sync/merge`, `sync/reviewEvents` | `performFullSync` (fail-closed orchestration), `mergeProblems` / `mergeReviewLog` / `mergeReviewEvents` / `mergeProblemTombstones` (LWW), reset-marker + tombstone filters |
| Supabase | `supabase/mapping`, `supabase/data` | camelCase ↔ snake_case mapping, `createCloudData` (21 CRUD functions, injected client, per-op timeouts), `createLeetCodeActivityData` (11 functions) |
| LeetCode | `leetcode/*` | 3,846-problem static database with search, curated list definitions, import transforms, Today resolver, review actions |
| Storage | `storage/adapter`, `storage/logic` | `StorageAdapter` interface, `calculateStreak`, event-prune policy |

### Review-event identity (worth knowing)

Two review events are considered the same review only when they share the exact `problemId|timestamp` key, **or** they hit the same problem on the same calendar date with the **same confidence** within 5 seconds (legacy cross-platform timestamp drift). Near-midnight events on different dates are distinct streak days; a same-day re-rate with a different star count is a distinct review — merges keep the newest rating instead of silently dropping it.

## Adapter seams

Core is platform-free. Each app injects four things:

1. **`StorageAdapter`** — async `getItem`/`setItem`/`removeItem` (+ optional `multiRemove`). Web wraps `localStorage` in Promises; React Native passes `AsyncStorage` directly.
2. **Supabase client** — passed into `createCloudData`; nullable by design.
3. **Preferences extension** — `performFullSync<P extends CorePreferences>` is generic; platforms extend the base preferences (e.g. mobile's notification settings stay local-only) while the cloud layer serializes only the shared subset.
4. **Hooks** — optional `warn`/analytics callbacks; core never logs or throws to the UI on cloud failures.

## Design guarantees

- **Fail-closed sync** — any cloud error returns `{ status: "error" }` with the local snapshot untouched; nothing partial persists.
- **Newest-`updatedAt` wins** for problems, tombstones (LWW — a tombstone only deletes rows not updated after it), and preferences.
- **Prune watermark** — events pruned locally on purpose are never resurrected from the cloud.
- **Date-aware, confidence-aware event matching** — see above.
- Dual **ESM + CJS** builds with split type entries; `sideEffects: false`; Node ≥ 18.

## Cross-platform parity fixtures

Three JSON fixtures under `tests/fixtures/` are the executable cross-platform contract, byte-identical with the copies in the iOS repo (`src/__tests__/fixtures/`) and consumed by **three runners**: this package's vitest suites, the React Native jest suites, and PatternBankKit's Swift Testing suites (digest-guarded). The first two fixtures are date-shifted when loaded (pinned-today in jest); the third is loaded as written:

- `crossPlatformReviewParity.json` (v1, bytes FROZEN) — intervals, five-star graduation, Today due-state, Done-Today feed, LeetCode completion identity.
- `crossPlatformSyncParity.json` (v2) — mergeProblems newest-wins (incl. malformed-timestamp losers), review-event merge (5s drift window, date+confidence gates, prune watermark), tombstone LWW, data-reset filters, respread idempotency, mapping round-trips. This closed the sync-parity gap: the full sync engine is now proven behavior-identical across TS and Swift.

- `crossPlatformQueueRotation.json` (v1) — the Today queue's turn-taking: `ringPosition`, `dayNumber`, `rotationPointer` and `rotationKey` reference values, and `prioritizeProblems` orders on fixed dates (a backlog on three consecutive days, overdue against due today, a dismissed card the next day, ids outside ASCII). **Not date-shifted**: the expected order depends on the absolute date, so each case carries its own `today`.

**Fixture changes must land in all three places** (this repo, the iOS repo's fixtures dir, and a Swift digest update) in lockstep — the Swift suite byte-guards all three files. Never hardcode new dates in the two date-shifted fixtures; their date-shift layers keep the suites green forever.

## Versioning

Semver from `0.1.0`. Releases are tagged `core-v*` in the [Pattern-Bank repo](https://github.com/DerekZ-113/Pattern-Bank); the package directory is `packages/core`. Notable: `0.1.1` fixed same-day re-rates being collapsed by the 5-second drift window.

`0.5.0` is the first release on npm since `0.3.1`: `0.4.0` was tagged in the repository but never published, so its one change arrives here too. Moving from `0.3.1` to `0.5.0` brings:

- **`Database` in `EXTRA_PATTERNS`** (the `0.4.0` change): opt-in, filed under strategies.
- **A new Today queue order.** Cards inside a confidence level take turns from day to day instead of the same ones always leading (`prioritizeProblems`; its signature is unchanged). Lowest confidence still comes first, and overdue cards still come before cards due today. `ringPosition`, `dayNumber`, `rotationPointer` and `rotationKey` are exported so other platforms can be checked against them; `dayNumber` reads only `YYYY-MM-DD` and returns 0 for anything else.
- **`DESIGN_TOKENS` and `patternTokenSlug`**: the colour palette for both themes.
- **`queryProblems`** and its types: the Problems list's search, filters and sort as one function.
- **`getUpcomingScheduleInfo`**: the numbers behind the offer to respread scheduled problems.
- **`respreadScheduledProblems`** paces a daily goal below 1 as 1. It used to produce invalid dates for a goal of 0.

## License

[GPL-3.0](https://github.com/DerekZ-113/Pattern-Bank/blob/main/LICENSE), same as the PatternBank repo.
