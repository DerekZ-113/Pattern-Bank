import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createLeetCodeActivityData,
  normalizeLeetCodeUsername,
  sanitizeLeetCodeActivityError,
  toLeetCodeConnection,
  toLeetCodeSubmission,
  toLeetCodeIgnoredImport,
  LEETCODE_RECENT_ACTIVITY_LIMIT,
  type LeetCodeActivityData,
} from "../../src/leetcode/activityData";
import { asClient, createSupabaseMock, type SupabaseMock } from "../helpers/supabaseMock";
import type { LeetCodeConnection, LeetCodeIgnoredImport, LeetCodeSubmission } from "../../src/types";

function activity(mock: SupabaseMock | null): LeetCodeActivityData {
  return createLeetCodeActivityData({ supabase: asClient(mock) });
}

const connectionRow = {
  user_id: "user-1",
  leetcode_username: "derek113",
  leetcode_display_name: "Derek",
  leetcode_avatar_url: "https://assets.leetcode.com/avatar.png",
  leetcode_total_solved: 432,
  last_seen_accepted_count: 432,
  last_synced_at: "2026-05-15T10:00:00.000Z",
  last_sync_started_at: "2026-05-15T09:59:00.000Z",
  sync_status: "no_visible_submissions",
  sync_error: "No visible recent accepted submissions.",
  created_at: "2026-05-15T09:00:00.000Z",
  updated_at: "2026-05-15T10:00:00.000Z",
};

const submissionRow = {
  id: "sub-1",
  user_id: "user-1",
  leetcode_username: "derek113",
  leetcode_submission_id: "12345",
  title_slug: "two-sum",
  title: "Two Sum",
  leetcode_number: 1,
  difficulty: "Easy",
  submitted_at: "2026-05-15T08:00:00.000Z",
  problem_id: "problem-1",
  status: "linked_existing",
  created_at: "2026-05-15T08:05:00.000Z",
  updated_at: "2026-05-15T08:05:00.000Z",
};

const ignoredImportRow = {
  user_id: "user-1",
  title_slug: "two-sum",
  leetcode_number: 1,
  ignored_at: "2026-05-15T09:00:00.000Z",
  created_at: "2026-05-15T09:00:00.000Z",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("leetcodeActivityData mapping helpers", () => {
  it("maps LeetCode connection rows to camelCase and preserves no_visible_submissions", () => {
    const connection = toLeetCodeConnection(connectionRow);

    expect(connection).toEqual<LeetCodeConnection>({
      userId: "user-1",
      leetcodeUsername: "derek113",
      leetcodeDisplayName: "Derek",
      leetcodeAvatarUrl: "https://assets.leetcode.com/avatar.png",
      leetcodeTotalSolved: 432,
      lastSeenAcceptedCount: 432,
      lastSyncedAt: "2026-05-15T10:00:00.000Z",
      lastSyncStartedAt: "2026-05-15T09:59:00.000Z",
      syncStatus: "no_visible_submissions",
      syncError: "No visible recent accepted submissions.",
      createdAt: "2026-05-15T09:00:00.000Z",
      updatedAt: "2026-05-15T10:00:00.000Z",
    });
  });

  it("maps LeetCode submission rows to camelCase", () => {
    const submission = toLeetCodeSubmission(submissionRow);

    expect(submission).toEqual<LeetCodeSubmission>({
      id: "sub-1",
      userId: "user-1",
      leetcodeUsername: "derek113",
      leetcodeSubmissionId: "12345",
      titleSlug: "two-sum",
      title: "Two Sum",
      leetcodeNumber: 1,
      difficulty: "Easy",
      submittedAt: "2026-05-15T08:00:00.000Z",
      problemId: "problem-1",
      status: "linked_existing",
      createdAt: "2026-05-15T08:05:00.000Z",
      updatedAt: "2026-05-15T08:05:00.000Z",
    });
  });

  it("maps ignored import rows to camelCase", () => {
    const ignored = toLeetCodeIgnoredImport(ignoredImportRow);

    expect(ignored).toEqual<LeetCodeIgnoredImport>({
      userId: "user-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      ignoredAt: "2026-05-15T09:00:00.000Z",
      createdAt: "2026-05-15T09:00:00.000Z",
    });
  });

  it("normalizes usernames, @handles, and pasted public profile URLs", () => {
    expect(normalizeLeetCodeUsername("  derek113  ")).toBe("derek113");
    expect(normalizeLeetCodeUsername("@derek113")).toBe("derek113");
    expect(normalizeLeetCodeUsername("https://leetcode.com/u/derek113/")).toBe("derek113");
    expect(normalizeLeetCodeUsername("https://leetcode.com/derek113")).toBe("derek113");
    expect(normalizeLeetCodeUsername("https://example.com/u/derek113/")).toBe("https://example.com/u/derek113/");
  });

  it("sanitizes raw errors for user-facing display", () => {
    expect(sanitizeLeetCodeActivityError(new Error("SERVICE_ROLE_KEY missing"))).toBe(
      "LeetCode activity sync failed. Try again later.",
    );
    expect(sanitizeLeetCodeActivityError({ message: "Invalid LeetCode username." })).toBe(
      "Invalid LeetCode username.",
    );
    expect(sanitizeLeetCodeActivityError("Invalid LeetCode username.")).toBe("Invalid LeetCode username.");
    expect(sanitizeLeetCodeActivityError(new Error("429 rate limit"))).toBe(
      "LeetCode rate limited the request. Try again later.",
    );
    expect(sanitizeLeetCodeActivityError(new Error("private_or_empty"))).toBe(
      "We could not see recent accepted submissions.",
    );
    expect(sanitizeLeetCodeActivityError(new Error("postgres password leaked"))).toBe(
      "LeetCode activity sync failed. Try again later.",
    );
  });
});

describe("null-client guard shapes", () => {
  const data = activity(null);

  it("fetchLeetCodeConnection → { data: null, error: null }", async () => {
    expect(await data.fetchLeetCodeConnection("user-1")).toEqual({ data: null, error: null });
  });

  it("fetchRecentLeetCodeSubmissions → { data: [], error: null }", async () => {
    expect(await data.fetchRecentLeetCodeSubmissions("user-1")).toEqual({ data: [], error: null });
  });

  it("fetchLeetCodeIgnoredImports → { data: [], error: null }", async () => {
    expect(await data.fetchLeetCodeIgnoredImports("user-1")).toEqual({ data: [], error: null });
  });

  it("Edge Function actions → safe generic error", async () => {
    expect(await data.syncLeetCodeActivity()).toEqual({
      data: null,
      error: "LeetCode activity sync failed. Try again later.",
    });
    expect(await data.connectLeetCodeActivity("derek113")).toEqual({
      data: null,
      error: "LeetCode activity sync failed. Try again later.",
    });
  });
});

describe("leetcodeActivityData cloud reads", () => {
  it("fetches the signed-in user's connection from Supabase", async () => {
    const mock = createSupabaseMock({});
    mock.maybeSingle.mockResolvedValue({ data: connectionRow, error: null });

    const result = await activity(mock).fetchLeetCodeConnection("user-1");

    expect(mock.from).toHaveBeenCalledWith("leetcode_connections");
    expect(mock.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result.error).toBeNull();
    expect(result.data?.leetcodeUsername).toBe("derek113");
  });

  it("fetches recent submissions with a limit", async () => {
    const mock = createSupabaseMock({});
    mock.limit.mockResolvedValue({ data: [submissionRow], error: null });

    const result = await activity(mock).fetchRecentLeetCodeSubmissions("user-1", 10);

    expect(mock.from).toHaveBeenCalledWith("leetcode_submissions");
    expect(mock.order).toHaveBeenCalledWith("submitted_at", { ascending: false });
    expect(mock.limit).toHaveBeenCalledWith(10);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].status).toBe("linked_existing");
  });

  it("defaults recent submissions reads to the shared Today activity limit", async () => {
    const mock = createSupabaseMock({});
    mock.limit.mockResolvedValue({ data: [submissionRow], error: null });

    const result = await activity(mock).fetchRecentLeetCodeSubmissions("user-1");

    expect(LEETCODE_RECENT_ACTIVITY_LIMIT).toBe(100);
    expect(mock.limit).toHaveBeenCalledWith(100);
    expect(result.error).toBeNull();
  });

  it("fetches ignored imports for the signed-in user", async () => {
    const mock = createSupabaseMock({});
    mock.order.mockResolvedValue({ data: [ignoredImportRow], error: null });

    const result = await activity(mock).fetchLeetCodeIgnoredImports("user-1");

    expect(mock.from).toHaveBeenCalledWith("leetcode_ignored_imports");
    expect(mock.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result.error).toBeNull();
    expect(result.data?.[0].titleSlug).toBe("two-sum");
  });
});

describe("leetcodeActivityData Edge Function actions", () => {
  it("invokes Edge Function actions through Supabase functions.invoke", async () => {
    const mock = createSupabaseMock({});
    mock.functions.invoke.mockResolvedValue({
      data: { connection: null, submissions: [], ignoredImports: [], summary: { insertedCount: 0 } },
      error: null,
    });
    const data = activity(mock);

    await data.connectLeetCodeActivity(" https://leetcode.com/u/derek113/ ");
    await data.syncLeetCodeActivity(true);
    await data.disconnectLeetCodeActivity();
    await data.markLeetCodeImportImported("sub-db-1", "problem-1");
    await data.markLeetCodeImportLinkedExisting("sub-db-2", "problem-2");
    await data.ignoreLeetCodeImport("sub-db-3");
    await data.restoreIgnoredLeetCodeImport("two-sum");
    await data.markLeetCodeSubmissionRated("sub-db-4", "problem-4");

    expect(mock.functions.invoke).toHaveBeenNthCalledWith(1, "sync-leetcode-activity", {
      body: { action: "connect", username: "derek113" },
    });
    expect(mock.functions.invoke).toHaveBeenNthCalledWith(2, "sync-leetcode-activity", {
      body: { action: "sync", force: true },
    });
    expect(mock.functions.invoke).toHaveBeenNthCalledWith(3, "sync-leetcode-activity", {
      body: { action: "disconnect" },
    });
    expect(mock.functions.invoke).toHaveBeenNthCalledWith(4, "sync-leetcode-activity", {
      body: { action: "mark_imported", submissionDbId: "sub-db-1", problemId: "problem-1" },
    });
    expect(mock.functions.invoke).toHaveBeenNthCalledWith(5, "sync-leetcode-activity", {
      body: { action: "mark_linked_existing", submissionDbId: "sub-db-2", problemId: "problem-2" },
    });
    expect(mock.functions.invoke).toHaveBeenNthCalledWith(6, "sync-leetcode-activity", {
      body: { action: "ignore_import", submissionDbId: "sub-db-3" },
    });
    expect(mock.functions.invoke).toHaveBeenNthCalledWith(7, "sync-leetcode-activity", {
      body: { action: "restore_ignored_import", titleSlug: "two-sum" },
    });
    expect(mock.functions.invoke).toHaveBeenNthCalledWith(8, "sync-leetcode-activity", {
      body: { action: "mark_rated", submissionDbId: "sub-db-4", problemId: "problem-4" },
    });
  });

  it("times out hung Edge Function calls with a safe error (F-9)", async () => {
    vi.useFakeTimers();
    const mock = createSupabaseMock({});
    mock.functions.invoke.mockReturnValue(new Promise(() => undefined));

    const result = activity(mock).syncLeetCodeActivity(true);
    await vi.advanceTimersByTimeAsync(45_000);

    await expect(result).resolves.toEqual({
      data: null,
      error: "LeetCode activity sync failed. Try again later.",
    });
  });
});
