# Cross-Repo Review Findings — Pattern Bank (web) × patternbank-mobile

**Date:** 2026-07-01
**Reviewed:** web @ `09b6efe` (branch `dev/2026-07-01`) × mobile @ `V2.0-release-check` including untracked files (`crossPlatformParity.test.ts`, fixtures, `DashboardScreen.test.ts`, README)
**Method:** manual divergence audit + data-integrity deep read + live-Supabase contract check, with every data-integrity finding adversarially verified by 2 independent refuter agents; breadth pass by a 6-agent fleet with verification.
**Test baselines:** web **584 pass / 38 files, 0 failures** (clean re-run on idle machine; an earlier run under agent load showed spurious vitest worker timeouts); mobile 462 pass / **4 pre-existing failures** in 3 suites (see test-coverage-report.md).

Severity: **Critical** = data loss / sync corruption · **High** = user-visible malfunction or cross-platform inconsistency · **Medium** = incorrect edge-case behavior · **Low** = latent/uncertain.
Verification: **CONFIRMED** = 2 adversarial refuters traced and upheld · **PLAUSIBLE** = split refuter vote · **observed fact / divergence audit / code read** = directly established during the manual passes (schema queries, side-by-side diffs, code tracing) · **unverified** = single-agent breadth report, not adversarially checked — treat as a lead and spot-check before acting (applies to medium/low breadth findings F-23 onward).

---

## High

**F-1 · Deployed Edge Function is stale — repo fixes never shipped.** *(ops/contract — observed fact)*
Production `sync-leetcode-activity` is version 1 (deployed ~2026-05-15, `created_at == updated_at`, never redeployed). The web repo contains fixes committed **2026-05-17** — `7542b63` "fix: widen leetcode activity window" and `847d7c1` "fix: surface leetcode edge read errors" (repo `index.ts` 606 lines vs deployed ~430). Both clients — including the mobile V2 release candidate — are coded against the newer contract.
**Fix:** redeploy the Edge Function from the repo before the V2 mobile release. **Blocks extraction:** no, but blocks V2 ship.

**F-2 · `daily_review_goal` DB CHECK (1..10) contradicts both UIs (1..20).** *(contract — observed fact)*
[`DailyGoalSection.tsx:35`](../../src/components/DailyGoalSection.tsx) (web) and mobile `SettingsScreen.tsx:302` both allow up to 20; `user_preferences.daily_review_goal` has `CHECK (daily_review_goal >= 1 AND daily_review_goal <= 10)`. A goal of 11–20 saves locally but every cloud upsert of preferences fails silently (fire-and-forget/queue-retry-forever) — preferences stop syncing entirely and platforms diverge.
**Failure scenario:** set goal 15 on web → cloud upsert 400s silently → change any other preference → still can't sync → mobile never sees any of it.
**Fix:** widen the CHECK to 20 via migration (matches product intent on both UIs). **Blocks extraction:** no, but fix with F-10.

**F-3 · Mobile prune/merge tug-of-war on review events.** *(mobile — CONFIRMED)*
`storage.ts:89-108` — `loadReviewEvents()` prunes events older than ~180 days **and persists the pruned list**; `useCloudSync.syncNow` passes the pruned list to `syncOnSignIn`, which calls `fetchReviewEvents(userId)` with **no `since`** (mobile `sync.ts:165`), fetching full cloud history; `mergeReviewEvents` re-adds every pruned event (`eventsAddedFromCloud > 0` → `hasChanges` → **"Data synced" toast on every sync** for any user with >6 months of history); the merged list is saved back; the next load prunes again. Endless churn, misleading toasts, wasted writes — and a cross-platform history divergence (web shows all-time history, mobile ~6 months).
**Fix (decide once, in core):** either fetch with `since` = prune cutoff and treat pruning as a view concern, or drop persisting-on-load. See extraction-map sequencing #4.

**F-4 · Web `mergeImportedProblems` duplicates problems / detaches history on cross-device import.** *(web — divergence audit)*
Web `problemTransforms.ts:79-103` merges **by id only** with a raw string `updatedAt` comparison. Mobile's version (`problemTransforms.ts:150-176`) matches by id **then by LeetCode number**, remaps to the canonical local id (keeping review history attached), and NaN-guards timestamps; mobile pins this behavior in tests ("does not duplicate an older imported LeetCode problem with a different local id"). Importing the same backup on web vs mobile produces **different libraries**.
**Failure scenario:** problem #217 added independently on two devices (different ids) → export from device A, import on web → web keeps both copies; mobile folds them into one with history intact.
**Fix:** adopt mobile's implementation (happens naturally in extraction — it's the canonical version). Web tests have no conflicting pins, only gaps.

**F-5 · Web sign-in sync fails-open: reports "synced" when cloud writes failed.** *(web — CONFIRMED)*
Web `sync.ts` (syncOnSignIn): tombstone-upsert failure only flips a cleanup flag (`:292-297`); `deleteMultipleFromSupabase` (`:309`) and `upsertProblems` (`:358`) results are discarded; `pushReviewEventsToCloud` isn't awaited (`:320`). The function returns `error: null`, so `useCloudSync.ts:63-69` sets **"synced"** (green dot in `Header.tsx:19`) and never retries in-session (`hasSyncedRef`). Mobile fails-closed at every corresponding step. Note this is *not* covered by the "fire-and-forget" rule — web's own syncOnSignIn already fails-closed for fetch errors, so the write-side is an inconsistency.
**Fix:** adopt mobile's fail-closed semantics in core's `fullSync` (extraction-map #18).

**F-6 · Both platforms silently lose preference changes made while signed out.** *(both — CONFIRMED)*
Preferences carry no timestamp, and on sign-in sync cloud unconditionally wins: web `sync.ts:327-328`, mobile `sync.ts:336-337`. Both `usePreferences` hooks push to cloud only `if (user)`, and the `preferenceRevision` guard only protects changes made *during* sync — verifiers traced every call site; no path re-pushes a signed-out change when cloud prefs exist.
**Failure scenario:** signed out, set goal 3 → sign in → cloud's old goal 5 silently replaces it.
**Fix:** add `updated_at` comparison for preferences (column already exists in the table) — a core-level decision (extraction-map sequencing #3).

## Medium

**F-7 · Orphan review-event semantics diverge across platforms.** *(both — CONFIRMED)*
Mobile filters review events to problems that survived the merge (`sync.ts:312-317`); web never does. Events for deleted problems: gone from mobile's local state, kept forever on web, persist in cloud `review_log` (neither deletes them there; `problem_id` FK is ON DELETE SET NULL). Same account → different review history/Progress across platforms.
**Fix:** pick one policy in core. (Keeping orphans preserves streak/history integrity; if keeping, mobile's filter goes; if dropping, web needs the filter *and* a cloud cleanup story.)

**F-8 · Review-log idempotency asymmetry: web writes NULL `dedupe_key` rows.** *(web — PLAUSIBLE, split vote)*
Web `logReview` (`supabaseData.ts:298`) and `batchInsertReviewLogs` (`:443`) plain-INSERT with no `dedupe_key`; mobile upserts `onConflict: "dedupe_key"` everywhere. The column is nullable+unique (multiple NULLs allowed), so web rows are invisible to mobile's replace-by-key logic. One refuter noted web's *leetcode-rating replace path* does use the key and the real-world duplicate window is narrow — hence Medium, not High.
**Fix:** adopt mobile's dedupe-key discipline in core's data layer.

**F-9 · Web has no timeouts on any cloud call.** *(web — divergence audit)*
Mobile wraps every Supabase/Edge call in `withCloudOperationTimeout`/`withTimeout` (`syncTimeout.ts`); web has none — a hung request leaves sign-in sync in "syncing" indefinitely.
**Fix:** `syncTimeout.ts` moves to core; web gets it for free.

**F-10 · No Supabase migration history.** *(ops — observed fact)*
`list_migrations` returns empty — the entire schema was applied ad-hoc; `docs/supabase/*.sql` in the web repo is the only record. Fine for a solo project until the extraction locks in a shared contract consumed by two apps at different release cadences.
**Fix:** baseline the current schema as migration 0001; apply F-2's constraint fix as the first real migration.

**F-11 · Edge Function stamps `last_synced_at` on failure.** *(backend — code read)*
The catch block updates the connection with `last_synced_at: now` — a failed sync advances the 1-hour throttle window, so the next automatic sync is suppressed for an hour after an error (manual/`force` bypasses).
**Fix:** on error, update status/error fields without `last_synced_at`.

**F-12 · Mobile queue can apply mutations out of order during backoff.** *(mobile — CONFIRMED)*
`flushCloudMutationQueue` (`cloudMutationProcessor.ts:115-135`) skips not-yet-due (backed-off) mutations while processing later-enqueued due ones; `coalesceQueue` removes prior `upsertProblem` entries when a `reviewProblem` arrives but **not prior `reviewProblem` entries**, so two same-problem review mutations can coexist. A stale retry then overwrites newer cloud state (supabase upsert has no `updatedAt` guard). Self-heals at the next full sync merge — hence Medium.
**Fix:** coalesce same-problem `reviewProblem` mutations, or add an `updatedAt` guard to the upsert.

## Low

**F-13 · `?? null` (web) vs `|| null` (mobile) in `toSnakeCase`/`toCamelCase`** for `leetcodeNumber`/`url`/`notes` — differs for falsy-but-valid values (`0`, `""`). LeetCode numbers start at 1, so latent. Settle in core (use `??`).

**F-14 · `toCamelCase` `updated_at` fallback divergence** — web substitutes `new Date().toISOString()`, mobile forces `null!` (a strict-mode lie feeding possible null into newest-wins merges). Column is NOT NULL with default in the live schema, so corrupt-response-only. Core should keep the type honest (`string`, validated).

**F-15 · Web `projectionEngine` doesn't clamp `dailyGoal`** — `due.slice(0, dailyGoal)` with a negative goal silently drops items; mobile clamps `Math.max(0, dailyGoal)`. UI prevents negatives today; mobile's version is canonical.

**F-16 · `mergeTodayLeetCodeCompletion` non-today-record semantics differ** — web *drops* records from other dates during merge, mobile *keeps* them. Inputs are per-day-keyed in practice, so latent; reconcile in core (mobile's is safer).

**F-17 · Merge timestamp NaN-guard asymmetry** — web's `mergeProblems`/`mergeProblemTombstones` use raw `new Date().getTime()`; a corrupt local `updatedAt` beats a valid cloud update on web but correctly loses on mobile (`timestampMs`). Core takes mobile's guards.

**F-18 · Supabase advisor findings** *(live project, us-west-2)* —
- Perf: every RLS policy re-evaluates `auth.uid()` per row (`auth_rls_initplan`, all 9 tables) — wrap as `(select auth.uid())`; unindexed FKs `review_log.problem_id`, `feedback.user_id`; duplicate permissive SELECT policies on `review_log` ("read own" + "view own").
- Security: `handle_updated_at` function has mutable `search_path`; leaked-password protection disabled (relevant to mobile's email/password auth); `feedback` INSERT policy `WITH CHECK (true)` — intentional anonymous feedback, accepted risk, document it.

**F-19 · `verify_jwt=false` on the Edge Function** — mitigated by manual token verification (`requireUser`) before any action; CORS `*`. Acceptable; document the reasoning next to the function source.

---

## Refuted during verification (recorded so they aren't re-reported)

- **Mobile `hasChanges` gating persistence** — refuted: sync results are applied unconditionally; `hasChanges` only gates the toast (`useCloudSync.ts:313`).
- **Mid-sync clobber race (both platforms)** — refuted: both re-merge the sync result against *current* state with functional updates + preference-revision guards (web `useProblems.handleSyncComplete:116`; mobile `useCloudSync.syncNow:259-304`).
- **P2-7 `recordProblemTombstone` RMW race (mobile)** — refuted: premise accurate (unserialized read-modify-write) but unreachable — single serialized production call site.

## Breadth-pass findings (agent fleet — 6 areas; 39 raw reports → 34 after dedupe/merge)

Critical/high breadth findings were adversarially verified (verdict shown); medium/low are **unverified single-agent reports** — treat as leads, spot-check before acting.


### High

**F-20 · handleSyncComplete never filters the sync result by a local data reset that is newer than the sync snapshot, so 'Clear all data' executed while the sign-in sync is in flight resurrects all cleared problems, review log, and review events.** *(web — CONFIRMED)*
`src/hooks/useProblems.ts:129` — area: web-hooks
**Failure scenario:** User signs in on a slow connection (syncOnSignIn in flight), opens Settings -> Clear all data -> confirm. handleClearAllData wipes local state and awaits clearAllCloudData; during that await the sync promise resolves and handleSyncComplete runs (syncRunRef still matches because signOut hasn't happened yet). incomingResetIsNewer is false (the local reset is newer), currentProblems is [], tombstones were cleared and old ones are filtered out by the new reset, so mergeProblems([], result.problems) re-adds every pre-clear problem and saveReviewLog/saveReviewEvents restore the old history to localStorage. The user is then signed out with all 'cleared' data back on screen; on next sign-in, syncOnSignIn's resetWinner==='none' branch filters only CLOUD problems by the reset (effectiveLocalProblems is unfiltered), so the resurrected local problems are re-uploaded to the cloud as local-only rows — the clear is permanently undone.
*Severity note:* Not Critical only because data reappears rather than disappears — but it permanently undoes an intended destructive action and re-uploads the cleared rows.

**F-21 · pendingRatingRowId is set before awaiting onRateLeetCodeReview but never reset (no finally/success reset), and the guard `if (pendingRatingRowId) return` applies to all rows, so after the first rating every later star click in the Done-today feed is silently ignored for the rest of the session.** *(web — CONFIRMED)*
`src/components/TodayDoneFeed.tsx:41` — area: web-components
**Failure scenario:** User has two LeetCode solves in 'Done today' that are review-due (canRate=true). They click 'Rate →' on the first and pick 4 stars — works, pendingRatingRowId stays set to that row's id. They then click 'Rate →' on the second solve; the stars render enabled (rowPending is per-row), but clicking any star hits the `if (pendingRatingRowId) return` guard and does nothing. No rating is recorded and no feedback is shown until the user switches tabs to remount TodayView. Same lock also occurs if the first rating's promise rejects.

**F-22 · Form state only resets when initialData.id changes, but the modal is never unmounted (App renders it unconditionally; it returns null when closed) and useUI.closeModal never clears editingProblem — so reopening the same problem shows stale form values from the previous session, and saving writes them back over newer data (confidence, nextReviewDate, notes, fiveStarStreak reset).** *(web — CONFIRMED)*
`src/components/ProblemModal.tsx:72` — area: web-components
**Failure scenario:** User opens Edit for problem X (confidence 2), closes the modal, then reviews X on the Today tab rating it 4 stars (confidence→4, next review in 10 days). They reopen Edit for X — handleEdit passes the fresh problem but id is unchanged, so the reset branch at line 72 doesn't run and the form still shows confidence 2. Clicking 'Save Changes' (e.g. after tweaking notes) computes confidenceChanged=true (form 2 vs current 4) and writes confidence back to 2, sets lastReviewed=today, recomputes nextReviewDate from confidence 2, and zeroes fiveStarStreak — silently reverting the review. Simpler variant: edit fields, Cancel/Escape, reopen the same problem → the discarded draft is displayed as if saved.

**F-23 · handleImport replaces the local review log and review events wholesale with the backup file's contents instead of merging, destroying all review history recorded after the backup was exported.** *(web — unverified)*
`src/hooks/useProblems.ts:303` — area: web-hooks
**Failure scenario:** User exports a backup on June 1, keeps reviewing daily through July 1 (30 more review-log days and events), then imports the June 1 backup to recover something. Problems are merged (mergeImportedProblems keeps newer local copies), but saveReviewLog(data.reviewLog) and saveReviewEvents(data.reviewEvents) overwrite localStorage with the month-old log/events — the streak and review history since June 1 vanish from Progress. If the user is signed out this loss is permanent; if signed in it only heals at the next sign-in sync when cloud events merge back.
*Severity note:* Elevated from the fleet's medium: permanent loss of post-backup review history when signed out meets the doc's data-loss bar; signed-in users self-heal at next sign-in sync.


### Medium

**F-24 · markRated bumps loadRunRef to cancel an in-flight load() but never resets `loading`, so the aborted load leaves loading stuck at true until a future load completes or the page reloads.** *(web — unverified)*
`src/hooks/useLeetCodeActivity.ts:184` — area: web-hooks
**Failure scenario:** User confirms a pending LeetCode import (confirmImport awaits markLeetCodeImportImported then calls refreshLeetCodeActivity, which runs load() and sets loading=true). While that refresh is in flight the user rates another submission in the Today feed -> handleRateLeetCodeReview -> markRated sets loadRunRef.current = runId+1. The in-flight load hits `if (loadRunRef.current !== runId) return;` after its next await and returns without setLoading(false). loading stays true indefinitely: LeetCodeActivitySection computes disabled = loading || actionLoading, permanently disabling Connect/Sync now/Disconnect, and the auto-import effect in useLeetCodePendingImports (`if (!user || loading) return`) stops processing expired imports until the page is reloaded.

**F-25 · handleImport ignores problem tombstones, so restoring a deleted problem from a backup appears to work but the problem is silently re-deleted (locally and in the cloud) at the next sign-in sync.** *(web — unverified)*
`src/hooks/useProblems.ts:300` — area: web-hooks
**Failure scenario:** User deletes problem P (recordProblemTombstone writes a tombstone locally and to the cloud), then imports an older backup that contains P specifically to get it back. mergeImportedProblems re-adds P locally and pushProblemsToCloud upserts it to the cloud, but the tombstone is never cleared. On the next page load while signed in, syncOnSignIn merges tombstones, filterTombstonedProblems drops P from the merged set, and P's cloud row is added to idsToDelete and deleted — the restored problem silently disappears again with no way to keep it except deleting the tombstone by hand.

**F-26 · handleImport pushes the raw imported problems (data.problems) to the cloud instead of the merged result, blind-upserting older backup versions over newer cloud rows while local state keeps the newer copies.** *(web — unverified)*
`src/hooks/useProblems.ts:309` — area: web-hooks
**Failure scenario:** Signed-in user has problem X last reviewed June 30 (local and cloud in sync), then imports a June 1 backup containing an older X. mergeImportedProblems keeps the newer local X (updatedAt June 30), but pushProblemsToCloud(user.id, data.problems) upserts the June 1 version over the cloud row (upsertProblems has no updatedAt guard). Local and cloud now diverge: the user's mobile device syncs and pulls X with June 1 confidence/nextReviewDate, marking it due again with stale confidence, until the web device happens to re-sign-in and re-push the newer local copy.

**F-27 · syncOnSignIn's final upsertProblems compares only against the cloud snapshot fetched at sync start, so a review/edit pushed while the sync is in flight gets overwritten in the cloud with pre-sync data.** *(web — unverified)*
`src/utils/sync.ts:357` — area: web-hooks
**Failure scenario:** User worked signed-out (local problem X newer than cloud), then signs in via OAuth redirect; syncOnSignIn starts and fetches cloud state. Before the sync finishes, the user rates X on the Today view: handleReview pushes X with new confidence/nextReviewDate to the cloud immediately. The sync then reaches its push phase, sees snapshot-local X newer than snapshot-cloud X, and blind-upserts the pre-review X over the just-written row. Local state stays correct (handleSyncComplete merges by updatedAt into current state), but the cloud row is now stale: another device syncing pulls the pre-review schedule and shows X due again with the old confidence until the web device re-signs-in or edits X again.

**F-28 · The duplicate leetcodeNumber check is skipped in edit mode (isDuplicate requires !isEdit), letting an edit assign a number that another problem already has; deduplicateProblems later silently deletes the older problem on the next app load or sign-in sync.** *(web — unverified)*
`src/components/ProblemModal.tsx:108` — area: web-components
**Failure scenario:** User has 'Two Sum' (#1) and 'Contains Duplicate' (#217). They edit Two Sum and mistakenly change its LeetCode number to 217; handleSaveProblem takes the update branch (matched by id) with no duplicate guard, so the library now holds two problems with leetcodeNumber 217. On the next page load, useProblems' useState initializer runs deduplicateProblems, which keeps the freshly-edited problem (newer updatedAt) and silently drops the original Contains Duplicate — its notes, confidence, and review schedule are gone; at the next sign-in sync its cloud row is also deleted via idsToDelete.

**F-29 · Confidence Trend excludes the current week on BOTH platforms: groupEventsByWeek is called with startDate = today-84 and 12 week buckets, emitting week-starts that always end before the current week — reviews made this week never appear in the 'Last 12 weeks' chart (web src/components/ProgressView.tsx:464; mobile src/screens/ProgressScreen.tsx:423).** *(both — unverified)*
`src/components/ProgressView.tsx + mobile src/screens/ProgressScreen.tsx:464` — area: web-components
**Failure scenario:** Today is Wednesday 2026-07-01; user reviews 5 problems today and 2 on Monday 2026-06-29. groupEventsByWeek buckets them under week 2026-06-28, but the emitted weeks are 2026-04-05 … 2026-06-21, so none of this week's reviews show on the chart, the trend line ends at the week of Jun 21, and the 'Current' average shown in the footer is the stale prior-week value. A user reviewing all week sees zero movement in the trend until Sunday.

**F-30 · handleTimeChange runs cancelAll+schedule per spinner tick with no serialization, so overlapping scheduleDailyReminder calls can leave multiple daily reminders scheduled (including at stale times).** *(mobile — unverified)*
`src/screens/SettingsScreen.tsx:94` — area: mobile-screens, cross-cutting
**Failure scenario:** With Daily Reminder enabled, the user scrolls the iOS time spinner from 9:00 to 9:30; DateTimePicker fires onChange for intermediate values, each invoking scheduleDailyReminder (cancelAllScheduledNotificationsAsync then scheduleNotificationAsync, both async). Interleaving 'cancelA, cancelB, scheduleA(9:10), scheduleB(9:30)' leaves two repeating notifications scheduled — the user then receives a daily reminder at 9:10 AND 9:30 even though Settings shows only 9:30.

**F-31 · The effect syncing the pattern filter from navigation params depends on the param's string value, so navigating from the Progress heatmap with the same pattern a second time does not re-apply the filter.** *(mobile — unverified)*
`src/screens/ProblemsScreen.tsx:31` — area: mobile-screens
**Failure scenario:** User taps 'Arrays' on the Progress pattern heatmap -> Problems tab filters to Arrays. User taps 'Clear filters' (or picks another pattern), returns to Progress, and taps 'Arrays' again. navigation.navigate('Problems', { filterPattern: 'Arrays' }) sets params but route.params?.filterPattern is still the string 'Arrays', so the effect's dependency is unchanged and never re-runs — the user lands on an unfiltered (or wrongly filtered) list instead of the Arrays filter they tapped.

**F-32 · finishToApp calls navigation.replace('MainTabs') unconditionally, which in the Help-screen replay flow pushes a second MainTabs instance on top of the Help modal instead of returning to the existing app.** *(mobile — unverified)*
`src/screens/OnboardingScreen.tsx:14` — area: mobile-screens
**Failure scenario:** User opens Help -> 'Open welcome tour' (navigate('Onboarding', { replay: true }), stack becomes [MainTabs, Help, Onboarding]) -> finishes the tour with 'Get Started'. replace() turns the stack into [MainTabs, Help, MainTabs]: a duplicate tab navigator mounts (resetting tab/filter state), and the iOS back-swipe from the 'new' app reveals the Help modal and then the old MainTabs underneath.

**F-33 · In custom mode, entering a Problem # that already exists sets isDuplicate and disables Save with zero feedback — the duplicate strike-through card only renders in LeetCode mode, and validate() never reports the duplicate.** *(mobile — unverified)*
`src/screens/AddEditScreen.tsx:66` — area: mobile-screens
**Failure scenario:** User already has 'Two Sum' (#1). They open Add Problem, switch to Custom, type a title, select patterns, and enter '1' in Problem #. The Save button (disabled={isDuplicate}, line 504) silently does nothing, no inline error or toast appears (the duplicate card requires mode==='leetcode' or isLcEdit), and the user is stuck with no explanation of why the form cannot be saved.

**F-34 · Toast auto-dismiss effect depends only on [isVisible], so a second toast shown while one is visible inherits the first toast's timer and duration instead of getting its own; showToast (src/contexts/DataContext.tsx:76) never toggles visible false between toasts.** *(mobile — unverified)*
`src/components/Toast.tsx:54` — area: mobile-components
**Failure scenario:** User rates a review (toast 'x/5 · next in Nd', 2500ms timer starts), then ~2.4s later taps Ignore on a LeetCode pending import. The 'Ignored <title>. / Undo' toast (useLeetCodePendingImports.ts:218) should stay 4500ms, but the first toast's 2500ms timer (captured with action=undefined) dismisses it after ~100ms — or, if it lands during the 200ms dismiss animation, the in-flight animation's onDone hides it almost instantly with opacity already 0 — so the user never gets the Undo window for the ignored import.

**F-35 · Android fallback renders one Alert button per filter option plus Cancel, but React Native Android alerts support at most 3 buttons — extra buttons are silently dropped, making filters unusable on Android (app.json ships an Android package; the code comment wrongly claims it is 'functional').** *(mobile — unverified)*
`src/components/FilterChip.tsx:41` — area: mobile-components
**Failure scenario:** On an Android build, user taps the Confidence filter on the Problems screen (6 options + Cancel = 7 buttons) or the Pattern filter (20+ options): the Alert shows only up to 3 buttons, so most confidence levels and nearly all patterns can never be selected; even the 3-option Status filter loses a choice once Cancel is included.
*Severity note:* Severity reflects that an Android build is configured (app.json android.package) but not currently shipped; becomes High the day an Android build ships.

**F-36 · localNotes is initialized from problem.notes once at mount and never re-synced, and onBlur (line 201) unconditionally writes localNotes back via onUpdateNotes, so stale notes can silently overwrite newer notes.** *(mobile — unverified)*
`src/components/ReviewCard.tsx:128` — area: mobile-components
**Failure scenario:** A problem is due, so its ReviewCard is mounted on the Today tab (localNotes='old'). User opens the same problem in the AddEdit modal (or another device syncs), changes notes to 'new', and saves — problems state updates but ReviewCard stays mounted with localNotes='old'. Back on Today, user taps 'Show notes' (sees the stale 'old' text), taps into the field and taps away: onBlur calls onUpdateNotes(problem.id, 'old'), reverting the 'new' notes locally and pushing the stale value to the cloud — the notes edit is lost.

**F-37 · posthog.reset() is called on every app/page load for signed-out users because supabase-js v2 onAuthStateChange fires INITIAL_SESSION with a null session, regenerating the anonymous distinct_id each visit (web src/contexts/AuthContext.tsx:35, mobile src/contexts/AuthContext.tsx:95).** *(both — unverified)*
`src/contexts/AuthContext.tsx:35` — area: cross-cutting
**Failure scenario:** A signed-out user opens the web app Monday (anon id A, captures problem_added) and again Tuesday: on Tuesday's load onAuthStateChange emits INITIAL_SESSION with session=null, the else-branch calls posthog.reset(), and a new anon id B is generated. PostHog counts two distinct persons, retention/funnels for anonymous users are broken, and when the user later signs in only the most recent anon id merges into the identified person — all earlier anonymous events stay orphaned. Same on every mobile cold start while signed out.

**F-38 · The app-wide ErrorBoundary only console.errors caught render errors and never reports them to Sentry, so production React render crashes on mobile are invisible in Sentry (web covers this via Sentry.reactErrorHandler on onCaughtError in src/main.tsx).** *(mobile — unverified)*
`src/components/ErrorBoundary.tsx:19` — area: cross-cutting
**Failure scenario:** Any component under AppInner throws during render on a production build (e.g. undefined field on a malformed synced problem): the boundary in App.tsx catches it, shows the 'Something went wrong' fallback, and componentDidCatch only logs to console. Sentry's global handler never fires because the boundary swallowed the error, so the crash never appears in Sentry and the regression goes unnoticed while users repeatedly hit the fallback screen.


### Low

**F-39 · handleImport computes the merge from a `problems` closure captured before `await importData(file)` and then calls non-functional setProblems(mergedProblems), discarding any problem-state updates that land during the file read (e.g., sign-in sync completion or an auto-import).** *(web — unverified)*
`src/hooks/useProblems.ts:301` — area: web-hooks
**Failure scenario:** User signs in (sync in flight) and immediately imports a backup file. While importData reads the file, handleSyncComplete resolves and merges 50 cloud-only problems into state. handleImport's merge was computed from the pre-sync problems array and setProblems(mergedProblems) replaces the state wholesale, so the 50 cloud problems disappear from the UI (and from localStorage via the persist effect) until the next sign-in sync re-adds them; the same window exists for a problem just created by the expired-import auto-confirm effect.

**F-40 · The auto-hide timer is keyed on [isVisible, onDone] and never restarts when a new message replaces a visible toast, so the first toast's timer dismisses the second toast almost immediately.** *(web — unverified)*
`src/components/Toast.tsx:17` — area: web-components
**Failure scenario:** User rates review card A (toast '1 of 5 done · Next review in 2 days' appears, 2.5s timer starts) and rates card B ~2.3s later. showToast only replaces the message — isVisible stays true and onDone is a stable useCallback, so the effect does not re-run and no new timer starts. The original timer fires at 2.5s and hides the second toast after ~200ms, so the user never gets to read their progress/interval for card B.

**F-41 · handleSaveProblem computes `action` via a side effect inside the setProblems updater and reads it on the following lines; React only invokes the updater synchronously when the fiber has no pending update, so with a concurrently scheduled App-fiber update the code below sees the stale default 'added'. Possibly tolerated in practice — flagging as latent/fragile.** *(web — unverified)*
`src/hooks/useProblems.ts:157` — area: web-hooks
**Failure scenario:** A background setState on the App fiber (e.g., useLeetCodeActivity's fetch resolving and calling setConnection/setSubmissions, or the Toast hide timer) is pending when the user saves an edit in ProblemModal. React skips eager evaluation of the setProblems updater, so `action` is still 'added' when the toast/analytics code runs: the user sees 'Problem added' instead of 'Problem updated' and posthog logs problem_added for an edit; in the duplicate-backstop branch (only reachable if the modal's own duplicate guard is bypassed) it would also push the phantom duplicate to the cloud.

**F-42 · Escape in the search input is handled to close only the suggestion dropdown, but ProblemModal's document-level Escape listener (ProblemModal.tsx:51) fires on the same keypress and closes the entire modal, discarding the form — the dedicated dropdown Escape handler suggests dropdown-only close was intended; flagged low because the intended layering is uncertain.** *(web — unverified)*
`src/components/LeetCodeSearch.tsx:63` — area: web-components
**Failure scenario:** In the Add Problem modal, user selects patterns and confidence, then types 'two' in the LeetCode search so the dropdown opens. They press Escape intending to dismiss the dropdown; both handlers run and the whole modal closes, discarding the selected patterns/confidence/notes (and on next open of Add, leftover draft state may appear per the ProblemModal reset bug).

**F-43 · handleSave unconditionally shows the 'Problem added' toast and closes the screen even when useProblems.saveProblem internally rejects the save as a duplicate, and the success toast overwrites the duplicate warning (single-toast state).** *(mobile — unverified)*
`src/screens/AddEditScreen.tsx:152` — area: mobile-screens
**Failure scenario:** An expired LeetCode pending import auto-imports problem #217 in the background (useLeetCodePendingImports auto-confirm) while the user has #217 selected in the open AddEdit modal and taps Save before the re-render disables the button. saveProblem hits its duplicate branch and saves nothing, shows 'Problem #217 already in your library', but handleSave immediately replaces it with 'Problem added' and dismisses the modal — the user believes the problem was added when it was not (it does exist via the auto-import, but with confidence 1 instead of their chosen rating).

**F-44 · refreshAll's local-storage fallback reads problems asynchronously and overwrites state unconditionally, so a rating committed during the read window is reverted in memory and then persisted over (same pattern as the AppState foreground reload in useProblems).** *(mobile — unverified)*
`src/contexts/DataContext.tsx:235` — area: mobile-screens
**Failure scenario:** Signed-out user pulls to refresh on Dashboard; refreshAll's loadProblems() getItem is issued, and in the milliseconds before it resolves the user rates a due card (commitProblems updates state/ref, persist effect saves). The stale array then arrives, setProblems(freshProblems) reverts the problem's confidence/nextReviewDate, and the persist effect writes the stale array back to AsyncStorage — the review event/log keep the rating but the problem's schedule is lost, so the card reappears as due. Window is tiny (ms) and cloud-recoverable when signed in, hence low.

**F-45 · handleTimeChange never hides the picker (setShowTimePicker(false)) and ignores event.type, which on Android makes the DateTimePicker dialog reopen in a loop after every OK/Cancel; low because the app currently appears iOS-focused (analytics hardcode platform 'ios'), so possibly intentional iOS-only code.** *(mobile — unverified)*
`src/screens/SettingsScreen.tsx:383` — area: mobile-screens
**Failure scenario:** On an Android build (android/ directory exists in the repo), the user enables Daily Reminder and taps 'Remind at': the time dialog opens; pressing OK or Cancel fires onChange but showTimePicker stays true, so the still-mounted DateTimePicker re-renders and immediately reopens the dialog — the user is trapped in a reopening time-picker loop and each OK also re-schedules the reminder.

**F-46 · The collapse effect includes onExited in its deps while DashboardScreen passes an inline arrow (src/screens/DashboardScreen.tsx:191), so any parent re-render during the 220ms exit re-runs the effect, calls height.setValue(measuredHeight), and restarts the collapse animation; likely unintended but impact is mostly visual.** *(mobile — unverified)*
`src/components/CollapsingListItem.tsx:52` — area: mobile-components
**Failure scenario:** User ignores a LeetCode pending import: the card starts collapsing, then the 'Ignored …' toast state change and the async markIgnored completion each re-render Dashboard within the 220ms window; each re-render snaps the card back to full height and replays the collapse, producing a stutter and delaying removal (the interrupted animation's finished=false also relies on the restarted run to ever fire onExited).

**F-47 · For pending imports, setSelectedPendingConfidence(confidence) is applied optimistically before await onConfirmImport and never reverted on failure, so the stars stay lit even when the import did not happen; possibly intentional optimistic UI, hence low.** *(mobile — unverified)*
`src/components/TodayLeetCodeCard.tsx:75` — area: mobile-components
**Failure scenario:** User taps 4 stars on a pending LeetCode import while the import fails internally (confirmImport surfaces result.error via an error toast and leaves the item pending): the card keeps 4 stars filled under the 'Rate confidence to add' label with no way to tell the add failed once the toast disappears, and re-tapping the same star is the only recovery.

**F-48 · Queued review mutations recompute review_date via utcToLocalDateStr(reviewTimestamp) at flush time, so if the device timezone changes between the offline review and the queue flush, the cloud review_date differs from the local reviewEvents date (uncertain if this exotic case is considered acceptable).** *(mobile — unverified)*
`src/utils/supabaseData.ts:350` — area: cross-cutting
**Failure scenario:** User reviews a problem offline at 11 PM in New York (local event date 2026-07-01, timestamp 2026-07-02T03:00Z), then flies to Tokyo where the queue flushes: utcToLocalDateStr now yields 2026-07-02, so the cloud row gets review_date 2026-07-02 while the device's reviewEvents keep 2026-07-01. Web and mobile heatmaps/streaks then show the same review on different days, and replaceSameDayReviewEvent's date-keyed delete/dedupe (leetcode-rating:...:date) no longer matches the original local event's day.

**F-49 · All 13 PostHog captures plus SettingsScreen/ProblemListPicker hardcode platform: "ios" instead of using Platform.OS, so Android builds (android/ project and app.json android.package exist) would report platform "ios"; low because it is unclear whether Android is currently shipped.** *(mobile — unverified)*
`src/hooks/useProblems.ts:152` — area: cross-cutting, deps-config
**Failure scenario:** A user on the Android build (com.derekz.patternbank) adds and reviews problems: every problem_added/problem_reviewed/data_imported event lands in PostHog with platform="ios". Any web-vs-iOS-vs-Android breakdown in the PatternBank PostHog project silently attributes all Android usage to iOS, making per-platform metrics wrong.

**F-50 · Mobile PostHog client is created unconditionally with no __DEV__ gate, unlike web (init skipped on localhost) and unlike mobile Sentry (enabled: !__DEV__), so simulator/dev sessions send events to the production PostHog project.** *(mobile — unverified)*
`src/utils/posthog.ts:3` — area: cross-cutting, deps-config
**Failure scenario:** Developer runs the app in Expo dev on a simulator and taps through add/review flows: problem_added, problem_reviewed, etc. are captured to the production project phc_HX5Z... (US cloud). Production dashboards (DAU, event counts, funnels) are inflated with dev/test activity, while the equivalent web dev sessions on localhost send nothing — the two platforms' metrics are not comparable.

**F-51 · leetcode_import_confirmed on mobile omits the pattern_count property that web sends (web src/hooks/useProblems.ts:203-208 sends difficulty, confidence, pattern_count), breaking cross-platform property parity for the same action.** *(mobile — unverified)*
`src/hooks/useProblems.ts:231` — area: cross-cutting
**Failure scenario:** An analyst builds a PostHog insight on leetcode_import_confirmed broken down by pattern_count: all mobile events fall into the null bucket because the property is never sent from mobile, while web events populate it — the metric appears to show mobile imports never carry patterns when they actually do.

**F-52 · Production EAS builds set SENTRY_DISABLE_AUTO_UPLOAD=true, so JS source maps are not uploaded and production Sentry events show minified/unsymbolicated stack traces; low because this may be an intentional build-speed tradeoff.** *(mobile — unverified)*
`eas.json:17` — area: cross-cutting, deps-config
**Failure scenario:** A production user hits an unhandled JS exception; Sentry receives the event from the @sentry/react-native init in index.js, but because the production build skipped source-map upload the stack trace shows bundle offsets (index.android.bundle:1:483920) instead of file/line, making the crash effectively undiagnosable — while the web project (Sentry via @sentry/react on Vercel) produces readable traces.

**F-53 · Supabase URL and anon key are hardcoded in mobile source while web reads them from env (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY), so the two clients cannot be re-pointed or re-keyed together; a source comment says the hardcoding is intentional, hence severity low despite the severe consequence when triggered.** *(mobile — unverified)*
`src/utils/supabaseClient.ts:12` — area: deps-config
**Failure scenario:** If the Supabase anon key is ever rotated (leak response, or migration to the new sb_publishable_ key format), web is fixed by updating Vercel env and redeploying, but every installed mobile app keeps the old JWT baked into the binary. All mobile auth/sync requests start returning 401; because sync is fire-and-forget with errors swallowed, users see no error while their edits silently stop backing up until a new binary clears App Store review — data created in that window is lost if the device is wiped or the app reinstalled.
