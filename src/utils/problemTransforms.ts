import { todayStr, addDays, generateId } from "@patternbank/core";
import { getIntervalDays, getNextFiveStarStreak, getReviewIntervalDays } from "@patternbank/core";
import { countReviewedToday } from "./storage";
import { buildLeetCodeUrl } from "@patternbank/core";
import type { Problem, LeetCodeProblem, Confidence } from "../types";

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
  existingProblems: Problem[]
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
  { today, now, dailyGoal, patternMap }: BuildNewProblemsOptions
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

/**
 * Merge imported problems with existing ones by id.
 */
export function mergeImportedProblems(
  existingProblems: Problem[],
  importedProblems: Problem[]
): { mergedProblems: Problem[]; addedCount: number; updatedCount: number } {
  const existing = new Map(existingProblems.map((p) => [p.id, p]));
  let added = 0;
  let updated = 0;
  importedProblems.forEach((p) => {
    if (existing.has(p.id)) {
      const current = existing.get(p.id)!;
      if (p.updatedAt > current.updatedAt) {
        existing.set(p.id, p);
        updated++;
      }
    } else {
      existing.set(p.id, p);
      added++;
    }
  });
  return {
    mergedProblems: Array.from(existing.values()),
    addedCount: added,
    updatedCount: updated,
  };
}

/**
 * Compute review progress toward the daily goal.
 */
export function computeReviewProgress(
  problems: Problem[],
  dailyReviewGoal: number
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
  today: string
): string {
  const confidenceChanged =
    initialData != null && newConfidence !== initialData.confidence;
  if (!initialData || confidenceChanged) {
    return addDays(today, getIntervalDays(newConfidence));
  }
  return initialData.nextReviewDate;
}
