import type { SupabaseClient } from "@supabase/supabase-js";
import { todayStr, utcToLocalDateStr } from "../dateHelpers";
import { CLOUD_OPERATION_TIMEOUT_MS, withTimeout } from "../syncTimeout";
import type { CoreHooks } from "../hooks";
import type {
  Confidence,
  DataReset,
  Problem,
  ProblemTombstone,
  ReviewEvent,
  ReviewHistoryEntry,
  ReviewLogEntry,
} from "../types";
import {
  reviewDedupeKey,
  toCamelCase,
  toCloudPreferences,
  toSnakeCase,
  type CloudPreferences,
  type DataResetRow,
  type ProblemTombstoneRow,
  type ReviewEventRow,
} from "./mapping";

export interface CreateCloudDataOptions {
  /**
   * Platform Supabase client. May be null (missing credentials) — every
   * returned function then no-ops with its `{ data: null, error: null }`-style
   * guard shape, exactly as both platforms behave today.
   */
  supabase: SupabaseClient | null;
  hooks?: CoreHooks;
  /** Per-operation cloud timeout (F-9). */
  timeoutMs?: number;
}

export interface CloudData {
  fetchProblems(userId: string): Promise<{ data: Problem[] | null; error: unknown }>;
  upsertProblem(userId: string, problem: Problem): Promise<{ data: Problem | null; error: unknown }>;
  upsertProblems(userId: string, problems: Problem[]): Promise<{ data: Problem[] | null; error: unknown }>;
  deleteProblem(problemId: string): Promise<{ data: null; error: unknown }>;
  deleteProblems(problemIds: string[]): Promise<{ error: unknown }>;
  fetchProblemTombstones(userId: string): Promise<{ data: ProblemTombstone[] | null; error: unknown }>;
  upsertProblemTombstone(userId: string, tombstone: ProblemTombstone): Promise<{ error: unknown }>;
  upsertProblemTombstones(userId: string, tombstones: ProblemTombstone[]): Promise<{ error: unknown }>;
  fetchDataReset(userId: string): Promise<{ data: DataReset | null; error: unknown }>;
  upsertDataReset(userId: string, reset: DataReset): Promise<{ error: unknown }>;
  fetchReviewLog(userId: string): Promise<{ data: ReviewLogEntry[] | null; error: unknown }>;
  logReview(
    userId: string,
    problemId: string,
    oldConfidence: Confidence,
    newConfidence: Confidence,
    patterns?: string[],
    timestamp?: string,
  ): Promise<{ data: unknown; error: unknown }>;
  replaceReviewLog(
    userId: string,
    problemId: string,
    oldConfidence: Confidence,
    newConfidence: Confidence,
    patterns: string[],
    timestamp?: string,
  ): Promise<{ data: unknown; error: unknown }>;
  fetchReviewEvents(userId: string, since?: string): Promise<{ data: ReviewEvent[] | null; error: unknown }>;
  batchInsertReviewLogs(userId: string, events: ReviewEvent[]): Promise<{ error: unknown }>;
  fetchProblemReviewHistory(
    userId: string,
    problemId: string,
  ): Promise<{ data: ReviewHistoryEntry[] | null; error: unknown }>;
  fetchPreferences(userId: string): Promise<{ data: CloudPreferences | null; error: unknown }>;
  upsertPreferences(
    userId: string,
    prefs: CloudPreferences,
  ): Promise<{ data: CloudPreferences | null; error: unknown }>;
  submitFeedback(userId: string | null, message: string): Promise<{ error: unknown }>;
  deleteAllUserProblems(userId: string): Promise<{ error: unknown }>;
  deleteAllUserReviewLog(userId: string): Promise<{ error: unknown }>;
}

export function createCloudData(options: CreateCloudDataOptions): CloudData {
  const { supabase, hooks = {}, timeoutMs = CLOUD_OPERATION_TIMEOUT_MS } = options;

  const timed = <T>(operation: string, promise: PromiseLike<T>): Promise<T> =>
    withTimeout(promise, timeoutMs, operation);

  const rowToProblem = (row: Record<string, unknown>): Problem => toCamelCase(row, hooks);

  // ============================================================
  // PROBLEMS
  // ============================================================

  async function fetchProblems(userId: string): Promise<{ data: Problem[] | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const { data, error } = await timed(
        "fetch problems",
        supabase
          .from("problems")
          .select("*")
          .eq("user_id", userId),
      );
      if (error) return { data: null, error };
      return { data: (data as Record<string, unknown>[]).map(rowToProblem), error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function upsertProblem(userId: string, problem: Problem): Promise<{ data: Problem | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const row = {
        ...toSnakeCase(problem),
        user_id: userId,
      };
      const { data, error } = await timed(
        "upsert problem",
        supabase
          .from("problems")
          .upsert(row, { onConflict: "id" })
          .select()
          .single(),
      );
      if (error) return { data: null, error };
      return { data: rowToProblem(data as Record<string, unknown>), error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function upsertProblems(userId: string, problems: Problem[]): Promise<{ data: Problem[] | null; error: unknown }> {
    if (!supabase || !problems.length) return { data: [], error: null };
    try {
      const rows = problems.map((p) => ({
        ...toSnakeCase(p),
        user_id: userId,
      }));
      const { data, error } = await timed(
        "upsert problems",
        supabase
          .from("problems")
          .upsert(rows, { onConflict: "id" })
          .select(),
      );
      if (error) return { data: null, error };
      return { data: (data as Record<string, unknown>[]).map(rowToProblem), error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function deleteProblem(problemId: string): Promise<{ data: null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const { error } = await timed(
        "delete problem",
        supabase
          .from("problems")
          .delete()
          .eq("id", problemId),
      );
      return { data: null, error: error || null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function deleteProblems(problemIds: string[]): Promise<{ error: unknown }> {
    if (!supabase || !problemIds.length) return { error: null };
    try {
      const { error } = await timed(
        "delete problems",
        supabase
          .from("problems")
          .delete()
          .in("id", problemIds),
      );
      return { error: error || null };
    } catch (err) {
      return { error: err };
    }
  }

  // ============================================================
  // PROBLEM TOMBSTONES
  // ============================================================

  async function fetchProblemTombstones(userId: string): Promise<{ data: ProblemTombstone[] | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const { data, error } = await timed(
        "fetch problem tombstones",
        supabase
          .from("problem_tombstones")
          .select("problem_id, deleted_at")
          .eq("user_id", userId)
          .order("deleted_at", { ascending: true }),
      );
      if (error) return { data: null, error };
      return {
        data: (data as ProblemTombstoneRow[]).map((row) => ({
          problemId: row.problem_id,
          deletedAt: row.deleted_at,
        })),
        error: null,
      };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function upsertProblemTombstone(userId: string, tombstone: ProblemTombstone): Promise<{ error: unknown }> {
    if (!supabase) return { error: null };
    try {
      const row: ProblemTombstoneRow = {
        user_id: userId,
        problem_id: tombstone.problemId,
        deleted_at: tombstone.deletedAt,
        updated_at: tombstone.deletedAt,
      };
      const { error } = await timed(
        "upsert problem tombstone",
        supabase
          .from("problem_tombstones")
          .upsert(row, { onConflict: "user_id,problem_id" }),
      );
      return { error: error || null };
    } catch (err) {
      return { error: err };
    }
  }

  async function upsertProblemTombstones(userId: string, tombstones: ProblemTombstone[]): Promise<{ error: unknown }> {
    if (!supabase || !tombstones.length) return { error: null };
    try {
      const rows: ProblemTombstoneRow[] = tombstones.map((t) => ({
        user_id: userId,
        problem_id: t.problemId,
        deleted_at: t.deletedAt,
        updated_at: t.deletedAt,
      }));
      const { error } = await timed(
        "upsert problem tombstones",
        supabase
          .from("problem_tombstones")
          .upsert(rows, { onConflict: "user_id,problem_id" }),
      );
      return { error: error || null };
    } catch (err) {
      return { error: err };
    }
  }

  // ============================================================
  // DATA RESET MARKER
  // ============================================================

  async function fetchDataReset(userId: string): Promise<{ data: DataReset | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const { data, error } = await timed(
        "fetch data reset",
        supabase
          .from("user_data_resets")
          .select("reset_at")
          .eq("user_id", userId)
          .maybeSingle(),
      );
      if (error) return { data: null, error };
      if (!data) return { data: null, error: null };
      return { data: { resetAt: (data as DataResetRow).reset_at }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function upsertDataReset(userId: string, reset: DataReset): Promise<{ error: unknown }> {
    if (!supabase) return { error: null };
    try {
      const row: DataResetRow = {
        user_id: userId,
        reset_at: reset.resetAt,
        updated_at: reset.resetAt,
      };
      const { error } = await timed(
        "upsert data reset",
        supabase
          .from("user_data_resets")
          .upsert(row, { onConflict: "user_id" }),
      );
      return { error: error || null };
    } catch (err) {
      return { error: err };
    }
  }

  // ============================================================
  // REVIEW LOG
  // ============================================================

  async function fetchReviewLog(userId: string): Promise<{ data: ReviewLogEntry[] | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const { data, error } = await timed(
        "fetch review log",
        supabase
          .from("review_log")
          .select("*")
          .eq("user_id", userId),
      );
      if (error) return { data: null, error };
      // Convert to the shape local storage uses: { date: "2026-02-19" }
      const log: ReviewLogEntry[] = (data as Array<{ review_date: string }>).map((row) => ({
        date: row.review_date,
      }));
      return { data: log, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function logReview(
    userId: string,
    problemId: string,
    oldConfidence: Confidence,
    newConfidence: Confidence,
    patterns: string[] = [],
    timestamp?: string,
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
        dedupe_key: reviewDedupeKey(userId, problemId, reviewTimestamp),
      };
      const { data, error } = await timed(
        "log review",
        supabase
          .from("review_log")
          .upsert(row, { onConflict: "dedupe_key" })
          .select()
          .single(),
      );
      return { data, error: error || null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function replaceReviewLog(
    userId: string,
    problemId: string,
    oldConfidence: Confidence,
    newConfidence: Confidence,
    patterns: string[],
    timestamp?: string,
  ): Promise<{ data: unknown; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const reviewTimestamp = timestamp ?? new Date().toISOString();
      const reviewDate = utcToLocalDateStr(reviewTimestamp) ?? todayStr();
      const dedupeKey = `leetcode-rating:${userId}:${problemId}:${reviewDate}`;

      const { error: deleteError } = await timed(
        "delete same-day review log",
        supabase
          .from("review_log")
          .delete()
          .eq("user_id", userId)
          .eq("problem_id", problemId)
          .eq("review_date", reviewDate),
      );
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
      const { data, error } = await timed(
        "replace review log",
        supabase
          .from("review_log")
          .upsert(row, { onConflict: "dedupe_key" })
          .select()
          .single(),
      );
      return { data, error: error || null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function fetchReviewEvents(
    userId: string,
    since?: string,
  ): Promise<{ data: ReviewEvent[] | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const pageSize = 1000;
      const rows: ReviewEventRow[] = [];

      for (let from = 0; ; from += pageSize) {
        let query = supabase
          .from("review_log")
          .select("problem_id, new_confidence, patterns, review_date, created_at")
          .eq("user_id", userId);

        if (since) {
          query = query.gte("created_at", since);
        }

        const { data, error } = await timed(
          "fetch review events",
          query
            .order("created_at", { ascending: true })
            .range(from, from + pageSize - 1),
        );
        if (error) return { data: null, error };

        const page = (data ?? []) as ReviewEventRow[];
        rows.push(...page);
        if (page.length < pageSize) break;
      }

      const events: ReviewEvent[] = rows.map((row) => ({
        date: row.review_date,
        problemId: row.problem_id,
        confidence: row.new_confidence,
        patterns: row.patterns ?? [],
        timestamp: row.created_at,
      }));
      return { data: events, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function batchInsertReviewLogs(userId: string, events: ReviewEvent[]): Promise<{ error: unknown }> {
    if (!supabase || !events.length) return { error: null };
    try {
      const rows = events.map((event) => ({
        user_id: userId,
        problem_id: event.problemId,
        old_confidence: null,
        new_confidence: event.confidence,
        patterns: event.patterns,
        review_date: event.date,
        created_at: event.timestamp,
        dedupe_key: reviewDedupeKey(userId, event.problemId, event.timestamp),
      }));
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const { error } = await timed(
          "batch insert review logs",
          supabase
            .from("review_log")
            .upsert(rows.slice(i, i + chunkSize), { onConflict: "dedupe_key" }),
        );
        if (error) return { error };
      }
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }

  async function fetchProblemReviewHistory(
    userId: string,
    problemId: string,
  ): Promise<{ data: ReviewHistoryEntry[] | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const { data, error } = await timed(
        "fetch problem review history",
        supabase
          .from("review_log")
          .select("review_date, new_confidence, created_at")
          .eq("user_id", userId)
          .eq("problem_id", problemId)
          .order("created_at", { ascending: false }),
      );
      if (error) return { data: null, error };
      const history: ReviewHistoryEntry[] = (
        data as Array<{ review_date: string; new_confidence: number; created_at: string }>
      ).map((row) => ({
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
  // PREFERENCES
  // ============================================================

  async function fetchPreferences(userId: string): Promise<{ data: CloudPreferences | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const { data, error } = await timed(
        "fetch preferences",
        supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
      );
      if (error) return { data: null, error };
      if (!data) return { data: null, error: null };
      return { data: toCloudPreferences(data as Record<string, unknown>), error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function upsertPreferences(
    userId: string,
    prefs: CloudPreferences,
  ): Promise<{ data: CloudPreferences | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const row = {
        user_id: userId,
        daily_review_goal: prefs.dailyReviewGoal,
        hide_patterns_during_review: prefs.hidePatternsDuringReview,
        enabled_extra_patterns: prefs.enabledExtraPatterns,
        updated_at: prefs.updatedAt ?? new Date().toISOString(),
      };
      const { data, error } = await timed(
        "upsert preferences",
        supabase
          .from("user_preferences")
          .upsert(row, { onConflict: "user_id" })
          .select()
          .single(),
      );
      if (error) return { data: null, error };
      return { data: toCloudPreferences(data as Record<string, unknown>), error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // ============================================================
  // FEEDBACK
  // ============================================================

  async function submitFeedback(userId: string | null, message: string): Promise<{ error: unknown }> {
    if (!supabase) return { error: new Error("Supabase not configured") };
    try {
      const { error } = await timed(
        "submit feedback",
        supabase
          .from("feedback")
          .insert({
            user_id: userId || null,
            message: message.trim(),
          }),
      );
      return { error: error || null };
    } catch (err) {
      return { error: err };
    }
  }

  // ============================================================
  // BULK DELETE (clear all user data)
  // ============================================================

  async function deleteAllUserProblems(userId: string): Promise<{ error: unknown }> {
    if (!supabase) return { error: null };
    try {
      const { error } = await timed(
        "delete all user problems",
        supabase.from("problems").delete().eq("user_id", userId),
      );
      return { error: error || null };
    } catch (err) {
      return { error: err };
    }
  }

  async function deleteAllUserReviewLog(userId: string): Promise<{ error: unknown }> {
    if (!supabase) return { error: null };
    try {
      const { error } = await timed(
        "delete all user review log",
        supabase.from("review_log").delete().eq("user_id", userId),
      );
      return { error: error || null };
    } catch (err) {
      return { error: err };
    }
  }

  return {
    fetchProblems,
    upsertProblem,
    upsertProblems,
    deleteProblem,
    deleteProblems,
    fetchProblemTombstones,
    upsertProblemTombstone,
    upsertProblemTombstones,
    fetchDataReset,
    upsertDataReset,
    fetchReviewLog,
    logReview,
    replaceReviewLog,
    fetchReviewEvents,
    batchInsertReviewLogs,
    fetchProblemReviewHistory,
    fetchPreferences,
    upsertPreferences,
    submitFeedback,
    deleteAllUserProblems,
    deleteAllUserReviewLog,
  };
}
