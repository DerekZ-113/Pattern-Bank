import { describe, it, expect } from "vitest";
import {
  FIVE_STAR_GRADUATION_INTERVALS,
  INTERVALS,
  getDefaultFiveStarStreak,
  getFiveStarGraduationIntervalDays,
  getIntervalDays,
  getNextFiveStarStreak,
  getPreviousFiveStarStreak,
  getReviewIntervalDays,
  prioritizeProblems,
} from "../src/spacedRepetition";
import type { Confidence, Problem } from "../src/types";

describe("INTERVALS", () => {
  it("maps confidence 1-5 to expected days", () => {
    expect(INTERVALS[1]).toBe(1);
    expect(INTERVALS[2]).toBe(2);
    expect(INTERVALS[3]).toBe(5);
    expect(INTERVALS[4]).toBe(10);
    expect(INTERVALS[5]).toBe(30);
  });
});

describe("getIntervalDays", () => {
  it("returns correct interval for each confidence level", () => {
    expect(getIntervalDays(1)).toBe(1);
    expect(getIntervalDays(2)).toBe(2);
    expect(getIntervalDays(3)).toBe(5);
    expect(getIntervalDays(4)).toBe(10);
    expect(getIntervalDays(5)).toBe(30);
  });

  it("returns 1 as fallback for invalid confidence", () => {
    expect(getIntervalDays(0 as unknown as Confidence)).toBe(1);
    expect(getIntervalDays(6 as unknown as Confidence)).toBe(1);
    expect(getIntervalDays(undefined as unknown as Confidence)).toBe(1);
    expect(getIntervalDays(null as unknown as Confidence)).toBe(1);
  });
});

describe("5-star graduation", () => {
  it("defines the graduation intervals", () => {
    expect(FIVE_STAR_GRADUATION_INTERVALS).toEqual([30, 60, 120, 240, 365]);
  });

  it("returns graduated intervals capped at one year", () => {
    expect(getFiveStarGraduationIntervalDays(0)).toBe(30);
    expect(getFiveStarGraduationIntervalDays(1)).toBe(30);
    expect(getFiveStarGraduationIntervalDays(2)).toBe(60);
    expect(getFiveStarGraduationIntervalDays(3)).toBe(120);
    expect(getFiveStarGraduationIntervalDays(4)).toBe(240);
    expect(getFiveStarGraduationIntervalDays(5)).toBe(365);
    expect(getFiveStarGraduationIntervalDays(12)).toBe(365);
  });

  it("defaults old 5-star problems to previous streak 1", () => {
    const problem = { confidence: 5 } as Problem;
    expect(getDefaultFiveStarStreak(problem.confidence)).toBe(1);
    expect(getPreviousFiveStarStreak(problem)).toBe(1);
    expect(getNextFiveStarStreak(problem, 5)).toBe(2);
    expect(getReviewIntervalDays(problem, 5)).toBe(60);
  });

  it("defaults old non-5-star problems to previous streak 0", () => {
    const problem = { confidence: 4 } as Problem;
    expect(getDefaultFiveStarStreak(problem.confidence)).toBe(0);
    expect(getPreviousFiveStarStreak(problem)).toBe(0);
    expect(getNextFiveStarStreak(problem, 5)).toBe(1);
    expect(getReviewIntervalDays(problem, 5)).toBe(30);
  });

  it("preserves explicit streak 0 for a 5-star problem", () => {
    const problem = { confidence: 5, fiveStarStreak: 0 } as Problem;
    expect(getPreviousFiveStarStreak(problem)).toBe(0);
    expect(getNextFiveStarStreak(problem, 5)).toBe(1);
    expect(getReviewIntervalDays(problem, 5)).toBe(30);
  });

  it("resets streak on ratings below 5 and uses base intervals", () => {
    const problem = { confidence: 5, fiveStarStreak: 4 } as Problem;
    expect(getNextFiveStarStreak(problem, 4)).toBe(0);
    expect(getReviewIntervalDays(problem, 4)).toBe(10);
  });
});

describe("prioritizeProblems", () => {
  it("returns empty array for empty input", () => {
    expect(prioritizeProblems([], 5)).toEqual([]);
  });

  it("returns empty array for limit 0", () => {
    const problems = [{ id: "a", confidence: 1, nextReviewDate: "2026-01-01" }] as Problem[];
    expect(prioritizeProblems(problems, 0)).toEqual([]);
  });

  it("returns single problem unchanged", () => {
    const problems = [{ id: "a", confidence: 3, nextReviewDate: "2026-01-01" }] as Problem[];
    const result = prioritizeProblems(problems, 5);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("sorts lowest confidence first", () => {
    const problems = [
      { id: "high", confidence: 5, nextReviewDate: "2026-01-01" },
      { id: "low", confidence: 1, nextReviewDate: "2026-01-01" },
      { id: "mid", confidence: 3, nextReviewDate: "2026-01-01" },
    ] as Problem[];
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
    ] as Problem[];
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
    ] as Problem[];
    const result = prioritizeProblems(problems, 2);
    expect(result).toHaveLength(2);
  });

  it("produces stable ordering for same input", () => {
    const problems = [
      { id: "a", confidence: 3, nextReviewDate: "2026-01-01" },
      { id: "b", confidence: 3, nextReviewDate: "2026-01-01" },
      { id: "c", confidence: 3, nextReviewDate: "2026-01-01" },
    ] as Problem[];
    const result1 = prioritizeProblems(problems, 3);
    const result2 = prioritizeProblems(problems, 3);
    expect(result1.map((p) => p.id)).toEqual(result2.map((p) => p.id));
  });

  it("does not mutate original array", () => {
    const problems = [
      { id: "b", confidence: 5, nextReviewDate: "2026-01-01" },
      { id: "a", confidence: 1, nextReviewDate: "2026-01-01" },
    ] as Problem[];
    const original = [...problems];
    prioritizeProblems(problems, 2);
    expect(problems[0].id).toBe(original[0].id);
    expect(problems[1].id).toBe(original[1].id);
  });

  it("defaults confidence to 3 when missing", () => {
    const problems = [
      { id: "no-conf", nextReviewDate: "2026-01-01" },
      { id: "low", confidence: 1, nextReviewDate: "2026-01-01" },
    ] as Problem[];
    const result = prioritizeProblems(problems, 2);
    expect(result[0].id).toBe("low");
    expect(result[1].id).toBe("no-conf");
  });
});
