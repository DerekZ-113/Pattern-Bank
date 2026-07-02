import { describe, it, expect, vi } from "vitest";
import { toSnakeCase, toCamelCase } from "../../src/supabase/mapping";
import type { Confidence, Problem } from "../../src/types";

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "test-1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2025-01-01",
    lastReviewed: null,
    nextReviewDate: "2025-01-02",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSnakeCaseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "test-1",
    title: "Two Sum",
    leetcode_number: 1,
    url: "https://leetcode.com/problems/two-sum",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    exclude_from_review: false,
    date_added: "2025-01-01",
    last_reviewed: null,
    next_review_date: "2025-01-02",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toSnakeCase", () => {
  it("maps all camelCase Problem fields to snake_case", () => {
    const problem = makeProblem({ lastReviewed: "2025-01-01" });
    const result = toSnakeCase(problem);

    expect(result.id).toBe(problem.id);
    expect(result.title).toBe(problem.title);
    expect(result.leetcode_number).toBe(problem.leetcodeNumber);
    expect(result.url).toBe(problem.url);
    expect(result.difficulty).toBe(problem.difficulty);
    expect(result.patterns).toEqual(problem.patterns);
    expect(result.confidence).toBe(problem.confidence);
    expect(result.notes).toBe(problem.notes);
    expect(result.date_added).toBe(problem.dateAdded);
    expect(result.last_reviewed).toBe(problem.lastReviewed);
    expect(result.next_review_date).toBe(problem.nextReviewDate);
    expect(result.updated_at).toBe(problem.updatedAt);
    expect(result.exclude_from_review).toBe(problem.excludeFromReview);
    expect(result.five_star_streak).toBe(0);
  });

  it("does not include user_id in output", () => {
    const result = toSnakeCase(makeProblem());
    expect("user_id" in result).toBe(false);
  });

  it("writes explicit fiveStarStreak when present", () => {
    const result = toSnakeCase(makeProblem({ confidence: 5, fiveStarStreak: 3 }));
    expect(result.five_star_streak).toBe(3);
  });

  it("writes 1 for old local 5-star problems with missing fiveStarStreak", () => {
    const result = toSnakeCase(makeProblem({ confidence: 5 }));
    expect(result.five_star_streak).toBe(1);
  });

  it("writes 0 for old local non-5-star problems with missing fiveStarStreak", () => {
    const result = toSnakeCase(makeProblem({ confidence: 4 }));
    expect(result.five_star_streak).toBe(0);
  });

  it("preserves explicit fiveStarStreak 0 on a 5-star problem", () => {
    const result = toSnakeCase(makeProblem({ confidence: 5, fiveStarStreak: 0 }));
    expect(result.five_star_streak).toBe(0);
  });

  it("handles null leetcodeNumber → null", () => {
    const result = toSnakeCase(makeProblem({ leetcodeNumber: null }));
    expect(result.leetcode_number).toBeNull();
  });

  it("handles null url → null", () => {
    const result = toSnakeCase(makeProblem({ url: null }));
    expect(result.url).toBeNull();
  });

  // F-13: `?? null` semantics — only null/undefined coerce to null, falsy
  // values like 0 or "" pass through (mobile's old `|| null` dropped them).
  it("preserves falsy-but-present leetcodeNumber 0 and empty url (F-13)", () => {
    const result = toSnakeCase(makeProblem({ leetcodeNumber: 0, url: "" }));
    expect(result.leetcode_number).toBe(0);
    expect(result.url).toBe("");
  });

  it("handles null lastReviewed → null", () => {
    const result = toSnakeCase(makeProblem({ lastReviewed: null }));
    expect(result.last_reviewed).toBeNull();
  });

  it("handles empty notes → empty string", () => {
    const result = toSnakeCase(makeProblem({ notes: "" }));
    expect(result.notes).toBe("");
  });

  it("handles missing updatedAt → generates ISO timestamp", () => {
    const before = Date.now();
    const result = toSnakeCase(makeProblem({ updatedAt: "" }));
    const after = Date.now();

    expect(result.updated_at).toBeTruthy();
    const ts = new Date(result.updated_at).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("excludeFromReview defaults to false when undefined", () => {
    const problem = makeProblem();
    // @ts-expect-error — testing undefined fallback
    delete problem.excludeFromReview;
    const result = toSnakeCase(problem);
    expect(result.exclude_from_review).toBe(false);
  });

  it("preserves patterns array unchanged", () => {
    const patterns = ["Dynamic Programming", "Binary Search", "Two Pointers"];
    const result = toSnakeCase(makeProblem({ patterns }));
    expect(result.patterns).toEqual(patterns);
    expect(result.patterns).toHaveLength(3);
  });
});

describe("toCamelCase", () => {
  it("maps all snake_case fields to camelCase Problem", () => {
    const row = makeSnakeCaseRow({ last_reviewed: "2025-01-01" });
    const result = toCamelCase(row);

    expect(result.id).toBe(row.id);
    expect(result.title).toBe(row.title);
    expect(result.leetcodeNumber).toBe(row.leetcode_number);
    expect(result.url).toBe(row.url);
    expect(result.difficulty).toBe(row.difficulty);
    expect(result.patterns).toEqual(row.patterns);
    expect(result.confidence).toBe(row.confidence);
    expect(result.notes).toBe(row.notes);
    expect(result.dateAdded).toBe(row.date_added);
    expect(result.lastReviewed).toBe(row.last_reviewed);
    expect(result.nextReviewDate).toBe(row.next_review_date);
    expect(result.updatedAt).toBe(row.updated_at);
    expect(result.excludeFromReview).toBe(row.exclude_from_review);
    expect(result.fiveStarStreak).toBe(0);
  });

  it("reads explicit five_star_streak", () => {
    const result = toCamelCase(makeSnakeCaseRow({ confidence: 5, five_star_streak: 3 }));
    expect(result.fiveStarStreak).toBe(3);
  });

  it("defaults old missing 5-star rows to streak 1", () => {
    const result = toCamelCase(makeSnakeCaseRow({ confidence: 5, five_star_streak: null }));
    expect(result.fiveStarStreak).toBe(1);
  });

  it("defaults old missing non-5-star rows to streak 0", () => {
    const result = toCamelCase(makeSnakeCaseRow({ confidence: 4, five_star_streak: null }));
    expect(result.fiveStarStreak).toBe(0);
  });

  it("preserves explicit zero from Supabase", () => {
    const result = toCamelCase(makeSnakeCaseRow({ confidence: 5, five_star_streak: 0 }));
    expect(result.fiveStarStreak).toBe(0);
  });

  it("casts difficulty string to Difficulty type", () => {
    const difficulties = ["Easy", "Medium", "Hard"] as const;
    for (const difficulty of difficulties) {
      const result = toCamelCase(makeSnakeCaseRow({ difficulty }));
      expect(result.difficulty).toBe(difficulty);
    }
  });

  it("casts confidence number to Confidence type", () => {
    for (const confidence of [1, 2, 3, 4, 5] as Confidence[]) {
      const result = toCamelCase(makeSnakeCaseRow({ confidence }));
      expect(result.confidence).toBe(confidence);
    }
  });

  it("handles null/missing patterns → empty array", () => {
    expect(toCamelCase(makeSnakeCaseRow({ patterns: null })).patterns).toEqual([]);
    const row = makeSnakeCaseRow();
    delete row.patterns;
    expect(toCamelCase(row).patterns).toEqual([]);
  });

  it("handles null/missing notes → empty string", () => {
    expect(toCamelCase(makeSnakeCaseRow({ notes: null })).notes).toBe("");
    const row = makeSnakeCaseRow();
    delete row.notes;
    expect(toCamelCase(row).notes).toBe("");
  });

  it("handles null optional fields", () => {
    const result = toCamelCase(
      makeSnakeCaseRow({ leetcode_number: null, url: null, last_reviewed: null }),
    );
    expect(result.leetcodeNumber).toBeNull();
    expect(result.url).toBeNull();
    expect(result.lastReviewed).toBeNull();
  });

  it("handles null/missing exclude_from_review → false", () => {
    expect(toCamelCase(makeSnakeCaseRow({ exclude_from_review: null })).excludeFromReview).toBe(false);
    const row = makeSnakeCaseRow();
    delete row.exclude_from_review;
    expect(toCamelCase(row).excludeFromReview).toBe(false);
  });

  // ============================================================
  // F-14: updated_at is validated on read — a corrupt row falls back to the
  // EPOCH (so it loses last-write-wins merges) and reports via the warn hook.
  // Never a silent now(), which would make the corrupt row win.
  // ============================================================

  it("falls back to the epoch and warns when updated_at is missing (F-14)", () => {
    const warn = vi.fn();
    const row = makeSnakeCaseRow();
    delete row.updated_at;

    const result = toCamelCase(row, { warn });

    expect(result.updatedAt).toBe(EPOCH_ISO);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][1]).toMatchObject({ id: "test-1" });
  });

  it("falls back to the epoch and warns when updated_at is null (F-14)", () => {
    const warn = vi.fn();
    const result = toCamelCase(makeSnakeCaseRow({ updated_at: null }), { warn });

    expect(result.updatedAt).toBe(EPOCH_ISO);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("falls back to the epoch and warns when updated_at is unparseable (F-14)", () => {
    const warn = vi.fn();
    const result = toCamelCase(makeSnakeCaseRow({ updated_at: "not-a-date" }), { warn });

    expect(result.updatedAt).toBe(EPOCH_ISO);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][1]).toMatchObject({ updated_at: "not-a-date" });
  });

  it("passes a valid updated_at through untouched and stays silent", () => {
    const warn = vi.fn();
    const result = toCamelCase(makeSnakeCaseRow({ updated_at: "2025-06-01T12:00:00.000Z" }), { warn });

    expect(result.updatedAt).toBe("2025-06-01T12:00:00.000Z");
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not crash on a corrupt updated_at when no hooks are provided", () => {
    const result = toCamelCase(makeSnakeCaseRow({ updated_at: null }));
    expect(result.updatedAt).toBe(EPOCH_ISO);
  });
});

describe("round-trip fidelity", () => {
  it("toSnakeCase → toCamelCase returns equivalent Problem", () => {
    const original = makeProblem({
      leetcodeNumber: 42,
      url: "https://leetcode.com/problems/wildcard-matching",
      difficulty: "Hard",
      patterns: ["Dynamic Programming", "Greedy"],
      confidence: 2,
      notes: "Tricky DP transition",
      lastReviewed: "2025-06-01",
      excludeFromReview: false,
      fiveStarStreak: 0,
      updatedAt: "2025-06-01T12:00:00.000Z",
    });

    const roundTripped = toCamelCase(toSnakeCase(original) as unknown as Record<string, unknown>);

    expect(roundTripped).toEqual(original);
  });

  it("handles edge case: all optional fields null", () => {
    const original = makeProblem({
      leetcodeNumber: null,
      url: null,
      lastReviewed: null,
      notes: "",
      excludeFromReview: false,
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    const roundTripped = toCamelCase(toSnakeCase(original) as unknown as Record<string, unknown>);

    expect(roundTripped.leetcodeNumber).toBeNull();
    expect(roundTripped.url).toBeNull();
    expect(roundTripped.lastReviewed).toBeNull();
    expect(roundTripped.notes).toBe("");
    expect(roundTripped.excludeFromReview).toBe(false);
  });

  it("handles edge case: all optional fields populated", () => {
    const original = makeProblem({
      leetcodeNumber: 200,
      url: "https://leetcode.com/problems/number-of-islands",
      difficulty: "Medium",
      patterns: ["BFS", "DFS", "Union Find"],
      confidence: 5,
      notes: "Classic graph traversal",
      lastReviewed: "2025-12-31",
      excludeFromReview: true,
      fiveStarStreak: 1,
      updatedAt: "2025-12-31T23:59:59.000Z",
    });

    const roundTripped = toCamelCase(toSnakeCase(original) as unknown as Record<string, unknown>);

    expect(roundTripped).toEqual(original);
  });
});
