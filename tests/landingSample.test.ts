import { describe, expect, it } from "vitest";
import { CORE_PATTERNS, formatLocalDate, getProblemByNumber } from "@patternbank/core";
import { buildLandingSample } from "../src/utils/landingSample";

describe("buildLandingSample", () => {
  const now = new Date(2026, 10, 17, 9, 0, 0);
  const sample = buildLandingSample(now);

  it("uses real LeetCode problems for the cards a visitor reads", () => {
    for (const problem of [...sample.due, sample.leetcode]) {
      const real = getProblemByNumber(problem.leetcodeNumber as number);
      expect(real?.t).toBe(problem.title);
      expect(real?.d).toBe(problem.difficulty);
    }
  });

  it("only ever names patterns the app has", () => {
    const known = new Set<string>(CORE_PATTERNS);
    for (const problem of [...sample.due, ...sample.library]) {
      for (const pattern of problem.patterns) expect(known.has(pattern)).toBe(true);
    }
    for (const pattern of sample.leetcode.suggestedPatterns) expect(known.has(pattern)).toBe(true);
  });

  it("makes both review cards due today, weakest first", () => {
    const today = formatLocalDate(now);
    expect(sample.due.length).toBe(2);
    for (const problem of sample.due) {
      expect(problem.nextReviewDate <= today).toBe(true);
      expect(problem.lastReviewed).not.toBeNull();
    }
    expect(sample.due[0].confidence).toBeLessThanOrEqual(sample.due[1].confidence);
  });

  it("matches the goal line: three done out of five, two still due", () => {
    expect(sample.goal).toEqual({ reviewedToday: 3, effectiveGoal: 5, totalDueCount: 2 });
  });

  it("gives the Progress sample a spread from weak to strong", () => {
    const byPattern = new Map<string, number[]>();
    for (const problem of sample.library) {
      for (const pattern of problem.patterns) {
        byPattern.set(pattern, [...(byPattern.get(pattern) ?? []), problem.confidence]);
      }
    }
    const averages = [...byPattern.values()].map((v) => v.reduce((a, b) => a + b, 0) / v.length);
    expect(Math.min(...averages)).toBeLessThan(2);
    expect(Math.max(...averages)).toBeGreaterThan(4);
    // Most patterns are in use; an untouched one or two is what a real library looks like.
    expect(byPattern.size).toBeGreaterThanOrEqual(CORE_PATTERNS.length - 2);
  });
});
