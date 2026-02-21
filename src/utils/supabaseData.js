import { supabase } from "./supabaseClient";

// ============================================================
// FIELD MAPPING: camelCase (localStorage) ↔ snake_case (Supabase)
// ============================================================

function toSnakeCase(problem) {
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
  };
}

function toCamelCase(row) {
  return {
    id: row.id,
    title: row.title,
    leetcodeNumber: row.leetcode_number || null,
    url: row.url || null,
    difficulty: row.difficulty,
    patterns: row.patterns || [],
    confidence: row.confidence,
    notes: row.notes || "",
    dateAdded: row.date_added,
    lastReviewed: row.last_reviewed || null,
    nextReviewDate: row.next_review_date,
    updatedAt: row.updated_at || null,
  };
}

// ============================================================
// PROBLEMS
// ============================================================

export async function fetchProblems(userId) {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("problems")
      .select("*")
      .eq("user_id", userId);
    if (error) return { data: null, error };
    return { data: data.map(toCamelCase), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function upsertProblem(userId, problem) {
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
    return { data: toCamelCase(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteProblem(problemId) {
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

export async function fetchReviewLog(userId) {
  if (!supabase) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from("review_log")
      .select("*")
      .eq("user_id", userId);
    if (error) return { data: null, error };
    // Convert to the shape localStorage uses: { date: "2026-02-19" }
    const log = data.map((row) => ({ date: row.review_date }));
    return { data: log, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function logReview(userId, problemId, oldConfidence, newConfidence) {
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

// ============================================================
// PREFERENCES
// ============================================================

export async function fetchPreferences(userId) {
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
      data: { dailyReviewGoal: data.daily_review_goal },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ============================================================
// FEEDBACK
// ============================================================

export async function submitFeedback(userId, message) {
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

export async function upsertPreferences(userId, prefs) {
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
      data: { dailyReviewGoal: data.daily_review_goal },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}
