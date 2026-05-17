export type Difficulty = "Easy" | "Medium" | "Hard";
export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "no_visible_submissions" | "rate_limited";
export type SubmissionStatus = "detected" | "linked_existing" | "pending" | "imported" | "ignored" | "rated";

export interface LeetCodeProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalSolved: number | null;
}

export interface SubmissionCandidate {
  leetcodeSubmissionId: string;
  titleSlug: string;
  title: string;
  submittedAt: string;
}

export interface QuestionMetadata {
  leetcodeNumber: number | null;
  title: string;
  difficulty: Difficulty | null;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleOptionsRequest(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export function unwrapSupabaseResult<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}

export function buildGraphQLRequestBody(query: string, variables: Record<string, unknown>): string {
  return JSON.stringify({ query, variables });
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

export function mapLeetCodeDifficulty(value: unknown): Difficulty | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (normalized === "easy") return "Easy";
  if (normalized === "medium") return "Medium";
  if (normalized === "hard") return "Hard";
  return null;
}

export function parseMatchedUser(payload: unknown): LeetCodeProfile | null {
  const matchedUser = (payload as { data?: { matchedUser?: unknown } })?.data?.matchedUser as
    | {
      username?: unknown;
      profile?: { realName?: unknown; userAvatar?: unknown };
      submitStats?: { acSubmissionNum?: Array<{ difficulty?: unknown; count?: unknown }> };
    }
    | null
    | undefined;

  if (!matchedUser || typeof matchedUser.username !== "string") return null;
  const allSolved = matchedUser.submitStats?.acSubmissionNum?.find((item) => item.difficulty === "All");
  return {
    username: matchedUser.username,
    displayName: typeof matchedUser.profile?.realName === "string" && matchedUser.profile.realName
      ? matchedUser.profile.realName
      : null,
    avatarUrl: typeof matchedUser.profile?.userAvatar === "string" && matchedUser.profile.userAvatar
      ? matchedUser.profile.userAvatar
      : null,
    totalSolved: typeof allSolved?.count === "number" ? allSolved.count : null,
  };
}

export function parseRecentAcSubmissions(payload: unknown): SubmissionCandidate[] {
  const rows = (payload as { data?: { recentAcSubmissionList?: unknown[] } })?.data?.recentAcSubmissionList ?? [];
  return rows.flatMap((row) => {
    const item = row as { id?: unknown; title?: unknown; titleSlug?: unknown; timestamp?: unknown };
    if (typeof item.titleSlug !== "string" || typeof item.title !== "string") return [];
    const timestampSeconds = Number(item.timestamp);
    if (!Number.isFinite(timestampSeconds)) return [];
    const submittedAt = new Date(timestampSeconds * 1000).toISOString();
    const rawId = typeof item.id === "string" || typeof item.id === "number" ? String(item.id) : "";
    return [{
      leetcodeSubmissionId: rawId || `${item.titleSlug}:${submittedAt}`,
      titleSlug: item.titleSlug,
      title: item.title,
      submittedAt,
    }];
  });
}

export function parseQuestionData(payload: unknown): QuestionMetadata | null {
  const question = (payload as { data?: { question?: unknown } })?.data?.question as
    | { questionFrontendId?: unknown; title?: unknown; difficulty?: unknown }
    | null
    | undefined;
  if (!question || typeof question.title !== "string") return null;
  const number = Number(question.questionFrontendId);
  return {
    leetcodeNumber: Number.isFinite(number) ? number : null,
    title: question.title,
    difficulty: mapLeetCodeDifficulty(question.difficulty),
  };
}

export function dedupeSubmissionCandidates(submissions: SubmissionCandidate[]): SubmissionCandidate[] {
  const seen = new Set<string>();
  const deduped: SubmissionCandidate[] = [];
  for (const submission of submissions) {
    if (seen.has(submission.leetcodeSubmissionId)) continue;
    seen.add(submission.leetcodeSubmissionId);
    deduped.push(submission);
  }
  return deduped;
}

export function resolveSyncedSubmissionState({
  existingStatus,
  existingProblemId,
  ignored,
  linkedProblemId,
}: {
  existingStatus: SubmissionStatus | null;
  existingProblemId: string | null;
  ignored: boolean;
  linkedProblemId: string | null;
}): { status: SubmissionStatus; problemId: string | null } {
  if (
    existingStatus === "imported" ||
    existingStatus === "rated" ||
    (existingStatus === "linked_existing" && existingProblemId)
  ) {
    return { status: existingStatus, problemId: existingProblemId };
  }
  if (existingStatus === "ignored" || ignored) {
    return { status: "ignored", problemId: existingProblemId };
  }
  if (linkedProblemId) {
    return { status: "linked_existing", problemId: linkedProblemId };
  }
  return { status: "detected", problemId: null };
}

export function mapLeetCodeError(error: unknown): { status: SyncStatus; message: string } {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : null;
  if (status === 429) {
    return {
      status: "rate_limited",
      message: "LeetCode rate limited the request. Try again later.",
    };
  }
  return {
    status: "error",
    message: "LeetCode activity sync failed. Try again later.",
  };
}

export const MATCHED_USER_QUERY = `
  query matchedUser($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        realName
        userAvatar
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

export const RECENT_ACCEPTED_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }
`;

export const QUESTION_DATA_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId
      title
      difficulty
    }
  }
`;
