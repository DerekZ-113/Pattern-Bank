import { getDefaultFiveStarStreak } from "../spacedRepetition";
import type { CoreHooks } from "../hooks";
import type { Confidence, CorePreferences, Difficulty, Problem } from "../types";

// ============================================================
// FIELD MAPPING: camelCase (local storage) ↔ snake_case (Supabase)
// ============================================================

export interface ProblemRow {
  id: string;
  user_id: string;
  title: string;
  leetcode_number: number | null;
  url: string | null;
  difficulty: string;
  patterns: string[];
  confidence: number;
  notes: string;
  exclude_from_review: boolean;
  date_added: string;
  last_reviewed: string | null;
  next_review_date: string;
  five_star_streak?: number | null;
  /** F-14: always a string on write; reads are validated with an epoch fallback. */
  updated_at: string;
}

export interface ProblemTombstoneRow {
  user_id: string;
  problem_id: string;
  deleted_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface DataResetRow {
  user_id: string;
  reset_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReviewEventRow {
  problem_id: string;
  new_confidence: number;
  patterns: string[] | null;
  review_date: string;
  created_at: string;
}

/**
 * The subset of preferences that syncs to Supabase. Platforms may extend
 * their local Preferences (mobile adds notification fields) — only these
 * fields travel to the cloud. `updatedAt` powers newest-wins merge (F-6).
 */
export type CloudPreferences = Pick<
  CorePreferences,
  "dailyReviewGoal" | "hidePatternsDuringReview" | "enabledExtraPatterns" | "updatedAt"
>;

export function toCloudPreferences(data: Record<string, unknown>): CloudPreferences {
  const prefs: CloudPreferences = {
    dailyReviewGoal: data.daily_review_goal as number,
    hidePatternsDuringReview: (data.hide_patterns_during_review as boolean) ?? false,
    enabledExtraPatterns: (data.enabled_extra_patterns as string[]) ?? [],
  };
  if (typeof data.updated_at === "string") {
    prefs.updatedAt = data.updated_at;
  }
  return prefs;
}

/** F-8: deterministic dedupe key shared by logReview and batch review-log inserts. */
export function reviewDedupeKey(userId: string, problemId: string, timestamp: string): string {
  return `review:${userId}:${problemId}:${timestamp}`;
}

const EPOCH_ISO = new Date(0).toISOString();

/**
 * F-14: a cloud row missing (or carrying an unparseable) `updated_at` falls
 * back to the epoch — never a silent `now()`, which would make the corrupt
 * row win last-write-wins merges — and reports through the `warn` hook.
 */
function validateUpdatedAt(row: Record<string, unknown>, warn?: CoreHooks["warn"]): string {
  const value = row.updated_at;
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  warn?.("Supabase problem row has a missing or invalid updated_at; treating it as epoch", {
    id: row.id,
    updated_at: value,
  });
  return EPOCH_ISO;
}

export function toSnakeCase(problem: Problem): Omit<ProblemRow, "user_id"> {
  return {
    id: problem.id,
    title: problem.title,
    leetcode_number: problem.leetcodeNumber ?? null,
    url: problem.url ?? null,
    difficulty: problem.difficulty,
    patterns: problem.patterns,
    confidence: problem.confidence,
    notes: problem.notes ?? "",
    exclude_from_review: problem.excludeFromReview ?? false,
    date_added: problem.dateAdded,
    last_reviewed: problem.lastReviewed ?? null,
    next_review_date: problem.nextReviewDate,
    five_star_streak: problem.fiveStarStreak ?? getDefaultFiveStarStreak(problem.confidence),
    updated_at: problem.updatedAt || new Date().toISOString(),
  };
}

export function toCamelCase(
  row: Record<string, unknown>,
  hooks?: Pick<CoreHooks, "warn">,
): Problem {
  return {
    id: row.id as string,
    title: row.title as string,
    leetcodeNumber: (row.leetcode_number as number | null) ?? null,
    url: (row.url as string | null) ?? null,
    difficulty: row.difficulty as Difficulty,
    patterns: (row.patterns as string[]) ?? [],
    confidence: row.confidence as Confidence,
    notes: (row.notes as string) ?? "",
    excludeFromReview: (row.exclude_from_review as boolean) ?? false,
    dateAdded: row.date_added as string,
    lastReviewed: (row.last_reviewed as string | null) ?? null,
    nextReviewDate: row.next_review_date as string,
    fiveStarStreak:
      (row.five_star_streak as number | null | undefined) ??
      getDefaultFiveStarStreak(row.confidence as number),
    updatedAt: validateUpdatedAt(row, hooks?.warn),
  };
}
