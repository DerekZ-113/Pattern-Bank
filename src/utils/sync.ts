// Fire-and-forget cloud push layer + deps assembly for core's performFullSync.
// Merge logic lives in @patternbank/core; this module stays as the stable
// import path (and vi.mock target) for hooks and tests.
import {
  fetchProblems,
  upsertProblem,
  upsertProblems,
  deleteProblem as deleteFromSupabase,
  deleteProblems,
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
import { performFullSync, todayStr, utcToLocalDateStr } from "@patternbank/core";
import { webStorage } from "../adapters/webStorage";
import type {
  Problem,
  ReviewLogEntry,
  ReviewEvent,
  Preferences,
  Confidence,
  ProblemTombstone,
  DataReset,
} from "../types";

export {
  deduplicateProblems,
  mergeProblems,
  mergeReviewLog,
  mergeReviewEvents,
  mergeProblemTombstones,
  filterTombstonedProblems,
  filterTombstonesAfterDataReset,
} from "@patternbank/core";

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

// ============================================================
// SYNC ON SIGN-IN
// ============================================================
// Called once when auth state changes to signed-in. Delegates to core's
// performFullSync (fail-closed, F-5): on error the local snapshot is returned
// unchanged so localStorage stays the source of truth.

export async function syncOnSignIn(
  userId: string,
  localProblems: Problem[],
  localReviewLog: ReviewLogEntry[],
  localReviewEvents: ReviewEvent[],
  localPreferences: Preferences,
  localProblemTombstones: ProblemTombstone[] = [],
  localDataReset: DataReset | null = null
): Promise<SyncResult> {
  const result = await performFullSync<Preferences>({
    userId,
    cloud: {
      fetchProblems,
      fetchProblemTombstones,
      fetchDataReset,
      fetchReviewLog,
      fetchReviewEvents,
      fetchPreferences,
      upsertDataReset,
      deleteAllUserProblems,
      deleteAllUserReviewLog,
      upsertProblemTombstones,
      deleteProblems,
      upsertProblems,
      batchInsertReviewLogs,
      upsertPreferences,
    },
    storage: webStorage,
    local: {
      problems: localProblems,
      reviewLog: localReviewLog,
      reviewEvents: localReviewEvents,
      preferences: localPreferences,
      problemTombstones: localProblemTombstones,
      dataReset: localDataReset,
    },
    // Web never prunes review events (unchanged behavior); mobile passes 180.
    eventRetentionDays: null,
    hooks: {
      warn: (message, data) => {
        if (data === undefined) console.warn(message);
        else console.warn(message, data);
      },
    },
  });

  if (result.status === "error") {
    return {
      problems: localProblems,
      reviewLog: localReviewLog,
      reviewEvents: localReviewEvents,
      preferences: localPreferences,
      problemTombstones: localProblemTombstones,
      dataReset: localDataReset,
      hasChanges: false,
      error: result.error,
    };
  }

  return {
    problems: result.problems,
    reviewLog: result.reviewLog,
    reviewEvents: result.reviewEvents,
    preferences: result.preferences,
    problemTombstones: result.problemTombstones,
    dataReset: result.dataReset,
    hasChanges: result.hasChanges,
    error: null,
  };
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
