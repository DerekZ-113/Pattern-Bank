# Test Coverage & Parity Report

**Date:** 2026-07-01 · companion to [findings.md](findings.md) and [extraction-map.md](extraction-map.md)

## Baselines (recorded before analysis)

| Repo | Result | Notes |
|---|---|---|
| web @ 09b6efe | **584 passed / 38 files, 0 failures** (3.7s) | Clean baseline from an idle-machine re-run. (An earlier run under heavy agent load showed 9 vitest fork-worker timeout errors with only 29 files executing — load artifact, not a code issue.) |
| mobile @ V2.0-release-check | **462 passed / 4 FAILED** (3 suites) | Pre-existing failures on the release branch — see below. |

### Mobile baseline failures, triaged

1. `src/__tests__/storage.test.ts` — `loadReviewEvents › returns stored events` and `logOrReplaceReviewEvent › replaces same-problem same-day…`: consistent with **fixture rot from the 6-month prune cutoff** — `loadReviewEvents` prunes events older than ~180 days (`storage.ts:89-108`), so fixtures with fixed old dates started failing as the calendar advanced. Same mechanism as finding F-3.
2. `src/screens/__tests__/ProgressScreen.test.ts` — confidence-trend chart renders "Not enough data yet" despite multi-week fixture reviews: likely the same date-sensitivity (fixture reviews aged out of the chart window).
3. `src/components/__tests__/ProjectionCalculator.test.ts` — "derives default pace from recent review and add history": same class — "recent" windows against aged fixtures.

**Action:** make these suites use dates relative to `today` (the parity fixtures already do this correctly via a fixed `fixture.today` that the test passes in explicitly). A release branch with red tests also masks real regressions — fix before V2 ships.

## Duplication census — the future core test suite

**17 suites exist in both repos** and consolidate into `packages/core/tests`:
`dateHelpers`, `duplicatePrevention`, `excludeFromReview`, `leetcodeActivityData`, `leetcodeImportTransforms`, `problemLists`, `problemTransforms`, `projectionEngine`, `spacedRepetition`, `storage` (pure parts), `supabaseData`, `supabaseFieldMapping`, `sync`, `todayLeetCodeCompletions`, `todayLeetCodeResolver`, plus two pairs with differing filenames: web `todayViewUtils.test.ts` ↔ mobile `src/utils/__tests__/todayView.test.ts`, and web `progressUtils.test.ts` ↔ mobile `src/__tests__/progressUtils.test.ts`.

**Web-only suites that partly cover core logic** (merge into core where they test pure behavior): `syncOnSignIn.test.ts` (696 lines — the crown jewel; most of it tests core `fullSync` semantics), `syncPush.test.ts`, `leetcodeReviewActions.test.ts`, `reviewLogSchema.test.ts`, `leetcodeActivitySchema.test.ts`, `syncLeetCodeActivityFunction.test.ts` (Edge Function contract).

**Stay platform-side:** web UI/hook suites (`todayView.test.tsx`, `useProblems`, `useUI`, `useCloudSync`, views); mobile `cloudMutationQueue`/`cloudMutationProcessor` (until the queue graduates to core), `notifications`, `syncStatus`, `syncTimeout` (moves with the util), `supabaseAuthStorage`, `uiState`, screens/components.

## Parity fixture audit

`crossPlatformParity.test.ts` + `crossPlatformReviewParity.json` (currently **untracked** on mobile — commit them) cover five families:
1. Confidence intervals · 2. Five-star graduation · 3. Today due-state (goal cap, `excludeFromReview`, ordering) · 4. Done Today feed · 5. LeetCode completion identity (multi-key resolution).

**Structural gap: the fixtures run only against mobile.** No web test consumes the same JSON, so cross-platform parity is *asserted, not proven*. Until core exists, add a mirror test on web reading the same fixture file.

**Content gaps — the riskiest divergences found in this review live *outside* the fixture surface:**
- `mergeImportedProblems` (finding F-4 — the largest real divergence) — no fixtures
- sync merge family (`mergeProblems`, `mergeReviewEvents` 5-second tolerance, tombstone/reset filters) — no fixtures
- preferences merge semantics (F-6) — no fixtures
- `projectionEngine` outputs — no fixtures
- `dateHelpers` timezone boundaries (day-boundary reviews) — no fixtures
- field mapping round-trip (`toSnakeCase` ∘ `toCamelCase` = identity) — covered per-repo but not as a shared fixture

## Contract conflicts across suites

None found as *conflicting pins* — where behavior diverges, web's suite simply has **gaps** (e.g. web `problemTransforms.test.ts` has no cross-device different-id import case, while mobile pins the canonical-id remap at `:195`/`:219`). Consequence: adopting mobile-canonical implementations in core will not break web tests; the new cases just need to come along.

## Write-before-extraction test list

1. Mirror parity fixtures on web (or land core with them on day one).
2. Fixture families for `mergeImportedProblems` cross-device scenarios (from F-4's failure scenario).
3. Sync-merge fixtures: newest-wins with NaN/missing timestamps (F-17), tombstone resurrection, reset-marker filtering, 5s event tolerance.
4. Preferences round-trip incl. signed-out-change scenario (F-6) — will fail until F-6 is fixed; write as the acceptance test for the fix.
5. Prune-vs-merge regression test (F-3) — sync twice, assert no re-added events / no `hasChanges` churn.
6. Date-relative rewrite of the three rotting mobile suites (baseline failures above).

## Coverage maps (fleet)

*Note: mobile's `projectionEngine` determinism gap applies equally to web (same mulberry32 PRNG); neither map covers `problemLists`/`progressVisuals` in depth — treat mobile's entries as shared where the module is duplicated.*

### web

**spacedRepetition (src/utils/spacedRepetition.ts — tests/spacedRepetition.test.ts, plus interval assertions in tests/problemTransforms.test.ts)** — critical untested paths:
- Cross-platform tie-order divergence: dailyHash + calcDaysOverdue date math is the exact algorithm mobile must replicate for identical daily queues; no golden-fixture test pins a full sorted output for a known (problems, date) input

**problemTransforms (src/utils/problemTransforms.ts — tests/problemTransforms.test.ts)** — critical untested paths:
- mergeImportedProblems (backup-file import merge) with absent updatedAt: `p.updatedAt > current.updatedAt` on undefined silently keeps the existing record — a restore of a legacy backup without updatedAt can never win; untested data-loss path
- buildNewProblems dailyGoal ≤ 0 producing NaN/Invalid nextReviewDate would corrupt stored problems; untested

**todayView (src/utils/todayView.ts — tests/todayViewUtils.test.ts; tests/todayView.test.tsx is component-level only)** — critical untested paths:
- Timezone boundary: submittedAt is UTC and gated by utcToLocalDateStr(...) === today; no test pins a near-midnight submission (e.g. 23:30 local / next-day UTC) — the classic web-vs-mobile divergence spot for what counts as 'today'

**sync merge/conflict (src/utils/sync.ts — tests/sync.test.ts, tests/duplicatePrevention.test.ts, tests/syncOnSignIn.test.ts, tests/syncPush.test.ts)** — critical untested paths:
- 5-second review-event dedup collapsing two events with the same problemId but different `date` fields (reviewEventsMatch ignores date) — can silently drop a streak day; untested
- Local-reset-wins with surviving local problems: the ordering guarantee that deleteAllUserProblems (repair) completes before the merged local problems are re-upserted is untested — a reordering regression would wipe just-pushed data
- Partial failure mid-sync: upsertProblemTombstones fails but merged tombstones are still returned to local state while cloud rows remain — resurrection semantics on the next device untested

**supabaseData field mapping + CRUD (src/utils/supabaseData.ts — tests/supabaseFieldMapping.test.ts, tests/supabaseData.test.ts)** — critical untested paths:
- review_date / dedupe_key timezone boundary: a UTC timestamp near local midnight yields different review_date (and therefore a different dedupe_key) depending on device timezone — the exact cross-platform duplicate/replacement divergence path; only a mid-day 12:00Z timestamp is tested
- batchInsertReviewLogs partial-chunk failure (used by syncOnSignIn event backfill) — an error after chunk 1 leaves cloud history partially written with no retry marker; untested

**dateHelpers (src/utils/dateHelpers.ts — tests/dateHelpers.test.ts)** — critical untested paths:
- utcToLocalDateStr near-midnight value is never pinned with a stubbed timezone (the valid-input test only asserts format, not the day) — this function gates every 'solved today' / review_date decision, so an implementation difference vs mobile would be invisible to this suite
- generateId collision profile under same-millisecond bulk creation (Date.now base + 6 random chars) — id-collision would corrupt merge-by-id; only 100-sample uniqueness tested

**leetcodeImportTransforms (src/utils/leetcodeImportTransforms.ts — tests/leetcodeImportTransforms.test.ts)** — critical untested paths:
- Local-day gating of submittedAt/createdAt via utcToLocalDateStr against `today` — no boundary-timestamp test; a submission at 23:30 local could be classified differently on web vs mobile (item appears on one platform, silently absent on the other)

**todayLeetCodeResolver (src/utils/todayLeetCodeResolver.ts — tests/todayLeetCodeResolver.test.ts)** — critical untested paths:
- Day rollover: resolver output when `today` advances mid-session while todayCompletions still hold yesterday's records (mergeTodayLeetCodeCompletion silently discards non-today records) — untested interaction
- Identity collision: a completion matching a submission for a *different* problem through a shared fallback key (e.g. same leetcodeNumber, different slug) would overlay the wrong problemId/status; untested

**todayLeetCodeCompletions (src/utils/todayLeetCodeCompletions.ts — tests/todayLeetCodeCompletions.test.ts)** — critical untested paths:
- mergeTodayLeetCodeCompletion silently deletes every stored record whose date !== today (todayLeetCodeCompletions.ts:140) — calling it with a stale/wrong `today` destroys completions; unpinned
- Key-collision overwrite: two distinct problems whose identities collapse to the same fallback key (e.g. both slug-less with equal leetcodeNumber) replace each other's completion records; untested dedup-correctness path

**storage (src/utils/storage.ts — tests/storage.test.ts)** — critical untested paths:
- logReviewEvent stamps date with todayStr() while accepting an arbitrary timestamp (storage.ts:148) — a timestamped event near midnight gets date ≠ local day of its timestamp, diverging from logOrReplaceReviewEvent (which derives date from the timestamp) and from the cloud review_date; this asymmetry is unpinned and is a streak/dedup divergence path
- Backup export→import round-trip after a data reset (tombstones and reset marker are not exported; re-import interacts with filterProblemsAfterDataReset via old updatedAt) — end-to-end restore data-loss path untested at this layer (only one narrow case is covered in syncOnSignIn tests)

**constants (src/utils/constants.ts — no dedicated test file)** — critical untested paths:
- Pattern-name parity between constants and the problemLists pattern maps is unasserted — a renamed pattern string silently breaks suggested-pattern matching and colors, and diverges from mobile (whose DEFAULT_PREFERENCES already intentionally differs per the extraction plan)

*Duplicated suites per mapper (corrected against the census — see Duplication census above):* spacedRepetition.test.ts, problemTransforms.test.ts, todayViewUtils.test.ts, projectionEngine.test.ts, progressUtils.test.ts, dateHelpers.test.ts, sync.test.ts, duplicatePrevention.test.ts, supabaseFieldMapping.test.ts, supabaseData.test.ts, leetcodeImportTransforms.test.ts, todayLeetCodeResolver.test.ts, todayLeetCodeCompletions.test.ts, leetcodeActivityData.test.ts, problemLists.test.ts

*Mapper notes:* Scope: web repo at /Users/derekz/Documents/Development/Pattern Bank/.claude/worktrees/vigorous-jones-3179af (43 test files, Vitest). Duplication census is based on the module-pair matrix in /Users/derekz/.claude/plans/should-we-skip-the-vast-sifakis.md (other repo = patternbank-mobile; the Sentinel repo in the working dirs is unrelated). Duplicated-suite qualifiers: (1) tests/syncPush.test.ts is deliberately EXCLUDED — web fire-and-forget push vs mobile mutation queue is an intentional platform difference, but its tombstone-before-delete and reset-marker-before-wipe ordering assertions are core invariants that should be re-expressed in the shared suite; (2) tests/storage.test.ts stays platform-side (localStorage I/O) but calculateStreak, logOrReplaceReviewEvent, and recordProblemTombstone assertions cover logic mobile duplicates and should be lifted into core tests; (3) tests/todayLeetCodeCompletions.test.ts mixes core key/merge logic (consolidatable) with localStorage persistence (platform-side); (4) tests/excludeFromReview.test.ts tests inline reimplementations of due-filtering rather than importing the module — redundant with todayViewUtils.test.ts and can be retired or folded into core; (5) tests/reviewLogSchema.test.ts and tests/leetcodeActivitySchema.test.ts assert SQL doc contents (contract tests, single-sourced in the web repo — not duplicates). Component/hook suites (todayView.test.tsx, useProblems, useCloudSync, usePreferences, useUI, useLeetCode*, appClearAll, allProblemsView, progressView, navBar, landingPage, devSeed, syncLeetCodeActivityFunction) stay platform-side. Highest-priority 'write tests before extraction' items across modules: (a) timezone-boundary pinning of utcToLocalDateStr-derived days everywhere (todayView feed, leetcodeImportTransforms gating, supabaseData review_date/dedupe_key) — the dominant cross-platform divergence risk; (b) mergeReviewEvents direct unit tests incl. the 5s near-dup tolerance across different date fields; (c) batchInsertReviewLogs chunking/partial failure; (d) syncOnSignIn tombstone-upsert-failure and reset-marker-failure push-suppression branches; (e) logReviewEvent date-vs-timestamp asymmetry in storage.ts; (f) golden-fixture outputs for prioritizeProblems and simulateProjectionSeries to detect web/mobile drift mechanically.

### mobile

**spacedRepetition (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/spacedRepetition.ts)** — critical untested paths:
- Cross-platform parity of the per-day hash tiebreak: if the web port's dailyHash differs, the two apps show different review queues for tied problems on the same day — no test would catch it

**problemTransforms (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/problemTransforms.ts)** — critical untested paths:
- Backup-import merge where the imported row has a different id AND the local row is tombstoned — interaction between mergeImportedProblems canonical-id remap and sync tombstones is untested (a restore could re-attach history to a deleted problem or lose it)

**todayView (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/todayView.ts)** — critical untested paths:
- Local-midnight bucketing: utcToLocalDateStr(submittedAt) !== today filtering is never tested with a timestamp near a timezone boundary, so a solve at 00:30 UTC could appear on different days on web vs mobile without any test failing

**projectionEngine (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/projectionEngine.ts)** — critical untested paths:
- Cross-platform determinism of mulberry32: no fixture pins an exact series for a given seed, so web and mobile projection charts could diverge silently (display-only, not data loss)

**sync (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/sync.ts)** — critical untested paths:
- Cloud-newer reset wipes ALL local data unconditionally (effectiveLocalProblems=[]), including local problems/events created AFTER the cloud resetAt — unsynced post-reset local work is discarded rather than cutoff-filtered like cloud rows; no test pins this asymmetric behavior (data-loss path and a likely web/mobile divergence point)
- resetWinner='local' branch never filters localProblems by the reset cutoff — pre-reset local rows that survived clearLocalDataStrict (e.g. partial clear) would be re-uploaded; untested
- reviewLogFromEvents rebuild after a reset (log derived solely from surviving events) not directly asserted

**supabaseData (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/supabaseData.ts)** — critical untested paths:
- review_date derivation from timestamp via utcToLocalDateStr in logReview/replaceReviewLog is never tested near a local-midnight boundary — web and mobile could write the same review under different review_date values, breaking the same-day replace/dedup contract
- Divergent dedupe keys across platforms would duplicate review history: nothing cross-checks that the web repo emits identical `review:` / `leetcode-rating:` key formats (only the parity fixture covers Today-view logic, not dedupe keys)

**dateHelpers (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/dateHelpers.ts)** — critical untested paths:
- utcToLocalDateStr boundary conversion feeds every 'was this today' decision (submissions, review_date, completions); an off-by-one-day platform divergence here is the single highest-leverage untested path

**leetcodeImportTransforms (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/leetcodeImportTransforms.ts)** — critical untested paths:
- isExpired uses utcToLocalDateStr(firstSeenAt) — expiration near local midnight untested; an import could auto-expire on one platform and not the other, producing different nextReviewDate (today vs today+interval) for the same import

**todayLeetCodeResolver (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/todayLeetCodeResolver.ts)** — critical untested paths:
- Synthetic midnight timestamp for lastReviewed-only problems feeds completion.completedAt which decides which completion 'wins' in findMatchingCompletion — wrong winner selection is untested and could resurrect or hide a Today row after sync

**todayLeetCodeCompletions (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/todayLeetCodeCompletions.ts)** — critical untested paths:
- Whitespace-only titleSlug: buildLeetCodeCompletionKey trims ('  ' -> falls to number) but buildLeetCodeCompletionKeys also trims — however mergeTodayLeetCodeCompletion stores `titleSlug || null` untrimmed; a slug like ' two-sum' produces mismatched keys between record.key and recomputed keys — dedup identity drift is untested

**storage (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/storage.ts)** — critical untested paths:
- pruneOldEvents silently deletes review events older than ~180 days on every load; if the cloud backfill has not happened (signed-out user), that is permanent history loss — the cutoff and the destructive re-save are completely untested
- clearLocalDataStrict does NOT clear preferences or the today-completions keys — the surviving-keys contract after a reset is unpinned

**constants (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/constants.ts)** — critical untested paths:
- Pattern name parity with the web repo: pattern strings are persisted inside problem rows and synced; a spelling divergence (e.g. 'DP' vs 'Dynamic Programming') between repos corrupts cross-platform filtering and stats — nothing tests the lists match
- Storage key literals unpinned — silent key change = apparent total data loss on upgrade

**cloudMutationQueue (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/cloudMutationQueue.ts)** — critical untested paths:
- clearAllData coalescing drops the user's pending deleteProblem tombstone mutations from the queue; the reset marker path is expected to cover those deletes — that cross-mechanism assumption (queue coalesce vs reset cutoff) is untested and is a potential resurrect-after-reset path

**cloudMutationProcessor (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/cloudMutationProcessor.ts)** — critical untested paths:
- deleteProblem processing order (upsertProblemTombstone BEFORE deleteProblem) is never asserted — reversing it would leave a deleted cloud row with no tombstone, so sign-in merge on another device resurrects it
- clearAllData processing order (upsertDataReset BEFORE deleteAllUserProblems/ReviewLog) unasserted — deleting before the marker lands means a crash mid-way resurrects nothing to filter against
- Partial failure inside a multi-step mutation (tombstone succeeds, delete fails -> retry re-runs both) idempotency untested

**reviewEvents (/Users/derekz/Documents/Development/patternbank-mobile/src/utils/reviewEvents.ts)** — critical untested paths:
- The 5s window also dedups LOCAL-vs-LOCAL and CLOUD-vs-CLOUD events: two genuine rapid same-problem reviews (or an intentional re-rate within 5s) collapse into one, permanently dropping a review event — this lossy same-source dedup is completely untested
- Fuzzy 5s matching must be identical on web or the two platforms will disagree about which events are 'local-only' and double-insert rows into review_log — no parity fixture covers it

*Duplicated suites per mapper (corrected against the census — see Duplication census above):* spacedRepetition.test.ts, problemTransforms.test.ts,  sync suites, duplicatePrevention.test.ts, excludeFromReview.test.ts, dateHelpers.test.ts, progressUtils.test.ts, projectionEngine.test.ts, supabaseFieldMapping.test.ts, supabaseData.test.ts, todayViewUtils.test.ts, todayLeetCodeResolver.test.ts, todayLeetCodeCompletions.test.ts, leetcodeImportTransforms.test.ts, leetcodeActivityData.test.ts, problemLists.test.ts, crossPlatformParity.test.ts + fixture — the mirrored parity suite itself; in a shared core package this becomes ONE suite instead of two copies of a hand-synced fixture

*Mapper notes:* Repo: /Users/derekz/Documents/Development/patternbank-mobile (Jest, 57 test files incl. untracked crossPlatformParity.test.ts and its fixture). Pure-logic tests are platform-agnostic and mirror the web repo (/Users/derekz/Documents/Development/Pattern Bank/tests) almost file-for-file — roughly 18 suites are consolidation candidates for a shared-core package. Mobile-only suites with no web twin: cloudMutationQueue.test.ts, cloudMutationProcessor.test.ts (offline queue), storage.test.ts (AsyncStorage backend — pure helpers calculateStreak/pruneOldEvents/countReviewedToday duplicate web's storage.test.ts and could split into shared core), notifications/uiState/syncStatus/syncTimeout and all component/screen/hook/navigation tests. Biggest systemic blind spot across modules: local-midnight timezone bucketing via utcToLocalDateStr (submissions, review_date/dedupe keys, import expiration) is never asserted at a boundary anywhere, and it is the mechanism most likely to cause silent cross-platform divergence. Second: sync's cloud-newer-reset branch discards post-reset local work unconditionally (untested data-loss path). Third: reviewEvents' 5-second fuzzy dedup has one test total and lossy same-source collapsing is unpinned. constants and reviewEvents effectively have no dedicated suites. supabaseData tests mock the supabase client chain by hand per test — in a shared core these should split into pure mapping tests (shared) and client-call tests (per-platform).
