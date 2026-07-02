import { todayStr, addDays } from "../dateHelpers";
import type { Problem, ReviewEvent, ReviewLogEntry } from "../types";

export function calculateStreak(log: ReviewLogEntry[]): number {
  if (log.length === 0) return 0;
  const dates = new Set(log.map((e) => e.date));
  let streak = 0;
  let checkDate = todayStr();
  if (!dates.has(checkDate)) {
    checkDate = addDays(checkDate, -1);
    if (!dates.has(checkDate)) return 0;
  }
  while (dates.has(checkDate)) {
    streak++;
    checkDate = addDays(checkDate, -1);
  }
  return streak;
}

export function countReviewedToday(problems: Problem[]): number {
  const today = todayStr();
  return problems.filter((p) => p.lastReviewed === today).length;
}

export interface PruneOldEventsOptions {
  /** Days of history to keep; null/undefined disables pruning entirely (web). */
  retentionDays?: number | null;
  today?: string;
}

export interface PruneOldEventsResult {
  kept: ReviewEvent[];
  /**
   * F-3 watermark: the YYYY-MM-DD cutoff (events with date >= cutoff are kept),
   * or null when pruning is disabled. Platforms persist this under
   * REVIEW_EVENTS_PRUNED_BEFORE_KEY so merges can drop pre-cutoff cloud events.
   */
  cutoffIso: string | null;
}

/**
 * Pure prune (F-3): no persistence side effects; callers save `kept` and the
 * watermark explicitly as a post-sync maintenance step, never on load.
 */
export function pruneOldEvents(
  events: ReviewEvent[],
  { retentionDays, today = todayStr() }: PruneOldEventsOptions,
): PruneOldEventsResult {
  if (retentionDays == null) {
    return { kept: events, cutoffIso: null };
  }
  const cutoff = addDays(today, -retentionDays);
  return { kept: events.filter((e) => e.date >= cutoff), cutoffIso: cutoff };
}
