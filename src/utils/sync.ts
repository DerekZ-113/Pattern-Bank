import {
  fetchProblems,
  upsertProblem,
  upsertProblems,
  deleteProblem as deleteFromSupabase,
  deleteProblems as deleteMultipleFromSupabase,
  fetchProblemTombstones,
  upsertProblemTombstone,
  upsertProblemTombstones,
  fetchDataReset,
  upsertDataReset,
  deleteAllUserProblems,
  deleteAllUserReviewLog,
  fetchReviewLog,
  fetchReviewEvents,
  logReview,
  replaceReviewLog,
  batchInsertReviewLogs,
  fetchPreferences,
  upsertPreferences,
} from "./supabaseData";
import { todayStr, utcToLocalDateStr } from "@patternbank/core";
import type {
  Problem,
  ReviewLogEntry,
  ReviewEvent,
  Preferences,
  Confidence,
  ProblemTombstone,
  DataReset,
} from "../types";

export interface SyncResult {
  problems: Problem[];
  reviewLog: ReviewLogEntry[];
  reviewEvents: ReviewEvent[];
  preferences: Preferences;
  problemTombstones: ProblemTombstone[];
  dataReset: DataReset | null;
  hasChanges: boolean;
  error: unknown;
}

function localSyncResult(
  problems: Problem[],
  reviewLog: ReviewLogEntry[],
  reviewEvents: ReviewEvent[],
  preferences: Preferences,
  problemTombstones: ProblemTombstone[],
  dataReset: DataReset | null,
  error: unknown
): SyncResult {
  return {
    problems,
    reviewLog,
    reviewEvents,
    preferences,
    problemTombstones,
    dataReset,
    hasChanges: false,
    error,
  };
}

function resetTime(reset: DataReset | null | undefined): number {
  if (!reset) return 0;
  const ms = new Date(reset.resetAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function compareDataResets(localReset: DataReset | null, cloudReset: DataReset | null): "local" | "cloud" | "none" {
  const localTime = resetTime(localReset);
  const cloudTime = resetTime(cloudReset);
  if (localTime > cloudTime) return "local";
  if (cloudTime > localTime) return "cloud";
  return "none";
}

function newestDataReset(localReset: DataReset | null, cloudReset: DataReset | null): DataReset | null {
  return compareDataResets(localReset, cloudReset) === "cloud" ? cloudReset : localReset;
}

function filterProblemsAfterDataReset(problems: Problem[], reset: DataReset | null): { problems: Problem[]; removedIds: string[] } {
  const cutoff = resetTime(reset);
  if (cutoff === 0) return { problems, removedIds: [] };

  const kept: Problem[] = [];
  const removedIds: string[] = [];
  for (const problem of problems) {
    const updatedAt = problem.updatedAt ? new Date(problem.updatedAt).getTime() : 0;
    if (Number.isFinite(updatedAt) && updatedAt > cutoff) {
      kept.push(problem);
    } else {
      removedIds.push(problem.id);
    }
  }
  return { problems: kept, removedIds };
}

function filterReviewEventsAfterDataReset(events: ReviewEvent[], reset: DataReset | null): ReviewEvent[] {
  const cutoff = resetTime(reset);
  if (cutoff === 0) return events;
  return events.filter((event) => {
    const timestamp = new Date(event.timestamp).getTime();
    return Number.isFinite(timestamp) && timestamp > cutoff;
  });
}

function reviewLogFromEvents(events: ReviewEvent[]): ReviewLogEntry[] {
  const dates = new Set<string>();
  const log: ReviewLogEntry[] = [];
  for (const event of events) {
    if (!dates.has(event.date)) {
      dates.add(event.date);
      log.push({ date: event.date });
    }
  }
  return log;
}

function reviewEventKey(event: ReviewEvent): string {
  return `${event.problemId}|${event.timestamp}`;
}

function reviewEventTime(event: ReviewEvent): number {
  const timestamp = new Date(event.timestamp).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function reviewEventsMatch(a: ReviewEvent, b: ReviewEvent): boolean {
  if (reviewEventKey(a) === reviewEventKey(b)) return true;
  if (a.problemId !== b.problemId) return false;

  const aTime = reviewEventTime(a);
  const bTime = reviewEventTime(b);
  if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return false;

  return Math.abs(aTime - bTime) < 5000;
}

function stringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function preferencesEqual(a: Preferences, b: Preferences): boolean {
  return (
    a.dailyReviewGoal === b.dailyReviewGoal &&
    a.hidePatternsDuringReview === b.hidePatternsDuringReview &&
    stringArraysEqual(a.enabledExtraPatterns, b.enabledExtraPatterns)
  );
}

export function filterTombstonesAfterDataReset(
  tombstones: ProblemTombstone[],
  reset: DataReset | null
): ProblemTombstone[] {
  const cutoff = resetTime(reset);
  if (cutoff === 0) return tombstones;
  return tombstones.filter((tombstone) => {
    const deletedAt = new Date(tombstone.deletedAt).getTime();
    return Number.isFinite(deletedAt) && deletedAt > cutoff;
  });
}

// ============================================================
// SYNC ON SIGN-IN
// ============================================================
// Called once when auth state changes to signed-in.
// Pulls from Supabase, merges with localStorage, pushes merged result to both.
// Returns { problems, reviewLog, preferences } — the merged data.

export async function syncOnSignIn(
  userId: string,
  localProblems: Problem[],
  localReviewLog: ReviewLogEntry[],
  localReviewEvents: ReviewEvent[],
  localPreferences: Preferences,
  localProblemTombstones: ProblemTombstone[] = [],
  localDataReset: DataReset | null = null
): Promise<SyncResult> {
  try {
    // 1. Fetch everything from Supabase in parallel
    const [
      cloudProblemsRes,
      cloudTombstonesRes,
      cloudResetRes,
      cloudLogRes,
      cloudEventsRes,
      cloudPrefsRes,
    ] = await Promise.all([
      fetchProblems(userId),
      fetchProblemTombstones(userId),
      fetchDataReset(userId),
      fetchReviewLog(userId),
      fetchReviewEvents(userId),
      fetchPreferences(userId),
    ]);

    // If any fetch failed critically, return local data unchanged
    if (cloudProblemsRes.error) {
      console.error("Sync: failed to fetch problems", cloudProblemsRes.error);
      return localSyncResult(localProblems, localReviewLog, localReviewEvents, localPreferences, localProblemTombstones, localDataReset, cloudProblemsRes.error);
    }
    if (cloudTombstonesRes.error) {
      console.error("Sync: failed to fetch problem tombstones", cloudTombstonesRes.error);
      return localSyncResult(localProblems, localReviewLog, localReviewEvents, localPreferences, localProblemTombstones, localDataReset, cloudTombstonesRes.error);
    }
    if (cloudResetRes.error) {
      console.error("Sync: failed to fetch data reset marker", cloudResetRes.error);
      return localSyncResult(localProblems, localReviewLog, localReviewEvents, localPreferences, localProblemTombstones, localDataReset, cloudResetRes.error);
    }
    const reviewEventsFetchFailed = !!cloudEventsRes.error;
    if (reviewEventsFetchFailed) {
      console.error("Sync: failed to fetch review events", cloudEventsRes.error);
    }
    const preferencesFetchFailed = !!cloudPrefsRes.error;
    if (preferencesFetchFailed) {
      console.error("Sync: failed to fetch preferences", cloudPrefsRes.error);
    }

    const cloudProblems = cloudProblemsRes.data ?? [];
    const cloudTombstones = cloudTombstonesRes.data ?? [];
    const cloudDataReset = cloudResetRes.data ?? null;
    const resetWinner = compareDataResets(localDataReset, cloudDataReset);
    const dataReset = newestDataReset(localDataReset, cloudDataReset);

    let effectiveLocalProblems = localProblems;
    let effectiveLocalLog = localReviewLog;
    let effectiveLocalEvents = localReviewEvents;
    let effectiveCloudProblems = cloudProblems;
    let effectiveCloudLog = cloudLogRes.data ?? [];
    let effectiveCloudEvents = reviewEventsFetchFailed ? [] : cloudEventsRes.data ?? [];
    let resetRemovedCloudProblemIds: string[] = [];
    let resetMarkerWriteSucceeded = true;

    if (resetWinner === "cloud") {
      effectiveLocalProblems = [];
      effectiveLocalLog = [];
      effectiveLocalEvents = [];
      const filteredCloud = filterProblemsAfterDataReset(cloudProblems, dataReset);
      effectiveCloudProblems = filteredCloud.problems;
      effectiveCloudEvents = filterReviewEventsAfterDataReset(effectiveCloudEvents, dataReset);
      effectiveCloudLog = reviewLogFromEvents(effectiveCloudEvents);
      resetRemovedCloudProblemIds = filteredCloud.removedIds;
    } else if (resetWinner === "local") {
      effectiveCloudProblems = [];
      effectiveCloudLog = [];
      effectiveCloudEvents = [];
      const resetResult = await upsertDataReset(userId, localDataReset!);
      if (resetResult.error) {
        resetMarkerWriteSucceeded = false;
        console.error("Sync: failed to upsert local data reset marker", resetResult.error);
      } else {
        const [problemsDeleteResult, logDeleteResult] = await Promise.all([
          deleteAllUserProblems(userId),
          deleteAllUserReviewLog(userId),
        ]);
        if (problemsDeleteResult.error) console.error("Sync: failed to repair cloud reset (problems):", problemsDeleteResult.error);
        if (logDeleteResult.error) console.error("Sync: failed to repair cloud reset (review log):", logDeleteResult.error);
      }
    } else if (dataReset) {
      const filteredCloud = filterProblemsAfterDataReset(cloudProblems, dataReset);
      effectiveCloudProblems = filteredCloud.problems;
      effectiveCloudEvents = filterReviewEventsAfterDataReset(effectiveCloudEvents, dataReset);
      effectiveCloudLog = reviewLogFromEvents(effectiveCloudEvents);
      resetRemovedCloudProblemIds = filteredCloud.removedIds;
    }

    const validLocalTombstones = filterTombstonesAfterDataReset(localProblemTombstones, dataReset);
    const validCloudTombstones = filterTombstonesAfterDataReset(cloudTombstones, dataReset);
    const {
      tombstones: mergedTombstones,
      addedFromCloud: tombstonesAddedFromCloud,
    } = mergeProblemTombstones(validLocalTombstones, validCloudTombstones);

    const filteredLocalProblems = filterTombstonedProblems(effectiveLocalProblems, mergedTombstones);
    const filteredCloudProblems = filterTombstonedProblems(effectiveCloudProblems, mergedTombstones);
    const tombstoneIds = new Set(mergedTombstones.map((t) => t.problemId));
    const tombstonedCloudIds = effectiveCloudProblems
      .filter((p) => tombstoneIds.has(p.id))
      .map((p) => p.id);

    const cloudPrefs = cloudPrefsRes.data;

    // 2. Merge problems, then deduplicate by leetcodeNumber
    const { problems: merged, cloudAdded, cloudWon } = mergeProblems(filteredLocalProblems, filteredCloudProblems);
    const { problems: mergedProblems, removedIds: dupIds } = deduplicateProblems(merged);

    let tombstoneMarkersReadyForCleanup = true;
    if (mergedTombstones.length > 0) {
      const { error } = await upsertProblemTombstones(userId, mergedTombstones);
      if (error) {
        tombstoneMarkersReadyForCleanup = false;
        console.error("Sync: failed to upsert problem tombstones", error);
      }
    }

    // Delete duplicate and stale rows only after their durable intent marker is safe.
    const idsToDelete = new Set(dupIds);
    if (tombstoneMarkersReadyForCleanup) {
      tombstonedCloudIds.forEach((id) => idsToDelete.add(id));
    }
    if (resetMarkerWriteSucceeded) {
      resetRemovedCloudProblemIds.forEach((id) => idsToDelete.add(id));
    }
    const idsToDeleteList = Array.from(idsToDelete);
    if (idsToDeleteList.length > 0) {
      await deleteMultipleFromSupabase(idsToDeleteList);
    }

    // 3. Merge review log (deduplicate by date)
    const { log: mergedLog, addedFromCloud: logAddedFromCloud } = mergeReviewLog(effectiveLocalLog, effectiveCloudLog);

    // 4. Merge review events (deduplicate by problemId+timestamp)
    const { events: mergedEvents, addedFromCloud: eventsAddedFromCloud, localOnlyEvents } = mergeReviewEvents(effectiveLocalEvents, effectiveCloudEvents);

    // Push local-only review events to cloud
    if (localOnlyEvents.length > 0 && !reviewEventsFetchFailed) {
      pushReviewEventsToCloud(userId, localOnlyEvents);
    }

    // 5. Merge preferences
    // If Supabase has preferences, use those (cloud state).
    // If not (first sign-in), push localStorage preferences to Supabase.
    let mergedPreferences: Preferences;
    if (cloudPrefs) {
      mergedPreferences = cloudPrefs;
    } else if (preferencesFetchFailed) {
      mergedPreferences = localPreferences;
    } else {
      mergedPreferences = localPreferences;
      // First sign-in — push local preferences to cloud
      await upsertPreferences(userId, localPreferences);
    }

    // 5. Push merged problems to Supabase where needed (batched)
    const cloudIds = new Set(filteredCloudProblems.map((p) => p.id));
    const localIds = new Set(filteredLocalProblems.map((p) => p.id));
    const cloudMap = new Map(filteredCloudProblems.map((p) => [p.id, p]));

    const problemsToPush: Problem[] = [];
    for (const problem of mergedProblems) {
      if (!cloudIds.has(problem.id)) {
        // Local-only — upload to cloud
        problemsToPush.push(problem);
      } else if (localIds.has(problem.id)) {
        // Exists in both — only push if local version won (is the merged version)
        const cloud = cloudMap.get(problem.id)!;
        const cloudTime = cloud.updatedAt ? new Date(cloud.updatedAt).getTime() : 0;
        const localTime = problem.updatedAt ? new Date(problem.updatedAt).getTime() : 0;
        if (localTime > cloudTime) {
          problemsToPush.push(problem);
        }
      }
    }
    if (problemsToPush.length > 0 && resetMarkerWriteSucceeded) {
      await upsertProblems(userId, problemsToPush);
    }

    // Detect whether sync actually changed local state — tracked during merge, not post-hoc
    const hasChanges =
      cloudAdded > 0 ||
      cloudWon > 0 ||
      idsToDeleteList.length > 0 ||
      tombstonesAddedFromCloud > 0 ||
      resetWinner === "cloud" ||
      logAddedFromCloud > 0 ||
      eventsAddedFromCloud > 0 ||
      (cloudPrefs !== null && !preferencesEqual(cloudPrefs, localPreferences));

    return {
      problems: mergedProblems,
      reviewLog: mergedLog,
      reviewEvents: mergedEvents,
      preferences: mergedPreferences,
      problemTombstones: mergedTombstones,
      dataReset,
      hasChanges,
      error: null,
    };
  } catch (err) {
    console.error("Sync: unexpected error", err);
    return {
      problems: localProblems,
      reviewLog: localReviewLog,
      reviewEvents: localReviewEvents,
      preferences: localPreferences,
      problemTombstones: localProblemTombstones,
      dataReset: localDataReset,
      hasChanges: false,
      error: err,
    };
  }
}

// ============================================================
// MERGE HELPERS
// ============================================================

export interface MergeProblemsResult {
  problems: Problem[];
  cloudAdded: number;
  cloudWon: number;
}

export function mergeProblems(localProblems: Problem[], cloudProblems: Problem[]): MergeProblemsResult {
  const localMap = new Map(localProblems.map((p) => [p.id, p]));
  const cloudMap = new Map(cloudProblems.map((p) => [p.id, p]));
  const merged = new Map<string, Problem>();
  let cloudAdded = 0;
  let cloudWon = 0;

  // Add all local problems first
  for (const [id, problem] of localMap) {
    merged.set(id, problem);
  }

  // For cloud problems: add if local-only, or resolve conflict by updatedAt
  for (const [id, problem] of cloudMap) {
    if (!merged.has(id)) {
      // Cloud-only — add it
      merged.set(id, problem);
      cloudAdded++;
    } else {
      // Exists in both — compare updatedAt timestamps
      const local = localMap.get(id)!;
      const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
      const cloudTime = problem.updatedAt ? new Date(problem.updatedAt).getTime() : 0;

      // If cloud is newer, it wins. If equal or local newer or either missing, local wins (fallback).
      if (cloudTime > localTime) {
        merged.set(id, problem);
        cloudWon++;
      }
    }
  }

  return { problems: Array.from(merged.values()), cloudAdded, cloudWon };
}

export interface MergeProblemTombstonesResult {
  tombstones: ProblemTombstone[];
  addedFromCloud: number;
}

export function mergeProblemTombstones(
  localTombstones: ProblemTombstone[],
  cloudTombstones: ProblemTombstone[]
): MergeProblemTombstonesResult {
  const merged = new Map<string, ProblemTombstone>();
  const localMap = new Map(localTombstones.map((t) => [t.problemId, t]));
  let addedFromCloud = 0;

  for (const tombstone of localTombstones) {
    merged.set(tombstone.problemId, tombstone);
  }

  for (const tombstone of cloudTombstones) {
    const existing = merged.get(tombstone.problemId);
    if (!existing) {
      merged.set(tombstone.problemId, tombstone);
      addedFromCloud++;
      continue;
    }
    const existingTime = new Date(existing.deletedAt).getTime();
    const cloudTime = new Date(tombstone.deletedAt).getTime();
    if (cloudTime > existingTime) {
      merged.set(tombstone.problemId, tombstone);
      if (localMap.has(tombstone.problemId)) {
        addedFromCloud++;
      }
    }
  }

  return { tombstones: Array.from(merged.values()), addedFromCloud };
}

export function filterTombstonedProblems(problems: Problem[], tombstones: ProblemTombstone[]): Problem[] {
  if (tombstones.length === 0) return problems;
  const deletedIds = new Set(tombstones.map((t) => t.problemId));
  return problems.filter((p) => !deletedIds.has(p.id));
}

export function deduplicateProblems(problems: Problem[]): { problems: Problem[]; removedIds: string[] } {
  const seen = new Map<number, Problem>(); // leetcodeNumber → problem
  const kept: Problem[] = [];
  const removedIds: string[] = [];

  for (const problem of problems) {
    if (!problem.leetcodeNumber) {
      kept.push(problem);
      continue;
    }
    const existing = seen.get(problem.leetcodeNumber);
    if (!existing) {
      seen.set(problem.leetcodeNumber, problem);
      kept.push(problem);
    } else {
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const currentTime = problem.updatedAt ? new Date(problem.updatedAt).getTime() : 0;
      if (currentTime > existingTime) {
        const idx = kept.indexOf(existing);
        kept[idx] = problem;
        seen.set(problem.leetcodeNumber, problem);
        removedIds.push(existing.id);
      } else {
        removedIds.push(problem.id);
      }
    }
  }
  return { problems: kept, removedIds };
}

export interface MergeReviewLogResult {
  log: ReviewLogEntry[];
  addedFromCloud: number;
}

export interface MergeReviewEventsResult {
  events: ReviewEvent[];
  addedFromCloud: number;
  localOnlyEvents: ReviewEvent[];
}

export function mergeReviewEvents(localEvents: ReviewEvent[], cloudEvents: ReviewEvent[]): MergeReviewEventsResult {
  type SourcedReviewEvent = { event: ReviewEvent; source: "local" | "cloud" };

  // Combine all events, then deduplicate
  const all: SourcedReviewEvent[] = [
    ...localEvents.map((event) => ({ event, source: "local" as const })),
    ...cloudEvents.map((event) => ({ event, source: "cloud" as const })),
  ];

  // Sort by timestamp so near-duplicate detection works in order
  all.sort((a, b) => a.event.timestamp.localeCompare(b.event.timestamp));

  // Deduplicate: exact key match OR same problemId within 5 seconds (legacy mismatch)
  const kept: SourcedReviewEvent[] = [];

  for (const item of all) {
    if (kept.some((existing) => reviewEventsMatch(existing.event, item.event))) continue;
    kept.push(item);
  }

  // Determine what was added from cloud and what's local-only
  let addedFromCloud = 0;
  const localOnlyEvents: ReviewEvent[] = [];

  for (const { event, source } of kept) {
    const hasLocalMatch = localEvents.some((localEvent) => reviewEventsMatch(localEvent, event));
    const hasCloudMatch = cloudEvents.some((cloudEvent) => reviewEventsMatch(cloudEvent, event));

    if (source === "cloud" && !hasLocalMatch) addedFromCloud++;
    if (source === "local" && !hasCloudMatch) localOnlyEvents.push(event);
  }

  return { events: kept.map(({ event }) => event), addedFromCloud, localOnlyEvents };
}

export function mergeReviewLog(localLog: ReviewLogEntry[], cloudLog: ReviewLogEntry[]): MergeReviewLogResult {
  // Deduplicate by date — we only need one entry per date for streak calculation
  const dates = new Set<string>();
  const merged: ReviewLogEntry[] = [];
  let addedFromCloud = 0;

  for (const entry of localLog) {
    if (!dates.has(entry.date)) {
      dates.add(entry.date);
      merged.push(entry);
    }
  }

  for (const entry of cloudLog) {
    if (!dates.has(entry.date)) {
      dates.add(entry.date);
      merged.push(entry);
      addedFromCloud++;
    }
  }

  return { log: merged, addedFromCloud };
}

// ============================================================
// FIRE-AND-FORGET PUSH FUNCTIONS
// ============================================================
// Called after every local write when authenticated.
// Errors are logged but never thrown — localStorage is the source of truth.

export async function pushProblemsToCloud(userId: string, problems: Problem[]): Promise<void> {
  if (!problems.length) return;
  const { error } = await upsertProblems(userId, problems);
  if (error) console.error("Cloud batch push failed:", error);
}

export async function pushProblemToCloud(userId: string, problem: Problem): Promise<void> {
  const { error } = await upsertProblem(userId, problem);
  if (error) console.error("Cloud push failed (problem):", error);
}

export async function deleteProblemFromCloud(userId: string, problemId: string, deletedAt: string = new Date().toISOString()): Promise<void> {
  const tombstoneResult = await upsertProblemTombstone(userId, { problemId, deletedAt });
  if (tombstoneResult?.error) {
    console.error("Cloud push failed (problem tombstone):", tombstoneResult.error);
    return;
  }

  const deleteResult = await deleteFromSupabase(problemId);
  if (deleteResult.error) console.error("Cloud push failed (delete):", deleteResult.error);
}

export async function pushReviewToCloud(
  userId: string,
  problemId: string,
  oldConfidence: Confidence,
  newConfidence: Confidence,
  patterns: string[],
  timestamp?: string
): Promise<void> {
  const { error } = await logReview(userId, problemId, oldConfidence, newConfidence, patterns, timestamp);
  if (error) console.error("Cloud push failed (review):", error);
}

const reviewReplacementQueues = new Map<string, Promise<void>>();

function reviewReplacementKey(userId: string, problemId: string, timestamp?: string): string {
  const reviewDate = utcToLocalDateStr(timestamp) ?? todayStr();
  return `${userId}:${problemId}:${reviewDate}`;
}

export async function replaceReviewInCloud(
  userId: string,
  problemId: string,
  oldConfidence: Confidence,
  newConfidence: Confidence,
  patterns: string[],
  timestamp?: string
): Promise<void> {
  const queueKey = reviewReplacementKey(userId, problemId, timestamp);
  const previous = reviewReplacementQueues.get(queueKey) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      const { error } = await replaceReviewLog(userId, problemId, oldConfidence, newConfidence, patterns, timestamp);
      if (error) console.error("Cloud push failed (review replacement):", error);
    });

  reviewReplacementQueues.set(queueKey, current);
  try {
    await current;
  } finally {
    if (reviewReplacementQueues.get(queueKey) === current) {
      reviewReplacementQueues.delete(queueKey);
    }
  }
}

export async function pushReviewEventsToCloud(userId: string, events: ReviewEvent[]): Promise<void> {
  if (!events.length) return;
  const { error } = await batchInsertReviewLogs(userId, events);
  if (error) console.error("Cloud push failed (review events batch):", error);
}

export async function pushPreferencesToCloud(userId: string, prefs: Preferences): Promise<void> {
  const { error } = await upsertPreferences(userId, prefs);
  if (error) console.error("Cloud push failed (preferences):", error);
}

export async function clearAllCloudData(userId: string, resetAt: string = new Date().toISOString()): Promise<void> {
  const resetResult = await upsertDataReset(userId, { resetAt });
  if (resetResult.error) {
    console.error("Cloud clear failed (reset marker):", resetResult.error);
    return;
  }

  const [problemsResult, logResult] = await Promise.all([
    deleteAllUserProblems(userId),
    deleteAllUserReviewLog(userId),
  ]);
  if (problemsResult.error) console.error("Cloud clear failed (problems):", problemsResult.error);
  if (logResult.error) console.error("Cloud clear failed (review log):", logResult.error);
}
