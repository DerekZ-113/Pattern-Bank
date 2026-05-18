import { todayStr } from "./dateHelpers";
import type { Confidence, Problem } from "../types";

// V2 base intervals based on confidence rating.
// Explicit 5-star reviews can graduate beyond this base interval.
export const INTERVALS: Record<Confidence, number> = { 1: 1, 2: 2, 3: 5, 4: 10, 5: 30 };
export const FIVE_STAR_GRADUATION_INTERVALS = [30, 60, 120, 240, 365] as const;

export function getIntervalDays(confidence: Confidence): number {
  return INTERVALS[confidence] || 1;
}

export function getDefaultFiveStarStreak(confidence: number): number {
  return confidence === 5 ? 1 : 0;
}

export function getFiveStarGraduationIntervalDays(streak: number): number {
  if (streak <= 1) return FIVE_STAR_GRADUATION_INTERVALS[0];
  if (streak === 2) return FIVE_STAR_GRADUATION_INTERVALS[1];
  if (streak === 3) return FIVE_STAR_GRADUATION_INTERVALS[2];
  if (streak === 4) return FIVE_STAR_GRADUATION_INTERVALS[3];
  return FIVE_STAR_GRADUATION_INTERVALS[4];
}

export function getPreviousFiveStarStreak(problem: Problem): number {
  if (problem.confidence !== 5) return 0;
  return problem.fiveStarStreak ?? getDefaultFiveStarStreak(problem.confidence);
}

export function getNextFiveStarStreak(problem: Problem, newConfidence: Confidence): number {
  if (newConfidence !== 5) return 0;
  return getPreviousFiveStarStreak(problem) + 1;
}

export function getReviewIntervalDays(problem: Problem, newConfidence: Confidence): number {
  if (newConfidence !== 5) return getIntervalDays(newConfidence);
  return getFiveStarGraduationIntervalDays(getNextFiveStarStreak(problem, newConfidence));
}

// ============================================================
// Priority algorithm for daily review cap
// ============================================================

// Deterministic hash for stable per-day randomization.
// Same (id, date) pair always produces the same value.
// Different date = different order for tied problems.
function dailyHash(problemId: string, dateStr: string): number {
  const str = problemId + dateStr;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function calcDaysOverdue(nextReviewDate: string, today: string): number {
  const diff = new Date(today).getTime() - new Date(nextReviewDate).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

// Takes already-filtered due problems and returns the top `limit` by priority.
// Sort order:
//   1. Lowest confidence first (weakest problems surface first)
//   2. Most days overdue first (longest-waiting problems surface first)
//   3. Stable random tiebreaker (reshuffles daily, stable within a session)
export function prioritizeProblems(dueProblems: Problem[], limit: number, today = todayStr()): Problem[] {
  if (!dueProblems.length || limit <= 0) return [];

  const sorted = [...dueProblems].sort((a, b) => {
    // 1. Lowest confidence first
    const confDiff = (a.confidence || 3) - (b.confidence || 3);
    if (confDiff !== 0) return confDiff;

    // 2. Most overdue first
    const overdueDiff =
      calcDaysOverdue(b.nextReviewDate, today) -
      calcDaysOverdue(a.nextReviewDate, today);
    if (overdueDiff !== 0) return overdueDiff;

    // 3. Random tiebreaker, stable per-day
    return dailyHash(a.id, today) - dailyHash(b.id, today);
  });

  return sorted.slice(0, limit);
}
