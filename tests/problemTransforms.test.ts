import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  filterExistingProblems,
  interleaveByDifficulty,
  buildNewProblems,
  mergeImportedProblems,
  computeReviewProgress,
  buildReviewedProblem,
  computeNextReviewDate,
} from "../src/utils/problemTransforms";
import type { Confidence, LeetCodeProblem, Problem } from "../src/types";

// Mock storage for countReviewedToday
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = String(val); }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage });

beforeEach(() => {
  mockLocalStorage.clear();
});

describe("filterExistingProblems", () => {
  it("filters out problems with matching leetcodeNumber", () => {
    const lcProblems = [
      { n: 1, t: "Two Sum" },
      { n: 2, t: "Add Two Numbers" },
      { n: 3, t: "Longest Substring" },
    ] as LeetCodeProblem[];
    const existing = [
      { id: "a", leetcodeNumber: 1 },
      { id: "b", leetcodeNumber: 3 },
    ] as Problem[];
    const { newProblems, skippedCount } = filterExistingProblems(lcProblems, existing);
    expect(newProblems).toHaveLength(1);
    expect(newProblems[0].n).toBe(2);
    expect(skippedCount).toBe(2);
  });

  it("returns all problems when none exist", () => {
    const lcProblems = [{ n: 1 }, { n: 2 }] as LeetCodeProblem[];
    const { newProblems, skippedCount } = filterExistingProblems(lcProblems, []);
    expect(newProblems).toHaveLength(2);
    expect(skippedCount).toBe(0);
  });

  it("handles empty input", () => {
    const { newProblems, skippedCount } = filterExistingProblems([], [{ id: "a", leetcodeNumber: 1 } as Problem]);
    expect(newProblems).toHaveLength(0);
    expect(skippedCount).toBe(0);
  });

  it("ignores custom problems with null leetcodeNumber", () => {
    const lcProblems = [{ n: 5 }] as LeetCodeProblem[];
    const existing = [{ id: "a", leetcodeNumber: null }] as Problem[];
    const { newProblems } = filterExistingProblems(lcProblems, existing);
    expect(newProblems).toHaveLength(1);
  });
});

describe("interleaveByDifficulty", () => {
  it("round-robins Easy, Medium, Hard", () => {
    const problems = [
      { n: 1, d: "Easy" },
      { n: 2, d: "Easy" },
      { n: 3, d: "Medium" },
      { n: 4, d: "Medium" },
      { n: 5, d: "Hard" },
      { n: 6, d: "Hard" },
    ] as LeetCodeProblem[];
    const result = interleaveByDifficulty(problems);
    expect(result.map((p) => p.d)).toEqual([
      "Easy", "Medium", "Hard",
      "Easy", "Medium", "Hard",
    ]);
  });

  it("handles uneven bucket sizes", () => {
    const problems = [
      { n: 1, d: "Easy" },
      { n: 2, d: "Easy" },
      { n: 3, d: "Easy" },
      { n: 4, d: "Medium" },
      { n: 5, d: "Hard" },
    ] as LeetCodeProblem[];
    const result = interleaveByDifficulty(problems);
    expect(result).toHaveLength(5);
    expect(result[0].d).toBe("Easy");
    expect(result[1].d).toBe("Medium");
    expect(result[2].d).toBe("Hard");
    expect(result[3].d).toBe("Easy");
    expect(result[4].d).toBe("Easy");
  });

  it("handles single-difficulty input", () => {
    const problems = [
      { n: 1, d: "Medium" },
      { n: 2, d: "Medium" },
    ] as LeetCodeProblem[];
    const result = interleaveByDifficulty(problems);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.d === "Medium")).toBe(true);
  });

  it("preserves total count", () => {
    const problems = Array.from({ length: 10 }, (_, i) => ({
      n: i + 1,
      d: ["Easy", "Medium", "Hard"][i % 3],
    })) as LeetCodeProblem[];
    const result = interleaveByDifficulty(problems);
    expect(result).toHaveLength(10);
  });

  it("returns empty array for empty input", () => {
    expect(interleaveByDifficulty([])).toEqual([]);
  });
});

describe("buildNewProblems", () => {
  it("creates problem objects with all required fields", () => {
    const lcProblems = [{ n: 1, t: "Two Sum", s: "two-sum", d: "Easy" }] as LeetCodeProblem[];
    const result = buildNewProblems(lcProblems, {
      today: "2026-03-13",
      now: "2026-03-13T00:00:00.000Z",
      dailyGoal: 5,
      patternMap: null,
    });
    expect(result).toHaveLength(1);
    const p = result[0];
    expect(p.id).toBeTruthy();
    expect(p.title).toBe("Two Sum");
    expect(p.leetcodeNumber).toBe(1);
    expect(p.url).toContain("two-sum");
    expect(p.difficulty).toBe("Easy");
    expect(p.patterns).toEqual([]);
    expect(p.confidence).toBe(1);
    expect(p.notes).toBe("");
    expect(p.excludeFromReview).toBe(false);
    expect(p.dateAdded).toBe("2026-03-13");
    expect(p.lastReviewed).toBeNull();
    expect(p.nextReviewDate).toBe("2026-03-13");
    expect(p.updatedAt).toBe("2026-03-13T00:00:00.000Z");
  });

  it("distributes nextReviewDate across days based on dailyGoal", () => {
    const lcProblems = Array.from({ length: 6 }, (_, i) => ({
      n: i + 1, t: `P${i}`, s: `p${i}`, d: "Easy",
    })) as LeetCodeProblem[];
    const result = buildNewProblems(lcProblems, {
      today: "2026-03-13",
      now: "2026-03-13T00:00:00.000Z",
      dailyGoal: 2,
      patternMap: null,
    });
    // indices 0,1 → day 0; 2,3 → day 1; 4,5 → day 2
    expect(result[0].nextReviewDate).toBe("2026-03-13");
    expect(result[1].nextReviewDate).toBe("2026-03-13");
    expect(result[2].nextReviewDate).toBe("2026-03-14");
    expect(result[3].nextReviewDate).toBe("2026-03-14");
    expect(result[4].nextReviewDate).toBe("2026-03-15");
    expect(result[5].nextReviewDate).toBe("2026-03-15");
  });

  it("applies patternMap when provided", () => {
    const lcProblems = [{ n: 1, t: "Two Sum", s: "two-sum", d: "Easy" }] as LeetCodeProblem[];
    const patternMap = new Map([[1, ["Hash Table", "Two Pointers"]]]);
    const result = buildNewProblems(lcProblems, {
      today: "2026-03-13",
      now: "2026-03-13T00:00:00.000Z",
      dailyGoal: 5,
      patternMap,
    });
    expect(result[0].patterns).toEqual(["Hash Table", "Two Pointers"]);
  });
});

describe("mergeImportedProblems", () => {
  it("adds new problems and counts correctly", () => {
    const existing = [{ id: "a", title: "Existing" }] as Problem[];
    const imported = [{ id: "b", title: "New" }] as Problem[];
    const { mergedProblems, addedCount, updatedCount } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(2);
    expect(addedCount).toBe(1);
    expect(updatedCount).toBe(0);
  });

  it("overwrites existing problem when imported version is newer", () => {
    const existing = [{ id: "a", title: "Old Title", notes: "old", updatedAt: "2026-01-01T00:00:00.000Z" }] as Problem[];
    const imported = [{ id: "a", title: "New Title", notes: "new", updatedAt: "2026-01-02T00:00:00.000Z" }] as Problem[];
    const { mergedProblems, addedCount, updatedCount } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].title).toBe("New Title");
    expect(addedCount).toBe(0);
    expect(updatedCount).toBe(1);
  });

  it("preserves local problem when imported version is older", () => {
    const existing = [{ id: "a", title: "Local Title", updatedAt: "2026-01-02T00:00:00.000Z" }] as Problem[];
    const imported = [{ id: "a", title: "Stale Title", updatedAt: "2026-01-01T00:00:00.000Z" }] as Problem[];
    const { mergedProblems, addedCount, updatedCount } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].title).toBe("Local Title");
    expect(addedCount).toBe(0);
    expect(updatedCount).toBe(0);
  });

  it("preserves local problem when timestamps are equal", () => {
    const existing = [{ id: "a", title: "Local", updatedAt: "2026-01-01T00:00:00.000Z" }] as Problem[];
    const imported = [{ id: "a", title: "Import", updatedAt: "2026-01-01T00:00:00.000Z" }] as Problem[];
    const { mergedProblems, updatedCount } = mergeImportedProblems(existing, imported);
    expect(mergedProblems[0].title).toBe("Local");
    expect(updatedCount).toBe(0);
  });

  it("does not lose existing problems not in import", () => {
    const existing = [
      { id: "a", title: "Keep" },
      { id: "b", title: "Also Keep" },
    ] as Problem[];
    const imported = [{ id: "c", title: "New" }] as Problem[];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(3);
    expect(mergedProblems.find((p) => p.id === "a")).toBeTruthy();
    expect(mergedProblems.find((p) => p.id === "b")).toBeTruthy();
  });

  it("handles empty import", () => {
    const existing = [{ id: "a" }] as Problem[];
    const { mergedProblems, addedCount, updatedCount } = mergeImportedProblems(existing, []);
    expect(mergedProblems).toHaveLength(1);
    expect(addedCount).toBe(0);
    expect(updatedCount).toBe(0);
  });
});

describe("computeReviewProgress", () => {
  it("calculates effectiveGoal as min of dailyGoal and totalDue + reviewed", () => {
    const problems = [
      { id: "a", nextReviewDate: "2020-01-01", lastReviewed: null },
      { id: "b", nextReviewDate: "2020-01-01", lastReviewed: null },
    ] as Problem[];
    const { currentReviewed, totalDue, effectiveGoal } = computeReviewProgress(problems, 10);
    expect(currentReviewed).toBe(0);
    expect(totalDue).toBe(2);
    expect(effectiveGoal).toBe(2); // min(10, 2+0)
  });

  it("handles zero due problems", () => {
    const problems = [
      { id: "a", nextReviewDate: "2099-01-01", lastReviewed: null },
    ] as Problem[];
    const { totalDue, effectiveGoal } = computeReviewProgress(problems, 5);
    expect(totalDue).toBe(0);
    expect(effectiveGoal).toBe(0);
  });

  it("handles empty problems array", () => {
    const { currentReviewed, totalDue, effectiveGoal } = computeReviewProgress([], 5);
    expect(currentReviewed).toBe(0);
    expect(totalDue).toBe(0);
    expect(effectiveGoal).toBe(0);
  });

  it("excludes excludeFromReview problems from totalDue", () => {
    const problems = [
      { id: "a", nextReviewDate: "2020-01-01", lastReviewed: null, excludeFromReview: false },
      { id: "b", nextReviewDate: "2020-01-01", lastReviewed: null, excludeFromReview: true },
      { id: "c", nextReviewDate: "2020-01-01", lastReviewed: null, excludeFromReview: false },
    ] as Problem[];
    const result = computeReviewProgress(problems, 10);
    expect(result.totalDue).toBe(2);
    expect(result.effectiveGoal).toBe(2);
  });
});

describe("buildReviewedProblem", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 27, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseReviewedProblem = {
    id: "review-base",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3 as Confidence,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-01-01",
    lastReviewed: "2026-04-20",
    nextReviewDate: "2026-04-27",
    updatedAt: "2026-04-20T00:00:00.000Z",
  } satisfies Problem;

  it("updates confidence and dates correctly", () => {
    const original = {
      id: "a",
      title: "Two Sum",
      confidence: 2,
      lastReviewed: null,
      nextReviewDate: "2026-03-10",
      notes: "some notes",
    } as Problem;
    const result = buildReviewedProblem(original, 4);
    expect(result.confidence).toBe(4);
    expect(result.lastReviewed).toBeTruthy();
    expect(result.nextReviewDate).toBeTruthy();
    expect(result.updatedAt).toBeTruthy();
    expect(result.nextReviewDate).toBe("2026-05-07");
    expect(result.fiveStarStreak).toBe(0);
  });

  it("preserves all other problem fields", () => {
    const original = {
      id: "xyz",
      title: "Test",
      leetcodeNumber: 42,
      url: "https://example.com",
      difficulty: "Hard",
      patterns: ["DP"],
      confidence: 1,
      notes: "my notes",
      excludeFromReview: false,
      dateAdded: "2026-01-01",
      lastReviewed: null,
      nextReviewDate: "2026-03-01",
      updatedAt: "old",
    } as Problem;
    const result = buildReviewedProblem(original, 3);
    expect(result.id).toBe("xyz");
    expect(result.title).toBe("Test");
    expect(result.leetcodeNumber).toBe(42);
    expect(result.url).toBe("https://example.com");
    expect(result.difficulty).toBe("Hard");
    expect(result.patterns).toEqual(["DP"]);
    expect(result.notes).toBe("my notes");
    expect(result.excludeFromReview).toBe(false);
    expect(result.dateAdded).toBe("2026-01-01");
  });

  it("applies correct V2 base intervals", () => {
    const base = { ...baseReviewedProblem, confidence: 1 as Confidence };
    const r1 = buildReviewedProblem(base, 1);
    const r2 = buildReviewedProblem(base, 2);
    const r3 = buildReviewedProblem(base, 3);
    const r4 = buildReviewedProblem(base, 4);
    const r5 = buildReviewedProblem(base, 5);

    expect(r1.nextReviewDate).toBe("2026-04-28");
    expect(r2.nextReviewDate).toBe("2026-04-29");
    expect(r3.nextReviewDate).toBe("2026-05-02");
    expect(r4.nextReviewDate).toBe("2026-05-07");
    expect(r5.nextReviewDate).toBe("2026-05-27");
  });

  it("treats old missing 5-star streak as previous streak 1", () => {
    const result = buildReviewedProblem({ ...baseReviewedProblem, confidence: 5 as Confidence }, 5);
    expect(result.fiveStarStreak).toBe(2);
    expect(result.nextReviewDate).toBe("2026-06-26");
  });

  it("preserves explicit streak 0 as first 5-star graduation", () => {
    const result = buildReviewedProblem({
      ...baseReviewedProblem,
      confidence: 5 as Confidence,
      fiveStarStreak: 0,
    }, 5);
    expect(result.fiveStarStreak).toBe(1);
    expect(result.nextReviewDate).toBe("2026-05-27");
  });

  it("caps repeated 5-star reviews at 365 days", () => {
    const result = buildReviewedProblem({
      ...baseReviewedProblem,
      confidence: 5 as Confidence,
      fiveStarStreak: 5,
    }, 5);
    expect(result.fiveStarStreak).toBe(6);
    expect(result.nextReviewDate).toBe("2027-04-27");
  });

  it("resets fiveStarStreak to 0 on ratings below 5", () => {
    const result = buildReviewedProblem({
      ...baseReviewedProblem,
      confidence: 5 as Confidence,
      fiveStarStreak: 4,
    }, 4);
    expect(result.fiveStarStreak).toBe(0);
    expect(result.nextReviewDate).toBe("2026-05-07");
  });
});

describe("computeNextReviewDate", () => {
  const today = "2026-04-27";

  it("uses SRS interval for new problem at confidence 1", () => {
    expect(computeNextReviewDate(null, 1 as Confidence, today)).toBe("2026-04-28");
  });

  it("uses SRS interval for new problem at confidence 2", () => {
    expect(computeNextReviewDate(null, 2 as Confidence, today)).toBe("2026-04-29");
  });

  it("uses SRS interval for new problem at confidence 3", () => {
    expect(computeNextReviewDate(null, 3 as Confidence, today)).toBe("2026-05-02");
  });

  it("uses SRS interval for new problem at confidence 4", () => {
    expect(computeNextReviewDate(null, 4 as Confidence, today)).toBe("2026-05-07");
  });

  it("uses SRS interval for new problem at confidence 5", () => {
    expect(computeNextReviewDate(null, 5 as Confidence, today)).toBe("2026-05-27");
  });

  it("reschedules from today when confidence changes on edit", () => {
    const initial = {
      id: "a",
      confidence: 3 as Confidence,
      nextReviewDate: "2030-01-01",
    } as Problem;
    expect(computeNextReviewDate(initial, 5 as Confidence, today)).toBe("2026-05-27");
  });

  it("preserves nextReviewDate on edit when confidence is unchanged", () => {
    const initial = {
      id: "a",
      confidence: 4 as Confidence,
      nextReviewDate: "2026-05-15",
    } as Problem;
    expect(computeNextReviewDate(initial, 4 as Confidence, today)).toBe("2026-05-15");
  });

  it("preserves overdue nextReviewDate on cosmetic edit", () => {
    const initial = {
      id: "a",
      confidence: 2 as Confidence,
      nextReviewDate: "2020-01-01",
    } as Problem;
    expect(computeNextReviewDate(initial, 2 as Confidence, today)).toBe("2020-01-01");
  });
});
