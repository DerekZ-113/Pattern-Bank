import { supabase } from "./supabaseClient";
import type { Problem, Confidence, Preferences, ReviewLogEntry, ReviewHistoryEntry, Difficulty } from "../types";

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
  updated_at: string;
  exclude_from_review: boolean;
}

function toSnakeCase(problem: Problem): SnakeCaseProblem {
  return {
    id: problem.id,
    title: problem.title,
    leetcode_number: problem.leetcodeNumber || null,
    url: problem.url || null,
    difficulty: problem.difficulty,
    patterns: problem.patterns,
    confidence: problem.confidence,
    notes: problem.notes || "",
    date_added: problem.dateAdded,
    last_reviewed: problem.lastReviewed || null,
    next_review_date: problem.nextReviewDate,
    updated_at: problem.updatedAt || new Date().toISOString(),
    exclude_from_review: problem.excludeFromReview || false,
  };
}

function toCamelCase(row: SnakeCaseProblem): Problem {
  return {
    id: row.id,
    title: row.title,
    leetcodeNumber: row.leetcode_number || null,
    url: row.url || null,
    difficulty: row.difficulty as Difficulty,
    patterns: row.patterns || [],
    confidence: row.confidence as Confidence,
    notes: row.notes || "",
    dateAdded: row.date_added,
    lastReviewed: row.last_reviewed || null,
    nextReviewDate: row.next_review_date,
    updatedAt: row.updated_at || new Date().toISOString(),
    excludeFromReview: row.exclude_from_review || false,
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
      updated_at: new Date().toISOString(),
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
      updated_at: new Date().toISOString(),
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
  newConfidence: Confidence
): Promise<{ data: unknown; error: unknown }> {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("review_log")
      .insert({
        user_id: userId,
        problem_id: problemId,
        old_confidence: oldConfidence,
        new_confidence: newConfidence,
      })
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
      data: { dailyReviewGoal: (data as { daily_review_goal: number }).daily_review_goal },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
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
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(row, { onConflict: "user_id" })
      .select()
      .single();
    if (error) return { data: null, error };
    return {
      data: { dailyReviewGoal: (data as { daily_review_goal: number }).daily_review_goal },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}
