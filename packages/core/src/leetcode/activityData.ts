import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLOUD_OPERATION_TIMEOUT_MS,
  LEETCODE_ACTIVITY_TIMEOUT_MS,
  withTimeout,
} from "../syncTimeout";
import type {
  Difficulty,
  LeetCodeConnection,
  LeetCodeIgnoredImport,
  LeetCodeSubmission,
  LeetCodeSubmissionStatus,
  LeetCodeSyncStatus,
  LeetCodeSyncSummary,
} from "../types";

export const LEETCODE_RECENT_ACTIVITY_LIMIT = 100;

export interface LeetCodeConnectionRow {
  user_id: string;
  leetcode_username: string;
  leetcode_display_name?: string | null;
  leetcode_avatar_url?: string | null;
  leetcode_total_solved?: number | null;
  last_seen_accepted_count?: number | null;
  last_synced_at?: string | null;
  last_sync_started_at?: string | null;
  sync_status: string;
  sync_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeetCodeSubmissionRow {
  id: string;
  user_id: string;
  leetcode_username: string;
  leetcode_submission_id: string;
  title_slug: string;
  title: string;
  leetcode_number?: number | null;
  difficulty?: string | null;
  submitted_at: string;
  problem_id?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeetCodeIgnoredImportRow {
  user_id: string;
  title_slug: string;
  leetcode_number?: number | null;
  ignored_at?: string;
  created_at?: string;
}

export interface LeetCodeActivityFunctionResponse {
  connection: LeetCodeConnection | null;
  submissions: LeetCodeSubmission[];
  ignoredImports: LeetCodeIgnoredImport[];
  summary: LeetCodeSyncSummary;
  error?: string;
}

export interface LeetCodeActivityResult {
  data: LeetCodeActivityFunctionResponse | null;
  error: string | null;
}

const SAFE_ERROR_MESSAGES = new Set([
  "Invalid LeetCode username.",
  "We could not see recent accepted submissions.",
  "LeetCode rate limited the request. Try again later.",
  "LeetCode activity sync failed. Try again later.",
  "Sign in to track LeetCode activity across devices.",
]);

function isLeetCodeSyncStatus(value: string): value is LeetCodeSyncStatus {
  return ["idle", "syncing", "synced", "error", "no_visible_submissions", "rate_limited"].includes(value);
}

function isLeetCodeSubmissionStatus(value: string): value is LeetCodeSubmissionStatus {
  return ["detected", "linked_existing", "pending", "imported", "ignored", "rated"].includes(value);
}

function isDifficulty(value: string | null | undefined): value is Difficulty {
  return value === "Easy" || value === "Medium" || value === "Hard";
}

export function normalizeLeetCodeUsername(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes("leetcode.com")) return trimmed;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "u" && parts[1]) return parts[1];
    if (parts[0] && !["problems", "contest", "discuss"].includes(parts[0])) return parts[0];
    return "";
  } catch {
    return trimmed.replace(/^@/, "");
  }
}

export function sanitizeLeetCodeActivityError(error: unknown): string {
  if (typeof error === "string" && SAFE_ERROR_MESSAGES.has(error)) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "");
    if (SAFE_ERROR_MESSAGES.has(message)) return message;
    if (/invalid leetcode username/i.test(message)) return "Invalid LeetCode username.";
    if (/rate limit|rate_limited|429/i.test(message)) return "LeetCode rate limited the request. Try again later.";
    // Keep private_or_empty for older Edge responses from before the status rename.
    if (/no visible|private_or_empty|no_visible_submissions/i.test(message)) {
      return "We could not see recent accepted submissions.";
    }
  }
  return "LeetCode activity sync failed. Try again later.";
}

export function toLeetCodeConnection(row: LeetCodeConnectionRow): LeetCodeConnection {
  return {
    userId: row.user_id,
    leetcodeUsername: row.leetcode_username,
    leetcodeDisplayName: row.leetcode_display_name ?? null,
    leetcodeAvatarUrl: row.leetcode_avatar_url ?? null,
    leetcodeTotalSolved: row.leetcode_total_solved ?? null,
    lastSeenAcceptedCount: row.last_seen_accepted_count ?? null,
    lastSyncedAt: row.last_synced_at ?? null,
    lastSyncStartedAt: row.last_sync_started_at ?? null,
    syncStatus: isLeetCodeSyncStatus(row.sync_status) ? row.sync_status : "error",
    syncError: row.sync_error ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toLeetCodeSubmission(row: LeetCodeSubmissionRow): LeetCodeSubmission {
  return {
    id: row.id,
    userId: row.user_id,
    leetcodeUsername: row.leetcode_username,
    leetcodeSubmissionId: row.leetcode_submission_id,
    titleSlug: row.title_slug,
    title: row.title,
    leetcodeNumber: row.leetcode_number ?? null,
    difficulty: isDifficulty(row.difficulty) ? row.difficulty : null,
    submittedAt: row.submitted_at,
    problemId: row.problem_id ?? null,
    status: isLeetCodeSubmissionStatus(row.status) ? row.status : "detected",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toLeetCodeIgnoredImport(row: LeetCodeIgnoredImportRow): LeetCodeIgnoredImport {
  return {
    userId: row.user_id,
    titleSlug: row.title_slug,
    leetcodeNumber: row.leetcode_number ?? null,
    ignoredAt: row.ignored_at,
    createdAt: row.created_at,
  };
}

function normalizeFunctionResponse(data: unknown): LeetCodeActivityFunctionResponse {
  const payload = (data ?? {}) as Partial<LeetCodeActivityFunctionResponse>;
  return {
    connection: payload.connection ?? null,
    submissions: payload.submissions ?? [],
    ignoredImports: payload.ignoredImports ?? [],
    summary: payload.summary ?? {},
    error: payload.error,
  };
}

export interface CreateLeetCodeActivityDataOptions {
  /** Platform Supabase client; null falls back to the no-op guard shapes. */
  supabase: SupabaseClient | null;
  /** Per-operation timeout for table reads (F-9). */
  timeoutMs?: number;
  /** Timeout for the sync-leetcode-activity Edge Function invoke. */
  invokeTimeoutMs?: number;
}

export interface LeetCodeActivityData {
  fetchLeetCodeConnection(userId: string): Promise<{ data: LeetCodeConnection | null; error: unknown }>;
  fetchRecentLeetCodeSubmissions(
    userId: string,
    limit?: number,
  ): Promise<{ data: LeetCodeSubmission[] | null; error: unknown }>;
  fetchLeetCodeIgnoredImports(userId: string): Promise<{ data: LeetCodeIgnoredImport[] | null; error: unknown }>;
  connectLeetCodeActivity(username: string): Promise<LeetCodeActivityResult>;
  syncLeetCodeActivity(force?: boolean): Promise<LeetCodeActivityResult>;
  disconnectLeetCodeActivity(): Promise<LeetCodeActivityResult>;
  markLeetCodeImportImported(submissionDbId: string, problemId: string): Promise<LeetCodeActivityResult>;
  markLeetCodeImportLinkedExisting(submissionDbId: string, problemId: string): Promise<LeetCodeActivityResult>;
  ignoreLeetCodeImport(submissionDbId: string): Promise<LeetCodeActivityResult>;
  restoreIgnoredLeetCodeImport(titleSlug: string): Promise<LeetCodeActivityResult>;
  markLeetCodeSubmissionRated(submissionDbId: string, problemId: string): Promise<LeetCodeActivityResult>;
}

export function createLeetCodeActivityData(options: CreateLeetCodeActivityDataOptions): LeetCodeActivityData {
  const {
    supabase,
    timeoutMs = CLOUD_OPERATION_TIMEOUT_MS,
    invokeTimeoutMs = LEETCODE_ACTIVITY_TIMEOUT_MS,
  } = options;

  const timed = <T>(operation: string, promise: PromiseLike<T>): Promise<T> =>
    withTimeout(promise, timeoutMs, operation);

  async function fetchLeetCodeConnection(
    userId: string,
  ): Promise<{ data: LeetCodeConnection | null; error: unknown }> {
    if (!supabase) return { data: null, error: null };
    try {
      const { data, error } = await timed(
        "fetch LeetCode connection",
        supabase
          .from("leetcode_connections")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
      );
      if (error) return { data: null, error };
      return {
        data: data ? toLeetCodeConnection(data as LeetCodeConnectionRow) : null,
        error: null,
      };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function fetchRecentLeetCodeSubmissions(
    userId: string,
    limit = LEETCODE_RECENT_ACTIVITY_LIMIT,
  ): Promise<{ data: LeetCodeSubmission[] | null; error: unknown }> {
    if (!supabase) return { data: [], error: null };
    try {
      const { data, error } = await timed(
        "fetch LeetCode submissions",
        supabase
          .from("leetcode_submissions")
          .select("*")
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false })
          .limit(limit),
      );
      if (error) return { data: null, error };
      return {
        data: ((data ?? []) as LeetCodeSubmissionRow[]).map(toLeetCodeSubmission),
        error: null,
      };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function fetchLeetCodeIgnoredImports(
    userId: string,
  ): Promise<{ data: LeetCodeIgnoredImport[] | null; error: unknown }> {
    if (!supabase) return { data: [], error: null };
    try {
      const { data, error } = await timed(
        "fetch LeetCode ignored imports",
        supabase
          .from("leetcode_ignored_imports")
          .select("*")
          .eq("user_id", userId)
          .order("ignored_at", { ascending: false }),
      );
      if (error) return { data: null, error };
      return {
        data: ((data ?? []) as LeetCodeIgnoredImportRow[]).map(toLeetCodeIgnoredImport),
        error: null,
      };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function invokeLeetCodeActivity(body: Record<string, unknown>): Promise<LeetCodeActivityResult> {
    if (!supabase) {
      return { data: null, error: "LeetCode activity sync failed. Try again later." };
    }
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("sync-leetcode-activity", { body }),
        invokeTimeoutMs,
        "sync LeetCode activity",
      );
      if (error) return { data: null, error: sanitizeLeetCodeActivityError(error) };
      const normalized = normalizeFunctionResponse(data);
      if (normalized.error) {
        return { data: normalized, error: sanitizeLeetCodeActivityError(normalized.error) };
      }
      return { data: normalized, error: null };
    } catch (err) {
      return { data: null, error: sanitizeLeetCodeActivityError(err) };
    }
  }

  function connectLeetCodeActivity(username: string): Promise<LeetCodeActivityResult> {
    return invokeLeetCodeActivity({
      action: "connect",
      username: normalizeLeetCodeUsername(username),
    });
  }

  function syncLeetCodeActivity(force = false): Promise<LeetCodeActivityResult> {
    return invokeLeetCodeActivity({ action: "sync", force });
  }

  function disconnectLeetCodeActivity(): Promise<LeetCodeActivityResult> {
    return invokeLeetCodeActivity({ action: "disconnect" });
  }

  function markLeetCodeImportImported(
    submissionDbId: string,
    problemId: string,
  ): Promise<LeetCodeActivityResult> {
    return invokeLeetCodeActivity({ action: "mark_imported", submissionDbId, problemId });
  }

  function markLeetCodeImportLinkedExisting(
    submissionDbId: string,
    problemId: string,
  ): Promise<LeetCodeActivityResult> {
    return invokeLeetCodeActivity({ action: "mark_linked_existing", submissionDbId, problemId });
  }

  function ignoreLeetCodeImport(submissionDbId: string): Promise<LeetCodeActivityResult> {
    return invokeLeetCodeActivity({ action: "ignore_import", submissionDbId });
  }

  function restoreIgnoredLeetCodeImport(titleSlug: string): Promise<LeetCodeActivityResult> {
    return invokeLeetCodeActivity({ action: "restore_ignored_import", titleSlug });
  }

  function markLeetCodeSubmissionRated(
    submissionDbId: string,
    problemId: string,
  ): Promise<LeetCodeActivityResult> {
    return invokeLeetCodeActivity({ action: "mark_rated", submissionDbId, problemId });
  }

  return {
    fetchLeetCodeConnection,
    fetchRecentLeetCodeSubmissions,
    fetchLeetCodeIgnoredImports,
    connectLeetCodeActivity,
    syncLeetCodeActivity,
    disconnectLeetCodeActivity,
    markLeetCodeImportImported,
    markLeetCodeImportLinkedExisting,
    ignoreLeetCodeImport,
    restoreIgnoredLeetCodeImport,
    markLeetCodeSubmissionRated,
  };
}
