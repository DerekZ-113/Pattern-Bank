import { describe, it, expect } from "vitest";
import { createCloudData, type CloudData } from "../../src/supabase/data";
import { isSyncTimeoutError } from "../../src/syncTimeout";
import { asClient, createSupabaseMock, type SupabaseMock } from "../helpers/supabaseMock";
import type { Problem } from "../../src/types";
import type { CloudPreferences } from "../../src/supabase/mapping";

const USER_ID = "user-abc";

function cloud(mock: SupabaseMock | null, timeoutMs?: number): CloudData {
  return createCloudData({ supabase: asClient(mock), timeoutMs });
}

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "prob-1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-01-01",
    lastReviewed: null,
    nextReviewDate: "2026-01-02",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/** A snake_case row that mirrors makeProblem() */
function makeSnakeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "prob-1",
    title: "Two Sum",
    leetcode_number: 1,
    url: "https://leetcode.com/problems/two-sum",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    exclude_from_review: false,
    date_added: "2026-01-01",
    last_reviewed: null,
    next_review_date: "2026-01-02",
    updated_at: "2026-01-01T00:00:00.000Z",
    user_id: "user-abc",
    ...overrides,
  };
}

// ============================================================
// Null-client guard shapes (Phase 7 contract: mobile injects a
// nullable client and every function must no-op with today's shape)
// ============================================================

describe("null-client guard shapes", () => {
  const data = cloud(null);

  it("fetchProblems → { data: null, error: null }", async () => {
    expect(await data.fetchProblems(USER_ID)).toEqual({ data: null, error: null });
  });

  it("upsertProblem → { data: null, error: null }", async () => {
    expect(await data.upsertProblem(USER_ID, makeProblem())).toEqual({ data: null, error: null });
  });

  it("upsertProblems → { data: [], error: null }", async () => {
    expect(await data.upsertProblems(USER_ID, [makeProblem()])).toEqual({ data: [], error: null });
  });

  it("deleteProblem → { data: null, error: null }", async () => {
    expect(await data.deleteProblem("id-1")).toEqual({ data: null, error: null });
  });

  it("deleteProblems → { error: null }", async () => {
    expect(await data.deleteProblems(["id-1"])).toEqual({ error: null });
  });

  it("fetchProblemTombstones → { data: null, error: null }", async () => {
    expect(await data.fetchProblemTombstones(USER_ID)).toEqual({ data: null, error: null });
  });

  it("upsertProblemTombstone(s) → { error: null }", async () => {
    const tombstone = { problemId: "p1", deletedAt: "2026-03-10T12:00:00.000Z" };
    expect(await data.upsertProblemTombstone(USER_ID, tombstone)).toEqual({ error: null });
    expect(await data.upsertProblemTombstones(USER_ID, [tombstone])).toEqual({ error: null });
  });

  it("fetchDataReset → { data: null, error: null }", async () => {
    expect(await data.fetchDataReset(USER_ID)).toEqual({ data: null, error: null });
  });

  it("upsertDataReset → { error: null }", async () => {
    expect(await data.upsertDataReset(USER_ID, { resetAt: "2026-03-10T12:00:00.000Z" })).toEqual({ error: null });
  });

  it("fetchReviewLog → { data: null, error: null }", async () => {
    expect(await data.fetchReviewLog(USER_ID)).toEqual({ data: null, error: null });
  });

  it("logReview → { data: null, error: null }", async () => {
    expect(await data.logReview(USER_ID, "prob-1", 2, 3, ["Two Pointers"])).toEqual({ data: null, error: null });
  });

  it("replaceReviewLog → { data: null, error: null }", async () => {
    expect(await data.replaceReviewLog(USER_ID, "prob-1", 2, 3, [])).toEqual({ data: null, error: null });
  });

  it("fetchReviewEvents → { data: null, error: null }", async () => {
    expect(await data.fetchReviewEvents(USER_ID)).toEqual({ data: null, error: null });
  });

  it("batchInsertReviewLogs → { error: null }", async () => {
    expect(await data.batchInsertReviewLogs(USER_ID, [
      { date: "2026-03-10", problemId: "p1", confidence: 3, patterns: [], timestamp: "2026-03-10T12:00:00.000Z" },
    ])).toEqual({ error: null });
  });

  it("fetchProblemReviewHistory → { data: null, error: null }", async () => {
    expect(await data.fetchProblemReviewHistory(USER_ID, "prob-1")).toEqual({ data: null, error: null });
  });

  it("fetchPreferences → { data: null, error: null }", async () => {
    expect(await data.fetchPreferences(USER_ID)).toEqual({ data: null, error: null });
  });

  it("upsertPreferences → { data: null, error: null }", async () => {
    const prefs: CloudPreferences = { dailyReviewGoal: 5, hidePatternsDuringReview: false, enabledExtraPatterns: [] };
    expect(await data.upsertPreferences(USER_ID, prefs)).toEqual({ data: null, error: null });
  });

  it("submitFeedback → { error: Error('Supabase not configured') }", async () => {
    const result = await data.submitFeedback(USER_ID, "Great app!");
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(/not configured/i);
  });

  it("deleteAllUserProblems / deleteAllUserReviewLog → { error: null }", async () => {
    expect(await data.deleteAllUserProblems(USER_ID)).toEqual({ error: null });
    expect(await data.deleteAllUserReviewLog(USER_ID)).toEqual({ error: null });
  });
});

// ============================================================
// F-9: cloud operations are timeout-wrapped
// ============================================================

describe("cloud operation timeout (F-9)", () => {
  it("surfaces a SyncTimeoutError when the client hangs past timeoutMs", async () => {
    const mock = createSupabaseMock({});
    mock.eq.mockReturnValue(new Promise(() => undefined));

    const result = await cloud(mock, 10).fetchProblems(USER_ID);

    expect(result.data).toBeNull();
    expect(isSyncTimeoutError(result.error)).toBe(true);
  });
});

// ============================================================
// fetchProblems
// ============================================================

describe("fetchProblems", () => {
  it("returns mapped camelCase problems on success", async () => {
    const row = makeSnakeRow();
    const mock = createSupabaseMock({ data: [row], error: null });
    // fetchProblems terminal is .eq() — override it to resolve
    mock.eq.mockResolvedValue({ data: [row], error: null });

    const result = await cloud(mock).fetchProblems(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    const p = result.data![0];
    expect(p.id).toBe(row.id);
    expect(p.title).toBe(row.title);
    expect(p.leetcodeNumber).toBe(row.leetcode_number);
    expect(p.difficulty).toBe(row.difficulty);
    expect(p.confidence).toBe(row.confidence);
    expect(p.dateAdded).toBe(row.date_added);
    expect(p.nextReviewDate).toBe(row.next_review_date);
    expect(p.excludeFromReview).toBe(row.exclude_from_review);
    expect(p.fiveStarStreak).toBe(0);
  });

  it("routes corrupt updated_at rows through the warn hook with an epoch fallback (F-14)", async () => {
    const warnings: unknown[] = [];
    const row = makeSnakeRow({ updated_at: null });
    const mock = createSupabaseMock({});
    mock.eq.mockResolvedValue({ data: [row], error: null });

    const data = createCloudData({
      supabase: asClient(mock),
      hooks: { warn: (message) => warnings.push(message) },
    });
    const result = await data.fetchProblems(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data![0].updatedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(warnings).toHaveLength(1);
  });

  it("returns { data: null, error } on Supabase error", async () => {
    const supabaseError = { message: "DB error" };
    const mock = createSupabaseMock({ data: null, error: supabaseError });
    mock.eq.mockResolvedValue({ data: null, error: supabaseError });

    const result = await cloud(mock).fetchProblems(USER_ID);
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });

  it("returns { data: null, error } on thrown exception", async () => {
    const mock = createSupabaseMock({});
    const thrown = new Error("Network failure");
    mock.eq.mockRejectedValue(thrown);

    const result = await cloud(mock).fetchProblems(USER_ID);
    expect(result.data).toBeNull();
    expect(result.error).toBe(thrown);
  });
});

// ============================================================
// upsertProblem
// ============================================================

describe("upsertProblem", () => {
  it("converts problem to snake_case and adds user_id", async () => {
    const row = makeSnakeRow();
    const mock = createSupabaseMock({ data: row, error: null });
    // terminal is single()

    const result = await cloud(mock).upsertProblem(USER_ID, makeProblem());

    expect(result.error).toBeNull();
    const upsertCall = mock.upsert.mock.calls[0][0];
    expect(upsertCall).toMatchObject({
      id: "prob-1",
      title: "Two Sum",
      leetcode_number: 1,
      difficulty: "Easy",
      five_star_streak: 0,
      user_id: USER_ID,
    });
    expect(upsertCall).toHaveProperty("updated_at");
    expect(mock.upsert.mock.calls[0][1]).toEqual({ onConflict: "id" });
  });

  it("preserves problem.updatedAt on the written row", async () => {
    const row = makeSnakeRow({ updated_at: "2026-03-14T12:00:00.000Z" });
    const mock = createSupabaseMock({ data: row, error: null });

    await cloud(mock).upsertProblem(USER_ID, makeProblem({ updatedAt: "2026-03-14T12:00:00.000Z" }));

    expect(mock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        updated_at: "2026-03-14T12:00:00.000Z",
        five_star_streak: 0,
      }),
      { onConflict: "id" },
    );
  });

  it("converts old local 5-star problems to snake_case with default streak 1", async () => {
    const row = makeSnakeRow({ confidence: 5, five_star_streak: 1 });
    const mock = createSupabaseMock({ data: row, error: null });

    await cloud(mock).upsertProblem(USER_ID, makeProblem({ confidence: 5 }));

    expect(mock.upsert.mock.calls[0][0].five_star_streak).toBe(1);
  });

  it("preserves explicit fiveStarStreak 0 when upserting", async () => {
    const row = makeSnakeRow({ confidence: 5, five_star_streak: 0 });
    const mock = createSupabaseMock({ data: row, error: null });

    await cloud(mock).upsertProblem(USER_ID, makeProblem({ confidence: 5, fiveStarStreak: 0 }));

    expect(mock.upsert.mock.calls[0][0].five_star_streak).toBe(0);
  });

  it("returns camelCase problem on success", async () => {
    const row = makeSnakeRow();
    const mock = createSupabaseMock({ data: row, error: null });

    const result = await cloud(mock).upsertProblem(USER_ID, makeProblem());

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.id).toBe(row.id);
    expect(result.data!.leetcodeNumber).toBe(row.leetcode_number);
    expect(result.data!.dateAdded).toBe(row.date_added);
    expect(result.data!.fiveStarStreak).toBe(0);
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Upsert failed" };
    const mock = createSupabaseMock({ data: null, error: supabaseError });

    const result = await cloud(mock).upsertProblem(USER_ID, makeProblem());
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// upsertProblems
// ============================================================

describe("upsertProblems", () => {
  it("returns { data: [], error: null } when problems is empty", async () => {
    const mock = createSupabaseMock({ data: [], error: null });
    const result = await cloud(mock).upsertProblems(USER_ID, []);
    expect(result).toEqual({ data: [], error: null });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("batch upserts all problems with user_id", async () => {
    const rows = [makeSnakeRow(), makeSnakeRow({ id: "prob-2", title: "Add Two Numbers" })];
    const mock = createSupabaseMock({});
    // upsertProblems terminal is .select() (awaited directly after upsert chain)
    mock.select.mockResolvedValue({ data: rows, error: null });

    const problems = [makeProblem(), makeProblem({ id: "prob-2", title: "Add Two Numbers" })];
    const result = await cloud(mock).upsertProblems(USER_ID, problems);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);

    const upsertCall = mock.upsert.mock.calls[0][0];
    expect(upsertCall).toHaveLength(2);
    expect(upsertCall[0]).toMatchObject({ id: "prob-1", user_id: USER_ID });
    expect(upsertCall[1]).toMatchObject({ id: "prob-2", user_id: USER_ID });
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Batch upsert failed" };
    const mock = createSupabaseMock({});
    mock.select.mockResolvedValue({ data: null, error: supabaseError });

    const result = await cloud(mock).upsertProblems(USER_ID, [makeProblem()]);
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// deleteProblems / deleteProblem
// ============================================================

describe("deleteProblems", () => {
  it("returns { error: null } when problemIds is empty", async () => {
    const mock = createSupabaseMock({});
    const result = await cloud(mock).deleteProblems([]);
    expect(result).toEqual({ error: null });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("calls delete with correct IDs", async () => {
    const mock = createSupabaseMock({ data: null, error: null });
    // terminal is .in()
    mock.in.mockResolvedValue({ data: null, error: null });

    const ids = ["id-1", "id-2"];
    const result = await cloud(mock).deleteProblems(ids);

    expect(result.error).toBeNull();
    expect(mock.from).toHaveBeenCalledWith("problems");
    expect(mock.delete).toHaveBeenCalled();
    expect(mock.in).toHaveBeenCalledWith("id", ids);
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Delete failed" };
    const mock = createSupabaseMock({});
    mock.in.mockResolvedValue({ data: null, error: supabaseError });

    const result = await cloud(mock).deleteProblems(["id-1"]);
    expect(result.error).toBe(supabaseError);
  });
});

describe("deleteProblem", () => {
  it("calls delete with correct ID", async () => {
    const mock = createSupabaseMock({ data: null, error: null });
    // terminal is .eq()
    mock.eq.mockResolvedValue({ data: null, error: null });

    const result = await cloud(mock).deleteProblem("id-1");

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
    expect(mock.from).toHaveBeenCalledWith("problems");
    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "id-1");
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Delete failed" };
    const mock = createSupabaseMock({});
    mock.eq.mockResolvedValue({ data: null, error: supabaseError });

    const result = await cloud(mock).deleteProblem("id-1");
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// problem_tombstones
// ============================================================

describe("fetchProblemTombstones", () => {
  it("maps tombstone rows to camelCase", async () => {
    const rows = [
      { user_id: USER_ID, problem_id: "p1", deleted_at: "2026-03-10T12:00:00.000Z" },
    ];
    const mock = createSupabaseMock({});
    mock.order.mockResolvedValue({ data: rows, error: null });

    const result = await cloud(mock).fetchProblemTombstones(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ problemId: "p1", deletedAt: "2026-03-10T12:00:00.000Z" }]);
    expect(mock.from).toHaveBeenCalledWith("problem_tombstones");
  });
});

describe("upsertProblemTombstone", () => {
  it("upserts a tombstone with user_id and problem_id", async () => {
    const mock = createSupabaseMock({});
    mock.upsert.mockResolvedValue({ data: null, error: null });

    const result = await cloud(mock).upsertProblemTombstone(USER_ID, {
      problemId: "p1",
      deletedAt: "2026-03-10T12:00:00.000Z",
    });

    expect(result.error).toBeNull();
    expect(mock.from).toHaveBeenCalledWith("problem_tombstones");
    expect(mock.upsert).toHaveBeenCalledWith(
      {
        user_id: USER_ID,
        problem_id: "p1",
        deleted_at: "2026-03-10T12:00:00.000Z",
        updated_at: "2026-03-10T12:00:00.000Z",
      },
      { onConflict: "user_id,problem_id" },
    );
  });
});

describe("upsertProblemTombstones", () => {
  it("does nothing for an empty tombstone list", async () => {
    const mock = createSupabaseMock({});
    const result = await cloud(mock).upsertProblemTombstones(USER_ID, []);
    expect(result).toEqual({ error: null });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("batch upserts tombstones", async () => {
    const mock = createSupabaseMock({});
    mock.upsert.mockResolvedValue({ data: null, error: null });

    const result = await cloud(mock).upsertProblemTombstones(USER_ID, [
      { problemId: "p1", deletedAt: "2026-03-10T12:00:00.000Z" },
      { problemId: "p2", deletedAt: "2026-03-11T12:00:00.000Z" },
    ]);

    expect(result.error).toBeNull();
    expect(mock.from).toHaveBeenCalledWith("problem_tombstones");
    const upsertRows = mock.upsert.mock.calls[0][0];
    expect(upsertRows).toHaveLength(2);
    expect(upsertRows[0]).toMatchObject({ user_id: USER_ID, problem_id: "p1" });
  });
});

// ============================================================
// user_data_resets
// ============================================================

describe("fetchDataReset", () => {
  it("returns null when no reset marker exists", async () => {
    const mock = createSupabaseMock({ data: null, error: null });

    const result = await cloud(mock).fetchDataReset(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
    expect(mock.from).toHaveBeenCalledWith("user_data_resets");
  });

  it("maps reset_at to resetAt", async () => {
    const mock = createSupabaseMock({
      data: { user_id: USER_ID, reset_at: "2026-03-10T12:00:00.000Z" },
      error: null,
    });

    const result = await cloud(mock).fetchDataReset(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ resetAt: "2026-03-10T12:00:00.000Z" });
  });
});

describe("upsertDataReset", () => {
  it("upserts the reset marker", async () => {
    const mock = createSupabaseMock({});
    mock.upsert.mockResolvedValue({ data: null, error: null });

    const result = await cloud(mock).upsertDataReset(USER_ID, { resetAt: "2026-03-10T12:00:00.000Z" });

    expect(result.error).toBeNull();
    expect(mock.from).toHaveBeenCalledWith("user_data_resets");
    expect(mock.upsert).toHaveBeenCalledWith(
      {
        user_id: USER_ID,
        reset_at: "2026-03-10T12:00:00.000Z",
        updated_at: "2026-03-10T12:00:00.000Z",
      },
      { onConflict: "user_id" },
    );
  });
});

// ============================================================
// fetchReviewLog
// ============================================================

describe("fetchReviewLog", () => {
  it("maps review_date to { date } format", async () => {
    const rows = [{ review_date: "2026-03-01" }, { review_date: "2026-03-05" }];
    const mock = createSupabaseMock({});
    // terminal is .eq()
    mock.eq.mockResolvedValue({ data: rows, error: null });

    const result = await cloud(mock).fetchReviewLog(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ date: "2026-03-01" }, { date: "2026-03-05" }]);
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Fetch failed" };
    const mock = createSupabaseMock({});
    mock.eq.mockResolvedValue({ data: null, error: supabaseError });

    const result = await cloud(mock).fetchReviewLog(USER_ID);
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// logReview / replaceReviewLog
// (dedupe-key + review_date contracts live in reviewLogPaths.test.ts)
// ============================================================

describe("logReview", () => {
  it("upserts the review row and returns the stored data", async () => {
    const insertedRow = {
      user_id: USER_ID,
      problem_id: "prob-1",
      old_confidence: 2,
      new_confidence: 3,
    };
    const mock = createSupabaseMock({ data: insertedRow, error: null });
    // terminal is .single()

    const timestamp = "2026-03-10T12:00:00.000Z";
    const result = await cloud(mock).logReview(USER_ID, "prob-1", 2, 3, ["Two Pointers"], timestamp);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(insertedRow);
    expect(mock.from).toHaveBeenCalledWith("review_log");
    expect(mock.upsert.mock.calls[0][0]).toMatchObject({
      user_id: USER_ID,
      problem_id: "prob-1",
      old_confidence: 2,
      new_confidence: 3,
      review_date: "2026-03-10",
      created_at: timestamp,
    });
  });

  it("defaults patterns to an empty array", async () => {
    const mock = createSupabaseMock({ data: null, error: null });

    await cloud(mock).logReview(USER_ID, "prob-1", 2, 3, undefined, "2026-03-10T12:00:00.000Z");

    expect(mock.upsert.mock.calls[0][0]).toMatchObject({ patterns: [] });
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Insert failed" };
    const mock = createSupabaseMock({ data: null, error: supabaseError });

    const result = await cloud(mock).logReview(USER_ID, "prob-1", 2, 3, ["Two Pointers"]);
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

describe("replaceReviewLog", () => {
  it("replaces existing same-day cloud review before upserting the latest row by dedupe key", async () => {
    const insertedRow = {
      user_id: USER_ID,
      problem_id: "prob-1",
      old_confidence: 2,
      new_confidence: 5,
      dedupe_key: `leetcode-rating:${USER_ID}:prob-1:2026-03-10`,
    };
    const mock = createSupabaseMock({ data: insertedRow, error: null });
    mock.eq
      .mockReturnValueOnce(mock)
      .mockReturnValueOnce(mock)
      .mockResolvedValueOnce({ data: null, error: null });

    const timestamp = "2026-03-10T12:00:00.000Z";
    const result = await cloud(mock).replaceReviewLog(USER_ID, "prob-1", 2, 5, ["Graph"], timestamp);

    expect(result.error).toBeNull();
    expect(mock.from).toHaveBeenCalledWith("review_log");
    expect(mock.delete.mock.invocationCallOrder[0]).toBeLessThan(
      mock.upsert.mock.invocationCallOrder[0],
    );
    expect(mock.eq.mock.calls.slice(0, 3)).toEqual([
      ["user_id", USER_ID],
      ["problem_id", "prob-1"],
      ["review_date", "2026-03-10"],
    ]);
    expect(mock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        problem_id: "prob-1",
        old_confidence: 2,
        new_confidence: 5,
        review_date: "2026-03-10",
        created_at: timestamp,
        dedupe_key: `leetcode-rating:${USER_ID}:prob-1:2026-03-10`,
      }),
      { onConflict: "dedupe_key" },
    );
  });

  it("writes replacement reviews with a stable LeetCode rating dedupe key", async () => {
    const mock = createSupabaseMock({ data: null, error: null });
    mock.eq
      .mockReturnValueOnce(mock)
      .mockReturnValueOnce(mock)
      .mockResolvedValueOnce({ data: null, error: null });

    await cloud(mock).replaceReviewLog(USER_ID, "prob-1", 2, 5, ["Graph"], "2026-03-10T12:00:00.000Z");

    expect(mock.upsert.mock.calls[0][0]).toMatchObject({
      user_id: USER_ID,
      problem_id: "prob-1",
      old_confidence: 2,
      new_confidence: 5,
      review_date: "2026-03-10",
      dedupe_key: `leetcode-rating:${USER_ID}:prob-1:2026-03-10`,
    });
  });

  it("does not upsert replacement review when same-day delete fails", async () => {
    const supabaseError = { message: "Delete failed" };
    const mock = createSupabaseMock({ data: null, error: null });
    mock.eq
      .mockReturnValueOnce(mock)
      .mockReturnValueOnce(mock)
      .mockResolvedValueOnce({ data: null, error: supabaseError });

    const result = await cloud(mock).replaceReviewLog(USER_ID, "prob-1", 2, 5, ["Graph"], "2026-03-10T12:00:00.000Z");

    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
    expect(mock.upsert).not.toHaveBeenCalled();
  });

  it("returns replacement review upsert errors", async () => {
    const supabaseError = { message: "Upsert failed" };
    const mock = createSupabaseMock({ data: null, error: null });
    mock.eq
      .mockReturnValueOnce(mock)
      .mockReturnValueOnce(mock)
      .mockResolvedValueOnce({ data: null, error: null });
    mock.single.mockResolvedValueOnce({ data: null, error: supabaseError });

    const result = await cloud(mock).replaceReviewLog(USER_ID, "prob-1", 2, 5, ["Graph"], "2026-03-10T12:00:00.000Z");

    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// fetchProblemReviewHistory
// ============================================================

describe("fetchProblemReviewHistory", () => {
  it("maps snake_case to ReviewHistoryEntry", async () => {
    const rows = [
      { review_date: "2026-03-10", new_confidence: 4, created_at: "2026-03-10T10:00:00.000Z" },
      { review_date: "2026-03-05", new_confidence: 3, created_at: "2026-03-05T09:00:00.000Z" },
    ];
    const mock = createSupabaseMock({});
    // terminal is .order() (after two .eq() calls)
    mock.order.mockResolvedValue({ data: rows, error: null });

    const result = await cloud(mock).fetchProblemReviewHistory(USER_ID, "prob-1");

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data![0]).toEqual({
      reviewDate: "2026-03-10",
      newConfidence: 4,
      createdAt: "2026-03-10T10:00:00.000Z",
    });
    expect(result.data![1]).toEqual({
      reviewDate: "2026-03-05",
      newConfidence: 3,
      createdAt: "2026-03-05T09:00:00.000Z",
    });
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "History fetch failed" };
    const mock = createSupabaseMock({});
    mock.order.mockResolvedValue({ data: null, error: supabaseError });

    const result = await cloud(mock).fetchProblemReviewHistory(USER_ID, "prob-1");
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// fetchReviewEvents
// ============================================================

describe("fetchReviewEvents", () => {
  function makeReviewRow(index: number) {
    return {
      problem_id: `prob-${index}`,
      new_confidence: 3,
      patterns: ["Hash Table"],
      review_date: "2026-03-10",
      created_at: `2026-03-10T12:${String(index % 60).padStart(2, "0")}:00.000Z`,
    };
  }

  it("fetches full review history in pages when since is omitted", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => makeReviewRow(index));
    const secondPage = [makeReviewRow(1000)];
    const mock = createSupabaseMock({});
    mock.range
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: secondPage, error: null });

    const result = await cloud(mock).fetchReviewEvents(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1001);
    expect(result.data![0]).toEqual({
      date: "2026-03-10",
      problemId: "prob-0",
      confidence: 3,
      patterns: ["Hash Table"],
      timestamp: "2026-03-10T12:00:00.000Z",
    });
    expect(mock.gte).not.toHaveBeenCalled();
    expect(mock.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(mock.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it("normalizes null patterns to an empty array", async () => {
    const mock = createSupabaseMock({});
    mock.range.mockResolvedValueOnce({
      data: [{ ...makeReviewRow(0), patterns: null }],
      error: null,
    });

    const result = await cloud(mock).fetchReviewEvents(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data![0].patterns).toEqual([]);
  });

  it("applies explicit since filtering before paginating", async () => {
    const since = "2026-01-01T00:00:00.000Z";
    const mock = createSupabaseMock({});
    mock.range.mockResolvedValueOnce({ data: [makeReviewRow(1)], error: null });

    const result = await cloud(mock).fetchReviewEvents(USER_ID, since);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(mock.gte).toHaveBeenCalledWith("created_at", since);
    expect(mock.range).toHaveBeenCalledWith(0, 999);
  });
});

// ============================================================
// preferences
// ============================================================

describe("fetchPreferences", () => {
  it("maps daily_review_goal to dailyReviewGoal", async () => {
    const row = { user_id: USER_ID, daily_review_goal: 10 };
    const mock = createSupabaseMock({ data: row, error: null });
    // terminal is maybeSingle()

    const result = await cloud(mock).fetchPreferences(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ dailyReviewGoal: 10, hidePatternsDuringReview: false, enabledExtraPatterns: [] });
  });

  it("surfaces the row's updated_at as updatedAt for newest-wins merges", async () => {
    const row = {
      user_id: USER_ID,
      daily_review_goal: 6,
      hide_patterns_during_review: true,
      enabled_extra_patterns: ["Sliding Window"],
      updated_at: "2026-03-10T12:00:00.000Z",
    };
    const mock = createSupabaseMock({ data: row, error: null });

    const result = await cloud(mock).fetchPreferences(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      dailyReviewGoal: 6,
      hidePatternsDuringReview: true,
      enabledExtraPatterns: ["Sliding Window"],
      updatedAt: "2026-03-10T12:00:00.000Z",
    });
  });

  it("returns null when no row exists", async () => {
    const mock = createSupabaseMock({ data: null, error: null });

    const result = await cloud(mock).fetchPreferences(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });
});

describe("upsertPreferences", () => {
  it("maps dailyReviewGoal to daily_review_goal and stamps updated_at", async () => {
    const returnedRow = { user_id: USER_ID, daily_review_goal: 7 };
    const mock = createSupabaseMock({ data: returnedRow, error: null });
    // terminal is .single()

    const prefs: CloudPreferences = { dailyReviewGoal: 7, hidePatternsDuringReview: false, enabledExtraPatterns: [] };
    const result = await cloud(mock).upsertPreferences(USER_ID, prefs);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ dailyReviewGoal: 7, hidePatternsDuringReview: false, enabledExtraPatterns: [] });

    const upsertCall = mock.upsert.mock.calls[0][0];
    expect(upsertCall).toMatchObject({
      user_id: USER_ID,
      daily_review_goal: 7,
    });
    expect(upsertCall).toHaveProperty("updated_at");
    expect(mock.upsert.mock.calls[0][1]).toEqual({ onConflict: "user_id" });
  });

  it("writes the local updatedAt when the preferences carry one", async () => {
    const mock = createSupabaseMock({ data: { user_id: USER_ID, daily_review_goal: 7 }, error: null });

    const prefs: CloudPreferences = {
      dailyReviewGoal: 7,
      hidePatternsDuringReview: false,
      enabledExtraPatterns: [],
      updatedAt: "2026-03-10T12:00:00.000Z",
    };
    await cloud(mock).upsertPreferences(USER_ID, prefs);

    expect(mock.upsert.mock.calls[0][0]).toMatchObject({ updated_at: "2026-03-10T12:00:00.000Z" });
  });
});

// ============================================================
// submitFeedback
// ============================================================

describe("submitFeedback", () => {
  it("inserts with user_id and trimmed message", async () => {
    const mock = createSupabaseMock({ data: null, error: null });
    // terminal is .insert() — awaited directly
    mock.insert.mockResolvedValue({ data: null, error: null });

    const result = await cloud(mock).submitFeedback(USER_ID, "  Great app!  ");

    expect(result.error).toBeNull();
    expect(mock.from).toHaveBeenCalledWith("feedback");
    expect(mock.insert.mock.calls[0][0]).toEqual({
      user_id: USER_ID,
      message: "Great app!",
    });
  });

  it("passes null user_id when no user", async () => {
    const mock = createSupabaseMock({ data: null, error: null });
    mock.insert.mockResolvedValue({ data: null, error: null });

    const result = await cloud(mock).submitFeedback(null, "Anonymous feedback");

    expect(result.error).toBeNull();
    const insertCall = mock.insert.mock.calls[0][0];
    expect(insertCall.user_id).toBeNull();
    expect(insertCall.message).toBe("Anonymous feedback");
  });
});
