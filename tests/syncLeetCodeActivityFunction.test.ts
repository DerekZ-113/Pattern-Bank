import {
  buildGraphQLRequestBody,
  corsHeaders,
  dedupeSubmissionCandidates,
  resolveSyncedSubmissionState,
  handleOptionsRequest,
  mapLeetCodeDifficulty,
  mapLeetCodeError,
  parseMatchedUser,
  parseQuestionData,
  parseRecentAcSubmissions,
  unwrapSupabaseResult,
} from "../supabase/functions/sync-leetcode-activity/leetcode";

describe("sync-leetcode-activity helpers", () => {
  it("builds GraphQL request bodies", () => {
    const body = buildGraphQLRequestBody("query Test($username: String!) { matchedUser(username: $username) { username } }", {
      username: "derek113",
    });

    expect(body).toBe(JSON.stringify({
      query: "query Test($username: String!) { matchedUser(username: $username) { username } }",
      variables: { username: "derek113" },
    }));
  });

  it("returns CORS headers and handles OPTIONS", async () => {
    const response = handleOptionsRequest();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(corsHeaders["Access-Control-Allow-Origin"]);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("unwraps successful Supabase results", () => {
    const data = [{ id: "row-1" }];

    expect(unwrapSupabaseResult({ data, error: null })).toBe(data);
  });

  it("throws failed Supabase results", () => {
    const error = new Error("missing table");

    expect(() => unwrapSupabaseResult({ data: null, error })).toThrow(error);
  });

  it("parses matchedUser profile data", () => {
    const profile = parseMatchedUser({
      data: {
        matchedUser: {
          username: "derek113",
          profile: { realName: "Derek", userAvatar: "https://avatar" },
          submitStats: {
            acSubmissionNum: [{ difficulty: "All", count: 42 }],
          },
        },
      },
    });

    expect(profile).toEqual({
      username: "derek113",
      displayName: "Derek",
      avatarUrl: "https://avatar",
      totalSolved: 42,
    });
  });

  it("returns null for an invalid username profile response", () => {
    expect(parseMatchedUser({ data: { matchedUser: null } })).toBeNull();
  });

  it("parses recent accepted submissions and converts Unix timestamps", () => {
    const submissions = parseRecentAcSubmissions({
      data: {
        recentAcSubmissionList: [
          { id: "123", title: "Two Sum", titleSlug: "two-sum", timestamp: "1778803200" },
        ],
      },
    });

    expect(submissions).toEqual([
      {
        leetcodeSubmissionId: "123",
        title: "Two Sum",
        titleSlug: "two-sum",
        submittedAt: "2026-05-15T00:00:00.000Z",
      },
    ]);
  });

  it("parses question metadata and difficulty", () => {
    const question = parseQuestionData({
      data: {
        question: {
          questionFrontendId: "1",
          title: "Two Sum",
          difficulty: "Easy",
        },
      },
    });

    expect(question).toEqual({
      leetcodeNumber: 1,
      title: "Two Sum",
      difficulty: "Easy",
    });
    expect(mapLeetCodeDifficulty("MEDIUM")).toBe("Medium");
    expect(mapLeetCodeDifficulty("Unknown")).toBeNull();
  });

  it("dedupes submission candidates by LeetCode submission id", () => {
    const submissions = dedupeSubmissionCandidates([
      { leetcodeSubmissionId: "1", titleSlug: "two-sum", title: "Two Sum", submittedAt: "2026-05-15T00:00:00.000Z" },
      { leetcodeSubmissionId: "1", titleSlug: "two-sum", title: "Two Sum", submittedAt: "2026-05-15T00:00:00.000Z" },
      { leetcodeSubmissionId: "two-sum:2026-05-15T01:00:00.000Z", titleSlug: "two-sum", title: "Two Sum", submittedAt: "2026-05-15T01:00:00.000Z" },
    ]);

    expect(submissions).toHaveLength(2);
  });

  it("preserves terminal import statuses during sync", () => {
    expect(resolveSyncedSubmissionState({
      existingStatus: "imported",
      existingProblemId: "problem-1",
      ignored: false,
      linkedProblemId: null,
    })).toEqual({ status: "imported", problemId: "problem-1" });

    expect(resolveSyncedSubmissionState({
      existingStatus: "rated",
      existingProblemId: "problem-rated",
      ignored: false,
      linkedProblemId: null,
    })).toEqual({ status: "rated", problemId: "problem-rated" });

    expect(resolveSyncedSubmissionState({
      existingStatus: "detected",
      existingProblemId: null,
      ignored: true,
      linkedProblemId: null,
    })).toEqual({ status: "ignored", problemId: null });

    expect(resolveSyncedSubmissionState({
      existingStatus: null,
      existingProblemId: null,
      ignored: false,
      linkedProblemId: "problem-2",
    })).toEqual({ status: "linked_existing", problemId: "problem-2" });

    expect(resolveSyncedSubmissionState({
      existingStatus: "linked_existing",
      existingProblemId: "local-first-problem-id",
      ignored: false,
      linkedProblemId: null,
    })).toEqual({ status: "linked_existing", problemId: "local-first-problem-id" });
  });

  it("maps rate-limit and network failures to safe statuses", () => {
    expect(mapLeetCodeError({ status: 429 })).toEqual({
      status: "rate_limited",
      message: "LeetCode rate limited the request. Try again later.",
    });
    expect(mapLeetCodeError(new Error("Cloudflare challenge HTML"))).toEqual({
      status: "error",
      message: "LeetCode activity sync failed. Try again later.",
    });
  });
});
