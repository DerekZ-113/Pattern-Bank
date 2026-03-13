import { describe, it, expect } from "vitest";
import { INTERVALS, getIntervalDays, prioritizeProblems } from "../src/utils/spacedRepetition";

describe("INTERVALS", () => {
  it("maps confidence 1-5 to expected days", () => {
    expect(INTERVALS[1]).toBe(1);
    expect(INTERVALS[2]).toBe(1);
    expect(INTERVALS[3]).toBe(3);
    expect(INTERVALS[4]).toBe(7);
    expect(INTERVALS[5]).toBe(14);
  });
});

describe("getIntervalDays", () => {
  it("returns correct interval for each confidence level", () => {
    expect(getIntervalDays(1)).toBe(1);
    expect(getIntervalDays(2)).toBe(1);
    expect(getIntervalDays(3)).toBe(3);
    expect(getIntervalDays(4)).toBe(7);
    expect(getIntervalDays(5)).toBe(14);
  });

  it("returns 1 as fallback for invalid confidence", () => {
    expect(getIntervalDays(0)).toBe(1);
    expect(getIntervalDays(6)).toBe(1);
    expect(getIntervalDays(undefined)).toBe(1);
    expect(getIntervalDays(null)).toBe(1);
  });
});

describe("prioritizeProblems", () => {
  it("returns empty array for empty input", () => {
    expect(prioritizeProblems([], 5)).toEqual([]);
  });

  it("returns empty array for limit 0", () => {
    const problems = [{ id: "a", confidence: 1, nextReviewDate: "2026-01-01" }];
    expect(prioritizeProblems(problems, 0)).toEqual([]);
  });

  it("returns single problem unchanged", () => {
    const problems = [{ id: "a", confidence: 3, nextReviewDate: "2026-01-01" }];
    const result = prioritizeProblems(problems, 5);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("sorts lowest confidence first", () => {
    const problems = [
      { id: "high", confidence: 5, nextReviewDate: "2026-01-01" },
      { id: "low", confidence: 1, nextReviewDate: "2026-01-01" },
      { id: "mid", confidence: 3, nextReviewDate: "2026-01-01" },
    ];
    const result = prioritizeProblems(problems, 3);
    expect(result[0].id).toBe("low");
    expect(result[1].id).toBe("mid");
    expect(result[2].id).toBe("high");
  });

  it("sorts most overdue first when confidence is equal", () => {
    const problems = [
      { id: "recent", confidence: 3, nextReviewDate: "2026-03-11" },
      { id: "old", confidence: 3, nextReviewDate: "2026-01-01" },
      { id: "medium", confidence: 3, nextReviewDate: "2026-02-01" },
    ];
    const result = prioritizeProblems(problems, 3);
    // Most overdue (oldest nextReviewDate) should come first
    expect(result[0].id).toBe("old");
    expect(result[1].id).toBe("medium");
  });

  it("respects limit parameter", () => {
    const problems = [
      { id: "a", confidence: 1, nextReviewDate: "2026-01-01" },
      { id: "b", confidence: 2, nextReviewDate: "2026-01-01" },
      { id: "c", confidence: 3, nextReviewDate: "2026-01-01" },
    ];
    const result = prioritizeProblems(problems, 2);
    expect(result).toHaveLength(2);
  });

  it("produces stable ordering for same input", () => {
    const problems = [
      { id: "a", confidence: 3, nextReviewDate: "2026-01-01" },
      { id: "b", confidence: 3, nextReviewDate: "2026-01-01" },
      { id: "c", confidence: 3, nextReviewDate: "2026-01-01" },
    ];
    const result1 = prioritizeProblems(problems, 3);
    const result2 = prioritizeProblems(problems, 3);
    expect(result1.map((p) => p.id)).toEqual(result2.map((p) => p.id));
  });

  it("does not mutate original array", () => {
    const problems = [
      { id: "b", confidence: 5, nextReviewDate: "2026-01-01" },
      { id: "a", confidence: 1, nextReviewDate: "2026-01-01" },
    ];
    const original = [...problems];
    prioritizeProblems(problems, 2);
    expect(problems[0].id).toBe(original[0].id);
    expect(problems[1].id).toBe(original[1].id);
  });

  it("defaults confidence to 3 when missing", () => {
    const problems = [
      { id: "no-conf", nextReviewDate: "2026-01-01" },
      { id: "low", confidence: 1, nextReviewDate: "2026-01-01" },
    ];
    const result = prioritizeProblems(problems, 2);
    expect(result[0].id).toBe("low");
    expect(result[1].id).toBe("no-conf");
  });
});
