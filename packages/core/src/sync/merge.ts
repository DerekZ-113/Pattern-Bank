import { timestampMs, utcToLocalDateStr } from "../dateHelpers";
import type {
  DataReset,
  Problem,
  ProblemTombstone,
  ReviewEvent,
  ReviewLogEntry,
} from "../types";

// All timestamp comparisons in this module go through timestampMs (F-17):
// malformed/missing values collapse to the epoch so the side with a valid
// timestamp deterministically wins and ties resolve local-first.

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

  for (const [id, problem] of localMap) {
    merged.set(id, problem);
  }

  for (const [id, problem] of cloudMap) {
    if (!merged.has(id)) {
      merged.set(id, problem);
      cloudAdded++;
      continue;
    }
    const local = localMap.get(id)!;
    if (timestampMs(problem.updatedAt) > timestampMs(local.updatedAt)) {
      merged.set(id, problem);
      cloudWon++;
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
  cloudTombstones: ProblemTombstone[],
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
    if (timestampMs(tombstone.deletedAt) > timestampMs(existing.deletedAt)) {
      merged.set(tombstone.problemId, tombstone);
      if (localMap.has(tombstone.problemId)) addedFromCloud++;
    }
  }

  return { tombstones: Array.from(merged.values()), addedFromCloud };
}

export function filterTombstonedProblems(problems: Problem[], tombstones: ProblemTombstone[]): Problem[] {
  if (tombstones.length === 0) return problems;
  const deletedIds = new Set(tombstones.map((t) => t.problemId));
  return problems.filter((p) => !deletedIds.has(p.id));
}

export interface MergeReviewLogResult {
  log: ReviewLogEntry[];
  addedFromCloud: number;
}

export function mergeReviewLog(localLog: ReviewLogEntry[], cloudLog: ReviewLogEntry[]): MergeReviewLogResult {
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
// DATA-RESET FILTERS
// ============================================================

export function dataResetTime(reset: DataReset | null | undefined): number {
  return timestampMs(reset?.resetAt);
}

export function compareDataResets(
  localReset: DataReset | null,
  cloudReset: DataReset | null,
): "local" | "cloud" | "none" {
  const localTime = dataResetTime(localReset);
  const cloudTime = dataResetTime(cloudReset);
  if (localTime > cloudTime) return "local";
  if (cloudTime > localTime) return "cloud";
  return "none";
}

export function newestDataReset(localReset: DataReset | null, cloudReset: DataReset | null): DataReset | null {
  return compareDataResets(localReset, cloudReset) === "cloud" ? cloudReset : localReset;
}

export function filterProblemsAfterDataReset(
  problems: Problem[],
  reset: DataReset | null,
): { problems: Problem[]; removedIds: string[] } {
  const cutoff = dataResetTime(reset);
  if (cutoff === 0) return { problems, removedIds: [] };

  const kept: Problem[] = [];
  const removedIds: string[] = [];
  for (const problem of problems) {
    if (timestampMs(problem.updatedAt) > cutoff) {
      kept.push(problem);
    } else {
      removedIds.push(problem.id);
    }
  }
  return { problems: kept, removedIds };
}

export function filterReviewEventsAfterDataReset(events: ReviewEvent[], reset: DataReset | null): ReviewEvent[] {
  const cutoff = dataResetTime(reset);
  if (cutoff === 0) return events;
  return events.filter((event) => timestampMs(event.timestamp) > cutoff);
}

/**
 * F-20: review-log entries are date-only, so compare against the LOCAL date of
 * the reset. `>=` keeps legitimate same-day post-clear reviews; the plain
 * date-string compare avoids rebuilding the log from events (which would churn
 * under mobile's 180-day event retention).
 */
export function filterReviewLogAfterDataReset(
  log: ReviewLogEntry[],
  reset: DataReset | null,
): ReviewLogEntry[] {
  if (dataResetTime(reset) === 0) return log;
  const resetDate = utcToLocalDateStr(reset!.resetAt);
  if (!resetDate) return log;
  return log.filter((entry) => entry.date >= resetDate);
}

export function filterTombstonesAfterDataReset(
  tombstones: ProblemTombstone[],
  reset: DataReset | null,
): ProblemTombstone[] {
  const cutoff = dataResetTime(reset);
  if (cutoff === 0) return tombstones;
  return tombstones.filter((tombstone) => timestampMs(tombstone.deletedAt) > cutoff);
}

export function reviewLogFromEvents(events: ReviewEvent[]): ReviewLogEntry[] {
  const dates = new Set<string>();
  const log: ReviewLogEntry[] = [];
  for (const event of events) {
    if (dates.has(event.date)) continue;
    dates.add(event.date);
    log.push({ date: event.date });
  }
  return log;
}

/** F-7: review events whose problem did not survive the merge are orphans. */
export function filterReviewEventsToProblems(events: ReviewEvent[], problemIds: Set<string>): ReviewEvent[] {
  return events.filter((event) => problemIds.has(event.problemId));
}
