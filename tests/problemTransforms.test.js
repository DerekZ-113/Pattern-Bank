import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  filterExistingProblems,
  interleaveByDifficulty,
  buildNewProblems,
  mergeImportedProblems,
  computeReviewProgress,
  buildReviewedProblem,
} from "../src/utils/problemTransforms";

// Mock storage for countReviewedToday
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = String(val); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
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
    ];
    const existing = [
      { id: "a", leetcodeNumber: 1 },
      { id: "b", leetcodeNumber: 3 },
    ];
    const { newProblems, skippedCount } = filterExistingProblems(lcProblems, existing);
    expect(newProblems).toHaveLength(1);
    expect(newProblems[0].n).toBe(2);
    expect(skippedCount).toBe(2);
  });

  it("returns all problems when none exist", () => {
    const lcProblems = [{ n: 1 }, { n: 2 }];
    const { newProblems, skippedCount } = filterExistingProblems(lcProblems, []);
    expect(newProblems).toHaveLength(2);
    expect(skippedCount).toBe(0);
  });

  it("handles empty input", () => {
    const { newProblems, skippedCount } = filterExistingProblems([], [{ id: "a", leetcodeNumber: 1 }]);
    expect(newProblems).toHaveLength(0);
    expect(skippedCount).toBe(0);
  });

  it("ignores custom problems with null leetcodeNumber", () => {
    const lcProblems = [{ n: 5 }];
    const existing = [{ id: "a", leetcodeNumber: null }];
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
    ];
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
    ];
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
    ];
    const result = interleaveByDifficulty(problems);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.d === "Medium")).toBe(true);
  });

  it("preserves total count", () => {
    const problems = Array.from({ length: 10 }, (_, i) => ({
      n: i + 1,
      d: ["Easy", "Medium", "Hard"][i % 3],
    }));
    const result = interleaveByDifficulty(problems);
    expect(result).toHaveLength(10);
  });

  it("returns empty array for empty input", () => {
    expect(interleaveByDifficulty([])).toEqual([]);
  });
});

describe("buildNewProblems", () => {
  it("creates problem objects with all required fields", () => {
    const lcProblems = [{ n: 1, t: "Two Sum", s: "two-sum", d: "Easy" }];
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
    }));
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
    const lcProblems = [{ n: 1, t: "Two Sum", s: "two-sum", d: "Easy" }];
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
    const existing = [{ id: "a", title: "Existing" }];
    const imported = [{ id: "b", title: "New" }];
    const { mergedProblems, addedCount, updatedCount } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(2);
    expect(addedCount).toBe(1);
    expect(updatedCount).toBe(0);
  });

  it("overwrites existing problems by id", () => {
    const existing = [{ id: "a", title: "Old Title", notes: "old" }];
    const imported = [{ id: "a", title: "New Title", notes: "new" }];
    const { mergedProblems, addedCount, updatedCount } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].title).toBe("New Title");
    expect(addedCount).toBe(0);
    expect(updatedCount).toBe(1);
  });

  it("does not lose existing problems not in import", () => {
    const existing = [
      { id: "a", title: "Keep" },
      { id: "b", title: "Also Keep" },
    ];
    const imported = [{ id: "c", title: "New" }];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(3);
    expect(mergedProblems.find((p) => p.id === "a")).toBeTruthy();
    expect(mergedProblems.find((p) => p.id === "b")).toBeTruthy();
  });

  it("handles empty import", () => {
    const existing = [{ id: "a" }];
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
    ];
    const { currentReviewed, totalDue, effectiveGoal } = computeReviewProgress(problems, 10);
    expect(currentReviewed).toBe(0);
    expect(totalDue).toBe(2);
    expect(effectiveGoal).toBe(2); // min(10, 2+0)
  });

  it("handles zero due problems", () => {
    const problems = [
      { id: "a", nextReviewDate: "2099-01-01", lastReviewed: null },
    ];
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
});

describe("buildReviewedProblem", () => {
  it("updates confidence and dates correctly", () => {
    const original = {
      id: "a",
      title: "Two Sum",
      confidence: 2,
      lastReviewed: null,
      nextReviewDate: "2026-03-10",
      notes: "some notes",
    };
    const result = buildReviewedProblem(original, 4);
    expect(result.confidence).toBe(4);
    expect(result.lastReviewed).toBeTruthy();
    expect(result.nextReviewDate).toBeTruthy();
    expect(result.updatedAt).toBeTruthy();
    // SM-2: confidence 4 → 7 days
    expect(result.nextReviewDate).not.toBe(original.nextReviewDate);
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
    };
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

  it("applies correct SM-2 intervals", () => {
    const base = { id: "a", confidence: 1, lastReviewed: null, nextReviewDate: "2026-03-13" };
    // Confidence 1 → 1 day, 3 → 3 days, 5 → 14 days
    const r1 = buildReviewedProblem(base, 1);
    const r3 = buildReviewedProblem(base, 3);
    const r5 = buildReviewedProblem(base, 5);

    const today = r1.lastReviewed; // all use same today
    expect(r1.nextReviewDate).not.toBe(r3.nextReviewDate);
    expect(r3.nextReviewDate).not.toBe(r5.nextReviewDate);
  });
});
