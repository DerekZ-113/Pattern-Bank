import { todayStr, addDays, generateId } from "./dateHelpers";
import { getIntervalDays, getNextFiveStarStreak, getReviewIntervalDays } from "./spacedRepetition";
import { countReviewedToday } from "./storage/logic";
import { buildLeetCodeUrl } from "./leetcode/problems";
import type { Problem, LeetCodeProblem, Confidence } from "./types";

interface BuildNewProblemsOptions {
  today: string;
  now: string;
  dailyGoal: number;
  patternMap: Map<number, string[]> | null;
}

/**
 * Filter out LC problems that already exist in the user's library.
 */
export function filterExistingProblems(
  lcProblems: LeetCodeProblem[],
  existingProblems: Problem[],
): { newProblems: LeetCodeProblem[]; skippedCount: number } {
  const existingNums = new Set(
    existingProblems.map((p) => p.leetcodeNumber).filter(Boolean)
  );
  const newProblems = lcProblems.filter((lc) => !existingNums.has(lc.n));
  return { newProblems, skippedCount: lcProblems.length - newProblems.length };
}

/**
 * Round-robin interleave problems by difficulty (Easy, Medium, Hard).
 */
export function interleaveByDifficulty(lcProblems: LeetCodeProblem[]): LeetCodeProblem[] {
  const buckets: Record<string, LeetCodeProblem[]> = { Easy: [], Medium: [], Hard: [] };
  lcProblems.forEach((lc) => {
    const bucket = buckets[lc.d] || buckets.Medium;
    bucket.push(lc);
  });
  const interleaved: LeetCodeProblem[] = [];
  const keys = Object.keys(buckets).filter((k) => buckets[k].length > 0);
  let exhausted = false;
  while (!exhausted) {
    exhausted = true;
    for (const key of keys) {
      if (buckets[key].length > 0) {
        interleaved.push(buckets[key].shift()!);
        exhausted = false;
      }
    }
  }
  return interleaved;
}

/**
 * Build full problem objects from LC problem data, distributing review dates.
 */
export function buildNewProblems(
  lcProblems: LeetCodeProblem[],
  { today, now, dailyGoal, patternMap }: BuildNewProblemsOptions,
): Problem[] {
  return lcProblems.map((lc, i) => ({
    id: generateId(),
    title: lc.t,
    leetcodeNumber: lc.n,
    url: buildLeetCodeUrl(lc.s),
    difficulty: lc.d,
    patterns: patternMap?.get(lc.n) || [],
    confidence: 1 as Confidence,
    notes: "",
    excludeFromReview: false,
    dateAdded: today,
    lastReviewed: null,
    nextReviewDate: addDays(today, Math.floor(i / dailyGoal)),
    fiveStarStreak: 0,
    updatedAt: now,
  }));
}

interface RespreadScheduledOptions {
  dailyGoal: number;
  today: string;
  now: string;
}

/**
 * Re-pace never-reviewed, future-scheduled problems at dailyGoal per day —
 * the same distribution buildNewProblems applies at import. Today is only
 * topped up to the goal (due and reviewed-today problems already consume
 * slots), which makes the operation idempotent: re-running on an already
 * re-paced schedule changes nothing. Reviewed, excluded, and already-due
 * problems are left untouched; updatedAt is stamped only on rows whose date
 * actually moves (LWW).
 */
export function respreadScheduledProblems(
  problems: Problem[],
  { dailyGoal, today, now }: RespreadScheduledOptions,
): { problems: Problem[]; changedCount: number } {
  const candidates = problems.filter(
    (p) => p.lastReviewed === null && !p.excludeFromReview && p.nextReviewDate > today,
  );
  if (candidates.length === 0) return { problems, changedCount: 0 };

  const slotsUsedToday = problems.filter(
    (p) => !p.excludeFromReview && (p.nextReviewDate <= today || p.lastReviewed === today),
  ).length;
  const remainingToday = Math.max(0, dailyGoal - slotsUsedToday);

  const ordered = [...candidates].sort((a, b) =>
    a.nextReviewDate < b.nextReviewDate ? -1 : a.nextReviewDate > b.nextReviewDate ? 1 : 0,
  );
  const newDateById = new Map<string, string>();
  ordered.forEach((p, i) => {
    const day = i < remainingToday ? 0 : Math.floor((i - remainingToday) / dailyGoal) + 1;
    newDateById.set(p.id, addDays(today, day));
  });

  let changedCount = 0;
  const respread = problems.map((p) => {
    const newDate = newDateById.get(p.id);
    if (newDate === undefined || newDate === p.nextReviewDate) return p;
    changedCount++;
    return { ...p, nextReviewDate: newDate, updatedAt: now };
  });
  return changedCount === 0
    ? { problems, changedCount: 0 }
    : { problems: respread, changedCount };
}

/**
 * Deduplicate problems by leetcodeNumber, keeping the entry with the most recent updatedAt.
 * Problems without a leetcodeNumber are always kept.
 */
export function deduplicateProblems(
  problems: Problem[],
): { problems: Problem[]; removedIds: string[] } {
  const seen = new Map<number, Problem>();
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

function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Merge imported problems with existing ones by id, then by LeetCode number.
 * When a cross-device LeetCode match has a different local id, keep the local
 * canonical id so existing review history stays attached to the same problem.
 */
export function mergeImportedProblems(
  existingProblems: Problem[],
  importedProblems: Problem[],
): {
  mergedProblems: Problem[];
  addedCount: number;
  updatedCount: number;
  changedProblems: Problem[];
  importedIdToCanonicalId: Map<string, string>;
} {
  const existing = new Map(existingProblems.map((p) => [p.id, p]));
  const idByLeetCodeNumber = new Map<number, string>();
  existingProblems.forEach((problem) => {
    if (problem.leetcodeNumber != null && !idByLeetCodeNumber.has(problem.leetcodeNumber)) {
      idByLeetCodeNumber.set(problem.leetcodeNumber, problem.id);
    }
  });
  const importedIdToCanonicalId = new Map<string, string>();
  const changedProblems: Problem[] = [];
  let added = 0;
  let updated = 0;
  importedProblems.forEach((p) => {
    const numberMatchId = p.leetcodeNumber == null ? null : idByLeetCodeNumber.get(p.leetcodeNumber) ?? null;
    const current = existing.get(p.id) ?? (numberMatchId ? existing.get(numberMatchId) : undefined);
    const canonicalId = current?.id ?? p.id;
    importedIdToCanonicalId.set(p.id, canonicalId);
    if (current) {
      // Only overwrite if imported version is newer (matches mergeProblems in sync.ts)
      const currentTime = timestampMs(current.updatedAt);
      const importedTime = timestampMs(p.updatedAt);
      if (importedTime > currentTime) {
        const canonicalProblem = p.id === canonicalId ? p : { ...p, id: canonicalId };
        existing.set(canonicalId, canonicalProblem);
        if (canonicalProblem.leetcodeNumber != null) {
          idByLeetCodeNumber.set(canonicalProblem.leetcodeNumber, canonicalId);
        }
        changedProblems.push(canonicalProblem);
        updated++;
      }
    } else {
      existing.set(p.id, p);
      if (p.leetcodeNumber != null) {
        idByLeetCodeNumber.set(p.leetcodeNumber, p.id);
      }
      changedProblems.push(p);
      added++;
    }
  });
  return {
    mergedProblems: Array.from(existing.values()),
    addedCount: added,
    updatedCount: updated,
    changedProblems,
    importedIdToCanonicalId,
  };
}

/**
 * Compute review progress toward the daily goal.
 */
export function computeReviewProgress(
  problems: Problem[],
  dailyReviewGoal: number,
): { currentReviewed: number; totalDue: number; effectiveGoal: number } {
  const today = todayStr();
  const currentReviewed = countReviewedToday(problems);
  const totalDue = problems.filter((p) => p.nextReviewDate <= today && !p.excludeFromReview).length;
  const effectiveGoal = Math.min(dailyReviewGoal, totalDue + currentReviewed);
  return { currentReviewed, totalDue, effectiveGoal };
}

/**
 * Build an updated problem after a review with new confidence and dates.
 */
export function buildReviewedProblem(problem: Problem, newConfidence: Confidence): Problem {
  const today = todayStr();
  const intervalDays = getReviewIntervalDays(problem, newConfidence);
  const fiveStarStreak = getNextFiveStarStreak(problem, newConfidence);
  return {
    ...problem,
    confidence: newConfidence,
    fiveStarStreak,
    lastReviewed: today,
    nextReviewDate: addDays(today, intervalDays),
    updatedAt: new Date().toISOString(),
  };
}

// New problems and edits-with-changed-confidence reschedule from today.
// Cosmetic edits (notes/patterns/etc with same confidence) preserve the existing schedule.
export function computeNextReviewDate(
  initialData: Problem | null,
  newConfidence: Confidence,
  today: string,
): string {
  const confidenceChanged =
    initialData != null && newConfidence !== initialData.confidence;
  if (!initialData || confidenceChanged) {
    return addDays(today, getIntervalDays(newConfidence));
  }
  return initialData.nextReviewDate;
}
