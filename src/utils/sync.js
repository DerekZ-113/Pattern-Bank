import {
  fetchProblems,
  upsertProblem,
  upsertProblems,
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

    // 5. Push merged problems to Supabase where needed (batched)
    const cloudIds = new Set(cloudProblems.map((p) => p.id));
    const localIds = new Set(localProblems.map((p) => p.id));
    const cloudMap = new Map(cloudProblems.map((p) => [p.id, p]));

    const problemsToPush = [];
    for (const problem of mergedProblems) {
      if (!cloudIds.has(problem.id)) {
        // Local-only — upload to cloud
        problemsToPush.push(problem);
      } else if (localIds.has(problem.id)) {
        // Exists in both — only push if local version won (is the merged version)
        const cloud = cloudMap.get(problem.id);
        const cloudTime = cloud.updatedAt ? new Date(cloud.updatedAt).getTime() : 0;
        const localTime = problem.updatedAt ? new Date(problem.updatedAt).getTime() : 0;
        if (localTime >= cloudTime) {
          problemsToPush.push(problem);
        }
      }
    }
    if (problemsToPush.length > 0) {
      await upsertProblems(userId, problemsToPush);
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

  // Add all local problems first
  for (const [id, problem] of localMap) {
    merged.set(id, problem);
  }

  // For cloud problems: add if local-only, or resolve conflict by updatedAt
  for (const [id, problem] of cloudMap) {
    if (!merged.has(id)) {
      // Cloud-only — add it
      merged.set(id, problem);
    } else {
      // Exists in both — compare updatedAt timestamps
      const local = localMap.get(id);
      const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
      const cloudTime = problem.updatedAt ? new Date(problem.updatedAt).getTime() : 0;

      // If cloud is newer, it wins. If equal or local newer or either missing, local wins (fallback).
      if (cloudTime > localTime) {
        merged.set(id, problem);
      }
    }
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

export async function pushProblemsToCloud(userId, problems) {
  if (!problems.length) return;
  const { error } = await upsertProblems(userId, problems);
  if (error) console.error("Cloud batch push failed:", error);
}

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
