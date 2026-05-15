import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  MATCHED_USER_QUERY,
  QUESTION_DATA_QUERY,
  RECENT_ACCEPTED_QUERY,
  buildGraphQLRequestBody,
  dedupeSubmissionCandidates,
  handleOptionsRequest,
  jsonResponse,
  mapLeetCodeError,
  normalizeLeetCodeUsername,
  parseMatchedUser,
  parseQuestionData,
  parseRecentAcSubmissions,
  type LeetCodeProfile,
  type QuestionMetadata,
  type SubmissionCandidate,
  type SyncStatus,
} from "./leetcode.ts";

type RequestBody =
  | { action: "validate"; username: string }
  | { action: "connect"; username: string }
  | { action: "sync"; force?: boolean }
  | { action: "disconnect" };

interface ConnectionRow {
  user_id: string;
  leetcode_username: string;
  leetcode_display_name?: string | null;
  leetcode_avatar_url?: string | null;
  leetcode_total_solved?: number | null;
  last_seen_accepted_count?: number | null;
  last_synced_at?: string | null;
  last_sync_started_at?: string | null;
  sync_status: SyncStatus;
  sync_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const ONE_HOUR_MS = 60 * 60 * 1000;

function toConnection(row: ConnectionRow | null) {
  if (!row) return null;
  return {
    userId: row.user_id,
    leetcodeUsername: row.leetcode_username,
    leetcodeDisplayName: row.leetcode_display_name ?? null,
    leetcodeAvatarUrl: row.leetcode_avatar_url ?? null,
    leetcodeTotalSolved: row.leetcode_total_solved ?? null,
    lastSeenAcceptedCount: row.last_seen_accepted_count ?? null,
    lastSyncedAt: row.last_synced_at ?? null,
    lastSyncStartedAt: row.last_sync_started_at ?? null,
    syncStatus: row.sync_status,
    syncError: row.sync_error ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSubmission(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    leetcodeUsername: row.leetcode_username,
    leetcodeSubmissionId: row.leetcode_submission_id,
    titleSlug: row.title_slug,
    title: row.title,
    leetcodeNumber: row.leetcode_number ?? null,
    difficulty: row.difficulty ?? null,
    submittedAt: row.submitted_at,
    problemId: row.problem_id ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchLeetCode(query: string, variables: Record<string, unknown>) {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": "https://leetcode.com",
      "User-Agent": "PatternBank/2.0",
    },
    body: buildGraphQLRequestBody(query, variables),
  });
  if (!response.ok) {
    throw { status: response.status };
  }
  return response.json();
}

async function fetchProfile(username: string): Promise<LeetCodeProfile | null> {
  const payload = await fetchLeetCode(MATCHED_USER_QUERY, { username });
  return parseMatchedUser(payload);
}

async function fetchRecentAccepted(username: string): Promise<SubmissionCandidate[]> {
  const payload = await fetchLeetCode(RECENT_ACCEPTED_QUERY, { username, limit: 20 });
  return dedupeSubmissionCandidates(parseRecentAcSubmissions(payload));
}

async function fetchQuestionMetadata(titleSlug: string): Promise<QuestionMetadata | null> {
  const payload = await fetchLeetCode(QUESTION_DATA_QUERY, { titleSlug });
  return parseQuestionData(payload);
}

async function requireUser(req: Request, serviceClient: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

async function updateConnection(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  updates: Partial<ConnectionRow>,
) {
  const { data, error } = await serviceClient
    .from("leetcode_connections")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as ConnectionRow | null;
}

async function upsertConnection(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  username: string,
  profile: LeetCodeProfile,
) {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient
    .from("leetcode_connections")
    .upsert({
      user_id: userId,
      leetcode_username: username,
      leetcode_display_name: profile.displayName,
      leetcode_avatar_url: profile.avatarUrl,
      leetcode_total_solved: profile.totalSolved,
      last_seen_accepted_count: profile.totalSolved,
      sync_status: "idle",
      sync_error: null,
      updated_at: now,
    }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data as ConnectionRow;
}

async function runSync(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  force: boolean,
) {
  const { data: connection, error: connectionError } = await serviceClient
    .from("leetcode_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection) {
    return {
      connection: null,
      submissions: [],
      summary: { fetchedCount: 0, insertedCount: 0, existingCount: 0, linkedExistingCount: 0 },
    };
  }

  const connectionRow = connection as ConnectionRow;
  if (
    !force &&
    connectionRow.last_synced_at &&
    Date.now() - new Date(connectionRow.last_synced_at).getTime() < ONE_HOUR_MS
  ) {
    const { data: submissions } = await serviceClient
      .from("leetcode_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(20);
    return {
      connection: toConnection(connectionRow),
      submissions: (submissions ?? []).map(toSubmission),
      summary: { fetchedCount: 0, insertedCount: 0, existingCount: 0, linkedExistingCount: 0, throttled: true },
    };
  }

  await updateConnection(serviceClient, userId, {
    sync_status: "syncing",
    sync_error: null,
    last_sync_started_at: new Date().toISOString(),
  });

  const submissions = await fetchRecentAccepted(connectionRow.leetcode_username);
  const lastSyncedAt = new Date().toISOString();
  if (submissions.length === 0) {
    const nextConnection = await updateConnection(serviceClient, userId, {
      sync_status: "no_visible_submissions",
      sync_error: "We could not see recent accepted submissions.",
      last_synced_at: lastSyncedAt,
    });
    return {
      connection: toConnection(nextConnection),
      submissions: [],
      summary: { fetchedCount: 0, insertedCount: 0, existingCount: 0, linkedExistingCount: 0, lastSyncedAt },
    };
  }

  const ids = submissions.map((item) => item.leetcodeSubmissionId);
  const { data: existingRows } = await serviceClient
    .from("leetcode_submissions")
    .select("leetcode_submission_id")
    .eq("user_id", userId)
    .in("leetcode_submission_id", ids);
  const existingIds = new Set((existingRows ?? []).map((row: { leetcode_submission_id: string }) => row.leetcode_submission_id));

  const metadataEntries = await Promise.all(
    Array.from(new Set(submissions.map((item) => item.titleSlug))).map(async (titleSlug) => [
      titleSlug,
      await fetchQuestionMetadata(titleSlug),
    ] as const),
  );
  const metadataBySlug = new Map(metadataEntries);
  const numbers = metadataEntries
    .map(([, metadata]) => metadata?.leetcodeNumber)
    .filter((number): number is number => typeof number === "number");

  const problemByNumber = new Map<number, string>();
  if (numbers.length > 0) {
    const { data: problems } = await serviceClient
      .from("problems")
      .select("id, leetcode_number")
      .eq("user_id", userId)
      .in("leetcode_number", numbers);
    for (const problem of problems ?? []) {
      if (typeof problem.leetcode_number === "number") {
        problemByNumber.set(problem.leetcode_number, problem.id);
      }
    }
  }

  const rows = submissions.map((submission) => {
    const metadata = metadataBySlug.get(submission.titleSlug) ?? null;
    const leetcodeNumber = metadata?.leetcodeNumber ?? null;
    const problemId = leetcodeNumber === null ? null : problemByNumber.get(leetcodeNumber) ?? null;
    return {
      user_id: userId,
      leetcode_username: connectionRow.leetcode_username,
      leetcode_submission_id: submission.leetcodeSubmissionId,
      title_slug: submission.titleSlug,
      title: metadata?.title ?? submission.title,
      leetcode_number: leetcodeNumber,
      difficulty: metadata?.difficulty ?? null,
      submitted_at: submission.submittedAt,
      problem_id: problemId,
      status: problemId ? "linked_existing" : "detected",
      updated_at: new Date().toISOString(),
    };
  });

  const { data: upsertedRows, error: upsertError } = await serviceClient
    .from("leetcode_submissions")
    .upsert(rows, { onConflict: "user_id,leetcode_submission_id" })
    .select("*")
    .order("submitted_at", { ascending: false });
  if (upsertError) throw upsertError;

  const linkedExistingCount = rows.filter((row) => row.problem_id).length;
  const nextConnection = await updateConnection(serviceClient, userId, {
    sync_status: "synced",
    sync_error: null,
    last_synced_at: lastSyncedAt,
  });

  return {
    connection: toConnection(nextConnection),
    submissions: (upsertedRows ?? []).map(toSubmission),
    summary: {
      fetchedCount: submissions.length,
      insertedCount: ids.filter((id) => !existingIds.has(id)).length,
      existingCount: ids.filter((id) => existingIds.has(id)).length,
      linkedExistingCount,
      lastSyncedAt,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptionsRequest();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing server-only Supabase service role configuration.");
    return jsonResponse({ error: "LeetCode activity sync failed. Try again later." }, { status: 500 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const user = await requireUser(req, serviceClient);
  if (!user) {
    return jsonResponse({ error: "Sign in to track LeetCode activity across devices." }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.action === "disconnect") {
      await serviceClient.from("leetcode_submissions").delete().eq("user_id", user.id);
      await serviceClient.from("leetcode_connections").delete().eq("user_id", user.id);
      return jsonResponse({ connection: null, submissions: [], summary: { insertedCount: 0 } });
    }

    if (body.action === "validate" || body.action === "connect") {
      const username = normalizeLeetCodeUsername(body.username);
      if (!username) {
        return jsonResponse({ error: "Invalid LeetCode username." }, { status: 400 });
      }
      const profile = await fetchProfile(username);
      if (!profile) {
        return jsonResponse({ error: "Invalid LeetCode username." }, { status: 400 });
      }
      if (body.action === "validate") {
        return jsonResponse({ profile, connection: null, submissions: [], summary: { insertedCount: 0 } });
      }
      await upsertConnection(serviceClient, user.id, username, profile);
      const syncResult = await runSync(serviceClient, user.id, true);
      return jsonResponse(syncResult);
    }

    if (body.action === "sync") {
      return jsonResponse(await runSync(serviceClient, user.id, body.force ?? false));
    }

    return jsonResponse({ error: "Invalid request." }, { status: 400 });
  } catch (error) {
    console.error("sync-leetcode-activity failed", error);
    const mapped = mapLeetCodeError(error);
    await updateConnection(serviceClient, user.id, {
      sync_status: mapped.status,
      sync_error: mapped.message,
      last_synced_at: new Date().toISOString(),
    }).catch((updateError) => console.error("Failed to update LeetCode sync error", updateError));
    return jsonResponse({ error: mapped.message }, { status: mapped.status === "rate_limited" ? 429 : 500 });
  }
});
