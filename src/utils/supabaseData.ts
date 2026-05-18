import { supabase } from "./supabaseClient";
import { todayStr, utcToLocalDateStr } from "./dateHelpers";
import { getDefaultFiveStarStreak } from "./spacedRepetition";
import type {
  Problem,
  Confidence,
  Preferences,
  ReviewLogEntry,
  ReviewEvent,
  ReviewHistoryEntry,
  Difficulty,
  ProblemTombstone,
  DataReset,
} from "../types";

// ============================================================
// FIELD MAPPING: camelCase (localStorage) ↔ snake_case (Supabase)
// ============================================================

interface SnakeCaseProblem {
  id: string;
  title: string;
  leetcode_number: number | null;
  url: string | null;
  difficulty: string;
  patterns: string[];
  confidence: number;
  notes: string;
  date_added: string;
  last_reviewed: string | null;
  next_review_date: string;
  five_star_streak?: number | null;
  updated_at: string;
  exclude_from_review: boolean;
}

interface SnakeCaseProblemTombstone {
  user_id: string;
  problem_id: string;
  deleted_at: string;
  created_at?: string;
  updated_at?: string;
}

interface SnakeCaseDataReset {
  user_id: string;
  reset_at: string;
  created_at?: string;
  updated_at?: string;
}

interface ReviewEventRow {
  problem_id: string;
  new_confidence: number;
  patterns: string[] | null;
  review_date: string;
  created_at: string;
}

export function toSnakeCase(problem: Problem): SnakeCaseProblem {
  return {
    id: problem.id,
    title: problem.title,
    leetcode_number: problem.leetcodeNumber ?? null,
    url: problem.url ?? null,
    difficulty: problem.difficulty,
    patterns: problem.patterns,
    confidence: problem.confidence,
    notes: problem.notes ?? "",
    date_added: problem.dateAdded,
    last_reviewed: problem.lastReviewed ?? null,
    next_review_date: problem.nextReviewDate,
    five_star_streak: problem.fiveStarStreak ?? getDefaultFiveStarStreak(problem.confidence),
    updated_at: problem.updatedAt || new Date().toISOString(),
    exclude_from_review: problem.excludeFromReview ?? false,
  };
}

export function toCamelCase(row: SnakeCaseProblem): Problem {
  return {
    id: row.id,
    title: row.title,
    leetcodeNumber: row.leetcode_number ?? null,
    url: row.url ?? null,
    difficulty: row.difficulty as Difficulty,
    patterns: row.patterns ?? [],
    confidence: row.confidence as Confidence,
    notes: row.notes ?? "",
    dateAdded: row.date_added,
    lastReviewed: row.last_reviewed ?? null,
    nextReviewDate: row.next_review_date,
    fiveStarStreak: row.five_star_streak ?? getDefaultFiveStarStreak(row.confidence),
    updatedAt: row.updated_at || new Date().toISOString(),
    excludeFromReview: row.exclude_from_review ?? false,
  };
}

// ============================================================
// PROBLEMS
// ============================================================

export async function fetchProblems(userId: string): Promise<{ data: Problem[] | null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("problems")
      .select("*")
      .eq("user_id", userId);
    if (error) return { data: null, error };
    return { data: (data as SnakeCaseProblem[]).map(toCamelCase), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function upsertProblem(userId: string, problem: Problem): Promise<{ data: Problem | null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const row = {
      ...toSnakeCase(problem),
      user_id: userId,
    };
    const { data, error } = await supabase
      .from("problems")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: toCamelCase(data as SnakeCaseProblem), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function upsertProblems(userId: string, problems: Problem[]): Promise<{ data: Problem[] | null; error: unknown }> {
  if (!supabase || !problems.length) return { data: [], error: null };
  try {
    const rows = problems.map((p) => ({
      ...toSnakeCase(p),
      user_id: userId,
    }));
    const { data, error } = await supabase
      .from("problems")
      .upsert(rows, { onConflict: "id" })
      .select();
    if (error) return { data: null, error };
    return { data: (data as SnakeCaseProblem[]).map(toCamelCase), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteProblems(problemIds: string[]): Promise<{ error: unknown }> {
  if (!supabase || !problemIds.length) return { error: null };
  try {
    const { error } = await supabase
      .from("problems")
      .delete()
      .in("id", problemIds);
    return { error: error || null };
  } catch (err) {
    return { error: err };
  }
}

export async function deleteProblem(problemId: string): Promise<{ data: null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const { error } = await supabase
      .from("problems")
      .delete()
      .eq("id", problemId);
    return { data: null, error: error || null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ============================================================
// PROBLEM TOMBSTONES
// ============================================================

export async function fetchProblemTombstones(userId: string): Promise<{ data: ProblemTombstone[] | null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("problem_tombstones")
      .select("problem_id, deleted_at")
      .eq("user_id", userId)
      .order("deleted_at", { ascending: true });
    if (error) return { data: null, error };
    return {
      data: (data as SnakeCaseProblemTombstone[]).map((row) => ({
        problemId: row.problem_id,
        deletedAt: row.deleted_at,
      })),
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function upsertProblemTombstone(userId: string, tombstone: ProblemTombstone): Promise<{ error: unknown }> {
  if (!supabase) return { error: null };
  try {
    const row: SnakeCaseProblemTombstone = {
      user_id: userId,
      problem_id: tombstone.problemId,
      deleted_at: tombstone.deletedAt,
      updated_at: tombstone.deletedAt,
    };
    const { error } = await supabase
      .from("problem_tombstones")
      .upsert(row, { onConflict: "user_id,problem_id" });
    return { error: error || null };
  } catch (err) {
    return { error: err };
  }
}

export async function upsertProblemTombstones(userId: string, tombstones: ProblemTombstone[]): Promise<{ error: unknown }> {
  if (!supabase || !tombstones.length) return { error: null };
  try {
    const rows: SnakeCaseProblemTombstone[] = tombstones.map((t) => ({
      user_id: userId,
      problem_id: t.problemId,
      deleted_at: t.deletedAt,
      updated_at: t.deletedAt,
    }));
    const { error } = await supabase
      .from("problem_tombstones")
      .upsert(rows, { onConflict: "user_id,problem_id" });
    return { error: error || null };
  } catch (err) {
    return { error: err };
  }
}

// ============================================================
// DATA RESET MARKER
// ============================================================

export async function fetchDataReset(userId: string): Promise<{ data: DataReset | null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("user_data_resets")
      .select("reset_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };
    const row = data as SnakeCaseDataReset;
    return { data: { resetAt: row.reset_at }, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function upsertDataReset(userId: string, reset: DataReset): Promise<{ error: unknown }> {
  if (!supabase) return { error: null };
  try {
    const row: SnakeCaseDataReset = {
      user_id: userId,
      reset_at: reset.resetAt,
      updated_at: reset.resetAt,
    };
    const { error } = await supabase
      .from("user_data_resets")
      .upsert(row, { onConflict: "user_id" });
    return { error: error || null };
  } catch (err) {
    return { error: err };
  }
}

// ============================================================
// REVIEW LOG
// ============================================================

export async function fetchReviewLog(userId: string): Promise<{ data: ReviewLogEntry[] | null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("review_log")
      .select("*")
      .eq("user_id", userId);
    if (error) return { data: null, error };
    // Convert to the shape localStorage uses: { date: "2026-02-19" }
    const log = (data as Array<{ review_date: string }>).map((row) => ({ date: row.review_date }));
    return { data: log, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function logReview(
  userId: string,
  problemId: string,
  oldConfidence: Confidence,
  newConfidence: Confidence,
  patterns: string[],
  timestamp?: string
): Promise<{ data: unknown; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const reviewTimestamp = timestamp ?? new Date().toISOString();
    const row: Record<string, unknown> = {
      user_id: userId,
      problem_id: problemId,
      old_confidence: oldConfidence,
      new_confidence: newConfidence,
      patterns,
      review_date: utcToLocalDateStr(reviewTimestamp) ?? todayStr(),
      created_at: reviewTimestamp,
    };
    const { data, error } = await supabase
      .from("review_log")
      .insert(row)
      .select()
      .single();
    return { data, error: error || null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function replaceReviewLog(
  userId: string,
  problemId: string,
  oldConfidence: Confidence,
  newConfidence: Confidence,
  patterns: string[],
  timestamp?: string
): Promise<{ data: unknown; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const reviewTimestamp = timestamp ?? new Date().toISOString();
    const reviewDate = utcToLocalDateStr(reviewTimestamp) ?? todayStr();
    const dedupeKey = `leetcode-rating:${userId}:${problemId}:${reviewDate}`;
    const { error: deleteError } = await supabase
      .from("review_log")
      .delete()
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .eq("review_date", reviewDate);

    if (deleteError) return { data: null, error: deleteError };

    const row: Record<string, unknown> = {
      user_id: userId,
      problem_id: problemId,
      old_confidence: oldConfidence,
      new_confidence: newConfidence,
      patterns,
      review_date: reviewDate,
      created_at: reviewTimestamp,
      dedupe_key: dedupeKey,
    };
    const { data, error } = await supabase
      .from("review_log")
      .upsert(row, { onConflict: "dedupe_key" })
      .select()
      .single();
    return { data, error: error || null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function fetchProblemReviewHistory(
  userId: string,
  problemId: string
): Promise<{ data: ReviewHistoryEntry[] | null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("review_log")
      .select("review_date, new_confidence, created_at")
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .order("created_at", { ascending: false });
    if (error) return { data: null, error };
    const history = (data as Array<{ review_date: string; new_confidence: number; created_at: string }>).map((row) => ({
      reviewDate: row.review_date,
      newConfidence: row.new_confidence,
      createdAt: row.created_at,
    }));
    return { data: history, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ============================================================
// REVIEW EVENTS (rich view of review_log for Progress tab)
// ============================================================

export async function fetchReviewEvents(
  userId: string,
  since?: string
): Promise<{ data: ReviewEvent[] | null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const PAGE_SIZE = 1000;
    const events: ReviewEvent[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase
        .from("review_log")
        .select("problem_id, new_confidence, patterns, review_date, created_at")
        .eq("user_id", userId);

      if (since) {
        query = query.gte("created_at", since);
      }

      const { data, error } = await query
        .order("created_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) return { data: null, error };

      const rows = (data ?? []) as ReviewEventRow[];
      events.push(...rows.map((row) => ({
        date: row.review_date,
        problemId: row.problem_id,
        confidence: row.new_confidence,
        patterns: row.patterns ?? [],
        timestamp: row.created_at,
      })));

      if (rows.length < PAGE_SIZE) break;
    }

    return { data: events, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function batchInsertReviewLogs(
  userId: string,
  events: ReviewEvent[]
): Promise<{ error: unknown }> {
  if (!supabase || !events.length) return { error: null };
  try {
    const rows = events.map((e) => ({
      user_id: userId,
      problem_id: e.problemId,
      old_confidence: null,
      new_confidence: e.confidence,
      patterns: e.patterns,
      review_date: e.date,
      created_at: e.timestamp,
    }));
    // Chunk into batches of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from("review_log").insert(chunk);
      if (error) return { error };
    }
    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

// ============================================================
// PREFERENCES
// ============================================================

export async function fetchPreferences(userId: string): Promise<{ data: Preferences | null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };
    return {
      data: {
        dailyReviewGoal: (data as { daily_review_goal: number }).daily_review_goal,
        hidePatternsDuringReview: (data as { hide_patterns_during_review?: boolean }).hide_patterns_during_review ?? false,
        enabledExtraPatterns: (data as { enabled_extra_patterns?: string[] }).enabled_extra_patterns ?? [],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ============================================================
// BULK DELETE (clear all user data)
// ============================================================

export async function deleteAllUserProblems(userId: string): Promise<{ error: unknown }> {
  if (!supabase) return { error: null };
  try {
    const { error } = await supabase
      .from("problems")
      .delete()
      .eq("user_id", userId);
    return { error: error || null };
  } catch (err) {
    return { error: err };
  }
}

export async function deleteAllUserReviewLog(userId: string): Promise<{ error: unknown }> {
  if (!supabase) return { error: null };
  try {
    const { error } = await supabase
      .from("review_log")
      .delete()
      .eq("user_id", userId);
    return { error: error || null };
  } catch (err) {
    return { error: err };
  }
}

// ============================================================
// FEEDBACK
// ============================================================

export async function submitFeedback(userId: string | null, message: string): Promise<{ error: unknown }> {
  if (!supabase) return { error: new Error("Supabase not configured") };
  try {
    const { error } = await supabase
      .from("feedback")
      .insert({
        user_id: userId || null,
        message: message.trim(),
      });
    return { error: error || null };
  } catch (err) {
    return { error: err };
  }
}

export async function upsertPreferences(userId: string, prefs: Preferences): Promise<{ data: Preferences | null; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const row = {
      user_id: userId,
      daily_review_goal: prefs.dailyReviewGoal,
      hide_patterns_during_review: prefs.hidePatternsDuringReview,
      enabled_extra_patterns: prefs.enabledExtraPatterns,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(row, { onConflict: "user_id" })
      .select()
      .single();
    if (error) return { data: null, error };
    return {
      data: {
        dailyReviewGoal: (data as { daily_review_goal: number }).daily_review_goal,
        hidePatternsDuringReview: (data as { hide_patterns_during_review?: boolean }).hide_patterns_during_review ?? false,
        enabledExtraPatterns: (data as { enabled_extra_patterns?: string[] }).enabled_extra_patterns ?? [],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}
