import { createSupabaseMock, type SupabaseMock } from "./helpers/supabaseMock";
import type { Problem, Preferences } from "../src/types";

// ============================================================
// Module-level mock variable — controlled per-test in beforeEach
// ============================================================

let mockSupabase: SupabaseMock | null = null;

vi.mock("../src/utils/supabaseClient", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

// ============================================================
// Shared test fixtures
// ============================================================

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

const USER_ID = "user-abc";

// ============================================================
// fetchProblems
// ============================================================

import {
  fetchProblems,
  upsertProblem,
  upsertProblems,
  deleteProblems,
  deleteProblem,
  fetchReviewLog,
  logReview,
  fetchProblemReviewHistory,
  fetchPreferences,
  upsertPreferences,
  submitFeedback,
} from "../src/utils/supabaseData";

describe("fetchProblems", () => {
  it("returns { data: null, error: null } when supabase is null", async () => {
    mockSupabase = null;
    const result = await fetchProblems(USER_ID);
    expect(result).toEqual({ data: null, error: null });
  });

  it("returns mapped camelCase problems on success", async () => {
    const row = makeSnakeRow();
    mockSupabase = createSupabaseMock({ data: [row], error: null });
    // fetchProblems terminal is .eq() — override it to resolve
    mockSupabase.eq.mockResolvedValue({ data: [row], error: null });

    const result = await fetchProblems(USER_ID);

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
  });

  it("returns { data: null, error } on Supabase error", async () => {
    const supabaseError = { message: "DB error" };
    mockSupabase = createSupabaseMock({ data: null, error: supabaseError });
    mockSupabase.eq.mockResolvedValue({ data: null, error: supabaseError });

    const result = await fetchProblems(USER_ID);
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });

  it("returns { data: null, error } on thrown exception", async () => {
    mockSupabase = createSupabaseMock({});
    const thrown = new Error("Network failure");
    mockSupabase.eq.mockRejectedValue(thrown);

    const result = await fetchProblems(USER_ID);
    expect(result.data).toBeNull();
    expect(result.error).toBe(thrown);
  });
});

// ============================================================
// upsertProblem
// ============================================================

describe("upsertProblem", () => {
  it("returns { data: null, error: null } when supabase is null", async () => {
    mockSupabase = null;
    const result = await upsertProblem(USER_ID, makeProblem());
    expect(result).toEqual({ data: null, error: null });
  });

  it("converts problem to snake_case and adds user_id", async () => {
    const row = makeSnakeRow();
    mockSupabase = createSupabaseMock({ data: row, error: null });
    // terminal is single()

    const result = await upsertProblem(USER_ID, makeProblem());

    expect(result.error).toBeNull();
    // Verify upsert was called with snake_case fields and user_id
    const upsertCall = mockSupabase.upsert.mock.calls[0][0];
    expect(upsertCall).toMatchObject({
      id: "prob-1",
      title: "Two Sum",
      leetcode_number: 1,
      difficulty: "Easy",
      user_id: USER_ID,
    });
    expect(upsertCall).toHaveProperty("updated_at");
  });

  it("returns camelCase problem on success", async () => {
    const row = makeSnakeRow();
    mockSupabase = createSupabaseMock({ data: row, error: null });

    const result = await upsertProblem(USER_ID, makeProblem());

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.id).toBe(row.id);
    expect(result.data!.leetcodeNumber).toBe(row.leetcode_number);
    expect(result.data!.dateAdded).toBe(row.date_added);
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Upsert failed" };
    mockSupabase = createSupabaseMock({ data: null, error: supabaseError });

    const result = await upsertProblem(USER_ID, makeProblem());
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// upsertProblems
// ============================================================

describe("upsertProblems", () => {
  it("returns { data: [], error: null } when supabase is null", async () => {
    mockSupabase = null;
    const result = await upsertProblems(USER_ID, [makeProblem()]);
    expect(result).toEqual({ data: [], error: null });
  });

  it("returns { data: [], error: null } when problems is empty", async () => {
    mockSupabase = createSupabaseMock({ data: [], error: null });
    const result = await upsertProblems(USER_ID, []);
    expect(result).toEqual({ data: [], error: null });
  });

  it("batch upserts all problems with user_id", async () => {
    const rows = [makeSnakeRow(), makeSnakeRow({ id: "prob-2", title: "Add Two Numbers" })];
    mockSupabase = createSupabaseMock({});
    // upsertProblems terminal is .select() (awaited directly after upsert chain)
    mockSupabase.select.mockResolvedValue({ data: rows, error: null });

    const problems = [makeProblem(), makeProblem({ id: "prob-2", title: "Add Two Numbers" })];
    const result = await upsertProblems(USER_ID, problems);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);

    const upsertCall = mockSupabase.upsert.mock.calls[0][0];
    expect(upsertCall).toHaveLength(2);
    expect(upsertCall[0]).toMatchObject({ id: "prob-1", user_id: USER_ID });
    expect(upsertCall[1]).toMatchObject({ id: "prob-2", user_id: USER_ID });
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Batch upsert failed" };
    mockSupabase = createSupabaseMock({});
    mockSupabase.select.mockResolvedValue({ data: null, error: supabaseError });

    const result = await upsertProblems(USER_ID, [makeProblem()]);
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// deleteProblems
// ============================================================

describe("deleteProblems", () => {
  it("returns { error: null } when supabase is null", async () => {
    mockSupabase = null;
    const result = await deleteProblems(["id-1"]);
    expect(result).toEqual({ error: null });
  });

  it("returns { error: null } when problemIds is empty", async () => {
    mockSupabase = createSupabaseMock({});
    const result = await deleteProblems([]);
    expect(result).toEqual({ error: null });
    // Supabase should never be called
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("calls delete with correct IDs", async () => {
    mockSupabase = createSupabaseMock({ data: null, error: null });
    // terminal is .in()
    mockSupabase.in.mockResolvedValue({ data: null, error: null });

    const ids = ["id-1", "id-2"];
    const result = await deleteProblems(ids);

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("problems");
    expect(mockSupabase.delete).toHaveBeenCalled();
    expect(mockSupabase.in).toHaveBeenCalledWith("id", ids);
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Delete failed" };
    mockSupabase = createSupabaseMock({});
    mockSupabase.in.mockResolvedValue({ data: null, error: supabaseError });

    const result = await deleteProblems(["id-1"]);
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// deleteProblem
// ============================================================

describe("deleteProblem", () => {
  it("returns { data: null, error: null } when supabase is null", async () => {
    mockSupabase = null;
    const result = await deleteProblem("id-1");
    expect(result).toEqual({ data: null, error: null });
  });

  it("calls delete with correct ID", async () => {
    mockSupabase = createSupabaseMock({ data: null, error: null });
    // terminal is .eq()
    mockSupabase.eq.mockResolvedValue({ data: null, error: null });

    const result = await deleteProblem("id-1");

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("problems");
    expect(mockSupabase.delete).toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "id-1");
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Delete failed" };
    mockSupabase = createSupabaseMock({});
    mockSupabase.eq.mockResolvedValue({ data: null, error: supabaseError });

    const result = await deleteProblem("id-1");
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// fetchReviewLog
// ============================================================

describe("fetchReviewLog", () => {
  it("returns { data: null, error: null } when supabase is null", async () => {
    mockSupabase = null;
    const result = await fetchReviewLog(USER_ID);
    expect(result).toEqual({ data: null, error: null });
  });

  it("maps review_date to { date } format", async () => {
    const rows = [{ review_date: "2026-03-01" }, { review_date: "2026-03-05" }];
    mockSupabase = createSupabaseMock({});
    // terminal is .eq()
    mockSupabase.eq.mockResolvedValue({ data: rows, error: null });

    const result = await fetchReviewLog(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ date: "2026-03-01" }, { date: "2026-03-05" }]);
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Fetch failed" };
    mockSupabase = createSupabaseMock({});
    mockSupabase.eq.mockResolvedValue({ data: null, error: supabaseError });

    const result = await fetchReviewLog(USER_ID);
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// logReview
// ============================================================

describe("logReview", () => {
  it("returns { data: null, error: null } when supabase is null", async () => {
    mockSupabase = null;
    const result = await logReview(USER_ID, "prob-1", 2, 3);
    expect(result).toEqual({ data: null, error: null });
  });

  it("inserts correct fields", async () => {
    const insertedRow = {
      user_id: USER_ID,
      problem_id: "prob-1",
      old_confidence: 2,
      new_confidence: 3,
    };
    mockSupabase = createSupabaseMock({ data: insertedRow, error: null });
    // terminal is .single()

    const result = await logReview(USER_ID, "prob-1", 2, 3);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(insertedRow);
    expect(mockSupabase.from).toHaveBeenCalledWith("review_log");
    const insertCall = mockSupabase.insert.mock.calls[0][0];
    expect(insertCall).toMatchObject({
      user_id: USER_ID,
      problem_id: "prob-1",
      old_confidence: 2,
      new_confidence: 3,
    });
  });

  it("returns error on failure", async () => {
    const supabaseError = { message: "Insert failed" };
    mockSupabase = createSupabaseMock({ data: null, error: supabaseError });

    const result = await logReview(USER_ID, "prob-1", 2, 3);
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// fetchProblemReviewHistory
// ============================================================

describe("fetchProblemReviewHistory", () => {
  it("returns { data: null, error: null } when supabase is null", async () => {
    mockSupabase = null;
    const result = await fetchProblemReviewHistory(USER_ID, "prob-1");
    expect(result).toEqual({ data: null, error: null });
  });

  it("maps snake_case to ReviewHistoryEntry", async () => {
    const rows = [
      { review_date: "2026-03-10", new_confidence: 4, created_at: "2026-03-10T10:00:00.000Z" },
      { review_date: "2026-03-05", new_confidence: 3, created_at: "2026-03-05T09:00:00.000Z" },
    ];
    mockSupabase = createSupabaseMock({});
    // terminal is .order() (after two .eq() calls)
    mockSupabase.order.mockResolvedValue({ data: rows, error: null });

    const result = await fetchProblemReviewHistory(USER_ID, "prob-1");

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
    mockSupabase = createSupabaseMock({});
    mockSupabase.order.mockResolvedValue({ data: null, error: supabaseError });

    const result = await fetchProblemReviewHistory(USER_ID, "prob-1");
    expect(result.data).toBeNull();
    expect(result.error).toBe(supabaseError);
  });
});

// ============================================================
// fetchPreferences
// ============================================================

describe("fetchPreferences", () => {
  it("returns { data: null, error: null } when supabase is null", async () => {
    mockSupabase = null;
    const result = await fetchPreferences(USER_ID);
    expect(result).toEqual({ data: null, error: null });
  });

  it("maps daily_review_goal to dailyReviewGoal", async () => {
    const row = { user_id: USER_ID, daily_review_goal: 10 };
    mockSupabase = createSupabaseMock({ data: row, error: null });
    // terminal is maybeSingle()

    const result = await fetchPreferences(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ dailyReviewGoal: 10, hidePatternsDuringReview: false });
  });

  it("returns null when no row exists", async () => {
    mockSupabase = createSupabaseMock({ data: null, error: null });
    // maybeSingle returns null data — no row found

    const result = await fetchPreferences(USER_ID);

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });
});

// ============================================================
// upsertPreferences
// ============================================================

describe("upsertPreferences", () => {
  it("returns { data: null, error: null } when supabase is null", async () => {
    mockSupabase = null;
    const prefs: Preferences = { dailyReviewGoal: 5, hidePatternsDuringReview: false };
    const result = await upsertPreferences(USER_ID, prefs);
    expect(result).toEqual({ data: null, error: null });
  });

  it("maps dailyReviewGoal to daily_review_goal", async () => {
    const returnedRow = { user_id: USER_ID, daily_review_goal: 7 };
    mockSupabase = createSupabaseMock({ data: returnedRow, error: null });
    // terminal is .single()

    const prefs: Preferences = { dailyReviewGoal: 7, hidePatternsDuringReview: false };
    const result = await upsertPreferences(USER_ID, prefs);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ dailyReviewGoal: 7, hidePatternsDuringReview: false });

    const upsertCall = mockSupabase.upsert.mock.calls[0][0];
    expect(upsertCall).toMatchObject({
      user_id: USER_ID,
      daily_review_goal: 7,
    });
    expect(upsertCall).toHaveProperty("updated_at");
  });
});

// ============================================================
// submitFeedback
// ============================================================

describe("submitFeedback", () => {
  it("returns error when supabase is null", async () => {
    mockSupabase = null;
    const result = await submitFeedback(USER_ID, "Great app!");
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(/not configured/i);
  });

  it("inserts with user_id and trimmed message", async () => {
    mockSupabase = createSupabaseMock({ data: null, error: null });
    // terminal is .insert() — awaited directly
    mockSupabase.insert.mockResolvedValue({ data: null, error: null });

    const result = await submitFeedback(USER_ID, "  Great app!  ");

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("feedback");
    const insertCall = mockSupabase.insert.mock.calls[0][0];
    expect(insertCall).toEqual({
      user_id: USER_ID,
      message: "Great app!",
    });
  });

  it("passes null user_id when no user", async () => {
    mockSupabase = createSupabaseMock({ data: null, error: null });
    mockSupabase.insert.mockResolvedValue({ data: null, error: null });

    const result = await submitFeedback(null, "Anonymous feedback");

    expect(result.error).toBeNull();
    const insertCall = mockSupabase.insert.mock.calls[0][0];
    expect(insertCall.user_id).toBeNull();
    expect(insertCall.message).toBe("Anonymous feedback");
  });
});
