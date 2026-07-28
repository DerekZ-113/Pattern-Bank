import { describe, it, expect } from "vitest";
import {
  buildNewProblems,
  deduplicateProblems,
  filterExistingProblems,
  interleaveByDifficulty,
} from "../src/problemTransforms";
import type { LeetCodeProblem, Problem } from "../src/types";

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: `id-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Problem",
    leetcodeNumber: null,
    url: null,
    difficulty: "Medium",
    patterns: [],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-03-01",
    lastReviewed: null,
    nextReviewDate: "2026-03-02",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("deduplicateProblems", () => {
  it("returns problems unchanged when no duplicates", () => {
    const problems = [
      makeProblem({ leetcodeNumber: 1 }),
      makeProblem({ leetcodeNumber: 2 }),
      makeProblem({ leetcodeNumber: 3 }),
    ];
    const { problems: result, removedIds } = deduplicateProblems(problems);
    expect(result).toHaveLength(3);
    expect(removedIds).toHaveLength(0);
  });

  it("removes duplicate by leetcodeNumber, keeps most recent updatedAt", () => {
    const older = makeProblem({
      id: "old-id",
      leetcodeNumber: 1,
      title: "Two Sum",
      updatedAt: "2026-03-01T00:00:00.000Z",
      notes: "old notes",
    });
    const newer = makeProblem({
      id: "new-id",
      leetcodeNumber: 1,
      title: "Two Sum",
      updatedAt: "2026-03-10T00:00:00.000Z",
      notes: "new notes",
    });
    const { problems: result, removedIds } = deduplicateProblems([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new-id");
    expect(result[0].notes).toBe("new notes");
    expect(removedIds).toEqual(["old-id"]);
  });

  it("keeps the valid entry when the earlier duplicate's updatedAt is malformed (F-17)", () => {
    const malformedFirst = makeProblem({
      id: "bad-ts",
      leetcodeNumber: 1,
      updatedAt: "not-a-date",
    });
    const validSecond = makeProblem({
      id: "good-ts",
      leetcodeNumber: 1,
      updatedAt: "2026-03-10T00:00:00.000Z",
    });
    const { problems: result, removedIds } = deduplicateProblems([malformedFirst, validSecond]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("good-ts");
    expect(removedIds).toEqual(["bad-ts"]);
  });

  it("keeps the valid entry when the later duplicate's updatedAt is malformed (F-17)", () => {
    const validFirst = makeProblem({
      id: "good-ts",
      leetcodeNumber: 1,
      updatedAt: "2026-03-10T00:00:00.000Z",
    });
    const malformedSecond = makeProblem({
      id: "bad-ts",
      leetcodeNumber: 1,
      updatedAt: "not-a-date",
    });
    const { problems: result, removedIds } = deduplicateProblems([validFirst, malformedSecond]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("good-ts");
    expect(removedIds).toEqual(["bad-ts"]);
  });

  it("keeps older when newer comes first in array (order doesn't matter, updatedAt does)", () => {
    const newer = makeProblem({
      id: "new-id",
      leetcodeNumber: 1,
      updatedAt: "2026-03-10T00:00:00.000Z",
    });
    const older = makeProblem({
      id: "old-id",
      leetcodeNumber: 1,
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
    const { problems: result, removedIds } = deduplicateProblems([newer, older]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new-id");
    expect(removedIds).toEqual(["old-id"]);
  });

  it("keeps all custom problems (null leetcodeNumber) without deduplication", () => {
    const custom1 = makeProblem({ id: "c1", leetcodeNumber: null, title: "Custom A" });
    const custom2 = makeProblem({ id: "c2", leetcodeNumber: null, title: "Custom B" });
    const custom3 = makeProblem({ id: "c3", leetcodeNumber: null, title: "Custom A" });
    const { problems: result, removedIds } = deduplicateProblems([custom1, custom2, custom3]);
    expect(result).toHaveLength(3);
    expect(removedIds).toHaveLength(0);
  });

  it("handles mixed: dedupes LC numbers but keeps custom problems", () => {
    const lc1a = makeProblem({ id: "a", leetcodeNumber: 1, updatedAt: "2026-03-01T00:00:00.000Z" });
    const lc1b = makeProblem({ id: "b", leetcodeNumber: 1, updatedAt: "2026-03-05T00:00:00.000Z" });
    const custom = makeProblem({ id: "c", leetcodeNumber: null });
    const lc2 = makeProblem({ id: "d", leetcodeNumber: 2 });
    const { problems: result, removedIds } = deduplicateProblems([lc1a, custom, lc1b, lc2]);
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.id).sort()).toEqual(["b", "c", "d"]);
    expect(removedIds).toEqual(["a"]);
  });

  it("handles empty array", () => {
    const { problems: result, removedIds } = deduplicateProblems([]);
    expect(result).toHaveLength(0);
    expect(removedIds).toHaveLength(0);
  });

  it("handles triple duplicates — keeps most recent", () => {
    const p1 = makeProblem({ id: "a", leetcodeNumber: 1, updatedAt: "2026-03-01T00:00:00.000Z" });
    const p2 = makeProblem({ id: "b", leetcodeNumber: 1, updatedAt: "2026-03-05T00:00:00.000Z" });
    const p3 = makeProblem({ id: "c", leetcodeNumber: 1, updatedAt: "2026-03-10T00:00:00.000Z" });
    const { problems: result, removedIds } = deduplicateProblems([p1, p2, p3]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c");
    expect(removedIds).toHaveLength(2);
    expect(removedIds).toContain("a");
    expect(removedIds).toContain("b");
  });

  it("does not mutate the input array", () => {
    const problems = [
      makeProblem({ id: "a", leetcodeNumber: 1, updatedAt: "2026-03-01T00:00:00.000Z" }),
      makeProblem({ id: "b", leetcodeNumber: 1, updatedAt: "2026-03-05T00:00:00.000Z" }),
    ];
    const original = [...problems];
    deduplicateProblems(problems);
    expect(problems).toHaveLength(original.length);
    expect(problems[0].id).toBe(original[0].id);
  });

  it("falls back to keeping first when updatedAt is missing", () => {
    const p1 = makeProblem({ id: "a", leetcodeNumber: 1, updatedAt: null as unknown as string });
    const p2 = makeProblem({ id: "b", leetcodeNumber: 1, updatedAt: null as unknown as string });
    const { problems: result, removedIds } = deduplicateProblems([p1, p2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
    expect(removedIds).toEqual(["b"]);
  });
});

describe("deduplicateProblems — ordering (mobile union)", () => {
  it("keeps first entry when updatedAt is equal", () => {
    const first = makeProblem({ id: "first", leetcodeNumber: 1, updatedAt: "2026-01-01T00:00:00.000Z" });
    const second = makeProblem({ id: "second", leetcodeNumber: 1, updatedAt: "2026-01-01T00:00:00.000Z" });
    const result = deduplicateProblems([first, second]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].id).toBe("first");
    expect(result.removedIds).toEqual(["second"]);
  });

  it("preserves order of non-duplicate problems", () => {
    const problems = [
      makeProblem({ id: "a", leetcodeNumber: 3 }),
      makeProblem({ id: "b", leetcodeNumber: null }),
      makeProblem({ id: "c", leetcodeNumber: 1 }),
      makeProblem({ id: "d", leetcodeNumber: 2 }),
    ];
    const result = deduplicateProblems(problems);
    expect(result.problems.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("duplicatePrevention — full bulk-add pipeline (mobile union)", () => {
  const pipelineOptions = {
    today: "2026-03-14",
    now: "2026-03-14T12:00:00.000Z",
    dailyGoal: 5,
    patternMap: null,
  };

  function makeLCProblem(overrides: Partial<LeetCodeProblem> = {}): LeetCodeProblem {
    return { n: 1, t: "Two Sum", s: "two-sum", d: "Easy", ...overrides } as LeetCodeProblem;
  }

  it("filter + interleave + build produces no duplicates", () => {
    const lc = [
      makeLCProblem({ n: 1, d: "Easy" }),
      makeLCProblem({ n: 2, d: "Medium" }),
      makeLCProblem({ n: 3, d: "Hard" }),
    ];
    const existing = [makeProblem({ leetcodeNumber: 1 })];

    const { newProblems: filtered } = filterExistingProblems(lc, existing);
    const interleaved = interleaveByDifficulty(filtered);
    const built = buildNewProblems(interleaved, pipelineOptions);

    expect(built).toHaveLength(2);
    const nums = built.map((p) => p.leetcodeNumber);
    expect(nums).not.toContain(1); // filtered out
    expect(new Set(nums).size).toBe(2); // no duplicates
  });

  it("all-duplicates input produces zero new problems", () => {
    const lc = [makeLCProblem({ n: 1 }), makeLCProblem({ n: 2 })];
    const existing = [
      makeProblem({ leetcodeNumber: 1 }),
      makeProblem({ id: "x", leetcodeNumber: 2 }),
    ];

    const { newProblems: filtered } = filterExistingProblems(lc, existing);
    expect(filtered).toHaveLength(0);

    const built = buildNewProblems(filtered, pipelineOptions);
    expect(built).toHaveLength(0);
  });

  it("mixed duplicates and new produces correct count", () => {
    const lc = [
      makeLCProblem({ n: 1 }),
      makeLCProblem({ n: 2 }),
      makeLCProblem({ n: 3 }),
      makeLCProblem({ n: 4 }),
      makeLCProblem({ n: 5 }),
    ];
    const existing = [
      makeProblem({ leetcodeNumber: 2 }),
      makeProblem({ id: "x", leetcodeNumber: 4 }),
    ];

    const { newProblems: filtered, skippedCount } = filterExistingProblems(lc, existing);
    expect(filtered).toHaveLength(3);
    expect(skippedCount).toBe(2);

    const interleaved = interleaveByDifficulty(filtered);
    const built = buildNewProblems(interleaved, pipelineOptions);
    expect(built).toHaveLength(3);
  });
});
