import { createSupabaseMock, type SupabaseMock } from "./helpers/supabaseMock";
import type { LeetCodeConnection, LeetCodeIgnoredImport, LeetCodeSubmission } from "../src/types";

let mockSupabase: (SupabaseMock & {
  functions: { invoke: ReturnType<typeof vi.fn> };
  limit: ReturnType<typeof vi.fn>;
}) | null = null;

vi.mock("../src/utils/supabaseClient", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

function createLeetCodeSupabaseMock(result: { data?: unknown; error?: unknown } = {}) {
  const mock = createSupabaseMock(result) as SupabaseMock & {
    functions: { invoke: ReturnType<typeof vi.fn> };
    limit: ReturnType<typeof vi.fn>;
  };
  mock.functions = { invoke: vi.fn() };
  mock.limit = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return mock;
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

describe("leetcodeActivityData", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSupabase = createLeetCodeSupabaseMock();
  });

  it("maps LeetCode connection rows to camelCase and preserves no_visible_submissions", async () => {
    const { toLeetCodeConnection } = await import("../src/utils/leetcodeActivityData");

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

  it("maps LeetCode submission rows to camelCase", async () => {
    const { toLeetCodeSubmission } = await import("../src/utils/leetcodeActivityData");

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

  it("maps ignored import rows to camelCase", async () => {
    const { toLeetCodeIgnoredImport } = await import("../src/utils/leetcodeActivityData");

    const ignored = toLeetCodeIgnoredImport(ignoredImportRow);

    expect(ignored).toEqual<LeetCodeIgnoredImport>({
      userId: "user-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      ignoredAt: "2026-05-15T09:00:00.000Z",
      createdAt: "2026-05-15T09:00:00.000Z",
    });
  });

  it("normalizes usernames and pasted public profile URLs", async () => {
    const { normalizeLeetCodeUsername } = await import("../src/utils/leetcodeActivityData");

    expect(normalizeLeetCodeUsername("  derek113  ")).toBe("derek113");
    expect(normalizeLeetCodeUsername("https://leetcode.com/u/derek113/")).toBe("derek113");
    expect(normalizeLeetCodeUsername("https://leetcode.com/derek113")).toBe("derek113");
  });

  it("sanitizes raw errors for user-facing display", async () => {
    const { sanitizeLeetCodeActivityError } = await import("../src/utils/leetcodeActivityData");

    expect(sanitizeLeetCodeActivityError(new Error("SERVICE_ROLE_KEY missing"))).toBe(
      "LeetCode activity sync failed. Try again later.",
    );
    expect(sanitizeLeetCodeActivityError({ message: "Invalid LeetCode username." })).toBe(
      "Invalid LeetCode username.",
    );
  });

  it("fetches the signed-in user's connection from Supabase", async () => {
    const { fetchLeetCodeConnection } = await import("../src/utils/leetcodeActivityData");
    mockSupabase!.maybeSingle.mockResolvedValue({ data: connectionRow, error: null });

    const result = await fetchLeetCodeConnection("user-1");

    expect(mockSupabase!.from).toHaveBeenCalledWith("leetcode_connections");
    expect(mockSupabase!.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result.error).toBeNull();
    expect(result.data?.leetcodeUsername).toBe("derek113");
  });

  it("fetches recent submissions with a limit", async () => {
    const { fetchRecentLeetCodeSubmissions } = await import("../src/utils/leetcodeActivityData");
    mockSupabase!.limit.mockResolvedValue({ data: [submissionRow], error: null });

    const result = await fetchRecentLeetCodeSubmissions("user-1", 10);

    expect(mockSupabase!.from).toHaveBeenCalledWith("leetcode_submissions");
    expect(mockSupabase!.order).toHaveBeenCalledWith("submitted_at", { ascending: false });
    expect(mockSupabase!.limit).toHaveBeenCalledWith(10);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].status).toBe("linked_existing");
  });

  it("fetches ignored imports for the signed-in user", async () => {
    const { fetchLeetCodeIgnoredImports } = await import("../src/utils/leetcodeActivityData");
    mockSupabase!.order.mockResolvedValue({ data: [ignoredImportRow], error: null });

    const result = await fetchLeetCodeIgnoredImports("user-1");

    expect(mockSupabase!.from).toHaveBeenCalledWith("leetcode_ignored_imports");
    expect(mockSupabase!.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result.error).toBeNull();
    expect(result.data?.[0].titleSlug).toBe("two-sum");
  });

  it("invokes Edge Function actions through Supabase functions.invoke", async () => {
    const {
      connectLeetCodeActivity,
      syncLeetCodeActivity,
      disconnectLeetCodeActivity,
      markLeetCodeImportImported,
      markLeetCodeImportLinkedExisting,
      markLeetCodeSubmissionRated,
      ignoreLeetCodeImport,
      restoreIgnoredLeetCodeImport,
    } = await import("../src/utils/leetcodeActivityData");
    mockSupabase!.functions.invoke.mockResolvedValue({
      data: { connection: null, submissions: [], ignoredImports: [], summary: { insertedCount: 0 } },
      error: null,
    });

    await connectLeetCodeActivity(" https://leetcode.com/u/derek113/ ");
    await syncLeetCodeActivity(true);
    await disconnectLeetCodeActivity();
    await markLeetCodeImportImported("sub-db-1", "problem-1");
    await markLeetCodeImportLinkedExisting("sub-db-2", "problem-2");
    await ignoreLeetCodeImport("sub-db-3");
    await restoreIgnoredLeetCodeImport("two-sum");
    await markLeetCodeSubmissionRated("sub-db-4", "problem-4");

    expect(mockSupabase!.functions.invoke).toHaveBeenNthCalledWith(1, "sync-leetcode-activity", {
      body: { action: "connect", username: "derek113" },
    });
    expect(mockSupabase!.functions.invoke).toHaveBeenNthCalledWith(2, "sync-leetcode-activity", {
      body: { action: "sync", force: true },
    });
    expect(mockSupabase!.functions.invoke).toHaveBeenNthCalledWith(3, "sync-leetcode-activity", {
      body: { action: "disconnect" },
    });
    expect(mockSupabase!.functions.invoke).toHaveBeenNthCalledWith(4, "sync-leetcode-activity", {
      body: { action: "mark_imported", submissionDbId: "sub-db-1", problemId: "problem-1" },
    });
    expect(mockSupabase!.functions.invoke).toHaveBeenNthCalledWith(5, "sync-leetcode-activity", {
      body: { action: "mark_linked_existing", submissionDbId: "sub-db-2", problemId: "problem-2" },
    });
    expect(mockSupabase!.functions.invoke).toHaveBeenNthCalledWith(6, "sync-leetcode-activity", {
      body: { action: "ignore_import", submissionDbId: "sub-db-3" },
    });
    expect(mockSupabase!.functions.invoke).toHaveBeenNthCalledWith(7, "sync-leetcode-activity", {
      body: { action: "restore_ignored_import", titleSlug: "two-sum" },
    });
    expect(mockSupabase!.functions.invoke).toHaveBeenNthCalledWith(8, "sync-leetcode-activity", {
      body: { action: "mark_rated", submissionDbId: "sub-db-4", problemId: "problem-4" },
    });
  });
});
