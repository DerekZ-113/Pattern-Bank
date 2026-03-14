import { todayStr, addDays, generateId } from "./dateHelpers";
import { getIntervalDays } from "./spacedRepetition";
import { countReviewedToday } from "./storage";
import { buildLeetCodeUrl } from "./leetcodeProblems";

/**
 * Filter out LC problems that already exist in the user's library.
 */
export function filterExistingProblems(lcProblems, existingProblems) {
  const existingNums = new Set(
    existingProblems.map((p) => p.leetcodeNumber).filter(Boolean)
  );
  const newProblems = lcProblems.filter((lc) => !existingNums.has(lc.n));
  return { newProblems, skippedCount: lcProblems.length - newProblems.length };
}

/**
 * Round-robin interleave problems by difficulty (Easy, Medium, Hard).
 */
export function interleaveByDifficulty(lcProblems) {
  const buckets = { Easy: [], Medium: [], Hard: [] };
  lcProblems.forEach((lc) => {
    const bucket = buckets[lc.d] || buckets.Medium;
    bucket.push(lc);
  });
  const interleaved = [];
  const keys = Object.keys(buckets).filter((k) => buckets[k].length > 0);
  let exhausted = false;
  while (!exhausted) {
    exhausted = true;
    for (const key of keys) {
      if (buckets[key].length > 0) {
        interleaved.push(buckets[key].shift());
        exhausted = false;
      }
    }
  }
  return interleaved;
}

/**
 * Build full problem objects from LC problem data, distributing review dates.
 */
export function buildNewProblems(lcProblems, { today, now, dailyGoal, patternMap }) {
  return lcProblems.map((lc, i) => ({
    id: generateId(),
    title: lc.t,
    leetcodeNumber: lc.n,
    url: buildLeetCodeUrl(lc.s),
    difficulty: lc.d,
    patterns: patternMap?.get(lc.n) || [],
    confidence: 1,
    notes: "",
    excludeFromReview: false,
    dateAdded: today,
    lastReviewed: null,
    nextReviewDate: addDays(today, Math.floor(i / dailyGoal)),
    updatedAt: now,
  }));
}

/**
 * Merge imported problems with existing ones by id.
 */
export function mergeImportedProblems(existingProblems, importedProblems) {
  const existing = new Map(existingProblems.map((p) => [p.id, p]));
  let added = 0;
  let updated = 0;
  importedProblems.forEach((p) => {
    if (existing.has(p.id)) {
      existing.set(p.id, p);
      updated++;
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
export function computeReviewProgress(problems, dailyReviewGoal) {
  const today = todayStr();
  const currentReviewed = countReviewedToday(problems);
  const totalDue = problems.filter((p) => p.nextReviewDate <= today).length;
  const effectiveGoal = Math.min(dailyReviewGoal, totalDue + currentReviewed);
  return { currentReviewed, totalDue, effectiveGoal };
}

/**
 * Build an updated problem after a review with new confidence and dates.
 */
export function buildReviewedProblem(problem, newConfidence) {
  const today = todayStr();
  const intervalDays = getIntervalDays(newConfidence);
  return {
    ...problem,
    confidence: newConfidence,
    lastReviewed: today,
    nextReviewDate: addDays(today, intervalDays),
    updatedAt: new Date().toISOString(),
  };
}
