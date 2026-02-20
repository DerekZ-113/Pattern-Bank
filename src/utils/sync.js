import {
  fetchProblems,
  upsertProblem,
  deleteProblem as deleteFromSupabase,
  fetchReviewLog,
  logReview,
  fetchPreferences,
  upsertPreferences,
} from "./supabaseData";

// ============================================================
// SYNC ON SIGN-IN
// ============================================================
// Called once when auth state changes to signed-in.
// Pulls from Supabase, merges with localStorage, pushes merged result to both.
// Returns { problems, reviewLog, preferences } — the merged data.

export async function syncOnSignIn(userId, localProblems, localReviewLog, localPreferences) {
  try {
    // 1. Fetch everything from Supabase in parallel
    const [cloudProblemsRes, cloudLogRes, cloudPrefsRes] = await Promise.all([
      fetchProblems(userId),
      fetchReviewLog(userId),
      fetchPreferences(userId),
    ]);

    // If any fetch failed critically, return local data unchanged
    if (cloudProblemsRes.error) {
      console.error("Sync: failed to fetch problems", cloudProblemsRes.error);
      return { problems: localProblems, reviewLog: localReviewLog, preferences: localPreferences, error: cloudProblemsRes.error };
    }

    const cloudProblems = cloudProblemsRes.data || [];
    const cloudLog = cloudLogRes.data || [];
    const cloudPrefs = cloudPrefsRes.data;

    // 2. Merge problems
    const mergedProblems = mergeProblems(localProblems, cloudProblems);

    // 3. Merge review log (deduplicate by date)
    const mergedLog = mergeReviewLog(localReviewLog, cloudLog);

    // 4. Merge preferences
    // If Supabase has preferences, use those (cloud state).
    // If not (first sign-in), push localStorage preferences to Supabase.
    let mergedPreferences;
    if (cloudPrefs) {
      mergedPreferences = cloudPrefs;
    } else {
      mergedPreferences = localPreferences;
      // First sign-in — push local preferences to cloud
      await upsertPreferences(userId, localPreferences);
    }

    // 5. Push merged problems to Supabase
    // Problems only in localStorage need to be uploaded
    const cloudIds = new Set(cloudProblems.map((p) => p.id));
    const toUpload = mergedProblems.filter((p) => !cloudIds.has(p.id));
    for (const problem of toUpload) {
      await upsertProblem(userId, problem);
    }

    // Problems only in Supabase are already in mergedProblems (added during merge)
    // Problems in both — localStorage wins, push local version to cloud
    const localIds = new Set(localProblems.map((p) => p.id));
    const inBoth = mergedProblems.filter(
      (p) => cloudIds.has(p.id) && localIds.has(p.id)
    );
    for (const problem of inBoth) {
      await upsertProblem(userId, problem);
    }

    return {
      problems: mergedProblems,
      reviewLog: mergedLog,
      preferences: mergedPreferences,
      error: null,
    };
  } catch (err) {
    console.error("Sync: unexpected error", err);
    return {
      problems: localProblems,
      reviewLog: localReviewLog,
      preferences: localPreferences,
      error: err,
    };
  }
}

// ============================================================
// MERGE HELPERS
// ============================================================

function mergeProblems(localProblems, cloudProblems) {
  const localMap = new Map(localProblems.map((p) => [p.id, p]));
  const cloudMap = new Map(cloudProblems.map((p) => [p.id, p]));
  const merged = new Map();

  // Start with all local problems (localStorage wins on conflict)
  // TODO Sprint 5: use updatedAt for timestamp-based conflict resolution
  for (const [id, problem] of localMap) {
    merged.set(id, problem);
  }

  // Add problems only in cloud
  for (const [id, problem] of cloudMap) {
    if (!merged.has(id)) {
      merged.set(id, problem);
    }
    // If in both, localStorage version already in merged — skip
  }

  return Array.from(merged.values());
}

function mergeReviewLog(localLog, cloudLog) {
  // Deduplicate by date — we only need one entry per date for streak calculation
  const dates = new Set();
  const merged = [];

  for (const entry of localLog) {
    if (!dates.has(entry.date)) {
      dates.add(entry.date);
      merged.push(entry);
    }
  }

  for (const entry of cloudLog) {
    if (!dates.has(entry.date)) {
      dates.add(entry.date);
      merged.push(entry);
    }
  }

  return merged;
}

// ============================================================
// FIRE-AND-FORGET PUSH FUNCTIONS
// ============================================================
// Called after every local write when authenticated.
// Errors are logged but never thrown — localStorage is the source of truth.

export async function pushProblemToCloud(userId, problem) {
  const { error } = await upsertProblem(userId, problem);
  if (error) console.error("Cloud push failed (problem):", error);
}

export async function deleteProblemFromCloud(problemId) {
  const { error } = await deleteFromSupabase(problemId);
  if (error) console.error("Cloud push failed (delete):", error);
}

export async function pushReviewToCloud(userId, problemId, oldConfidence, newConfidence) {
  const { error } = await logReview(userId, problemId, oldConfidence, newConfidence);
  if (error) console.error("Cloud push failed (review):", error);
}

export async function pushPreferencesToCloud(userId, prefs) {
  const { error } = await upsertPreferences(userId, prefs);
  if (error) console.error("Cloud push failed (preferences):", error);
}
