import { todayStr } from "./dateHelpers";
import type { Confidence, Problem } from "../types";

// Simplified SM-2 intervals based on confidence rating
// confidence 1 → 1 day, 2 → 1 day, 3 → 3 days, 4 → 7 days, 5 → 14 days
export const INTERVALS: Record<Confidence, number> = { 1: 1, 2: 1, 3: 3, 4: 7, 5: 14 };

export function getIntervalDays(confidence: Confidence): number {
  return INTERVALS[confidence] || 1;
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
export function prioritizeProblems(dueProblems: Problem[], limit: number): Problem[] {
  if (!dueProblems.length || limit <= 0) return [];

  const today = todayStr();

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
