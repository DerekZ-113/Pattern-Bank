import { describe, expect, it } from "vitest";
import { buildTodayDemoSeedData } from "../src/utils/devSeed";
import type { Problem } from "../src/types";

const baseDate = new Date(2026, 4, 14, 9, 30);
const today = "2026-05-14";

function expectCompleteProblem(problem: Problem) {
  expect(problem.id).toBeTruthy();
  expect(problem.title).toBeTruthy();
  expect(problem.difficulty).toMatch(/Easy|Medium|Hard/);
  expect(Array.isArray(problem.patterns)).toBe(true);
  expect(problem.confidence).toBeGreaterThanOrEqual(1);
  expect(problem.confidence).toBeLessThanOrEqual(5);
  expect(typeof problem.notes).toBe("string");
  expect(typeof problem.excludeFromReview).toBe("boolean");
  expect(problem.dateAdded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(problem.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(problem.fiveStarStreak).toBeGreaterThanOrEqual(0);
  expect(problem.updatedAt).toBeTruthy();
}

describe("buildTodayDemoSeedData", () => {
  it("builds a realistic demo library with required problem fields", () => {
    const data = buildTodayDemoSeedData(baseDate);

    expect(data.problems.length).toBeGreaterThanOrEqual(10);
    data.problems.forEach(expectCompleteProblem);
  });

  it("contains due problems and not-due problems for Today testing", () => {
    const data = buildTodayDemoSeedData(baseDate);
    const dueProblems = data.problems.filter((p) => p.nextReviewDate <= today && !p.excludeFromReview);
    const notDueProblems = data.problems.filter((p) => p.nextReviewDate > today && !p.excludeFromReview);

    expect(dueProblems.map((p) => p.title)).toEqual(
      expect.arrayContaining([
        "Two Sum",
        "Merge k Sorted Lists",
        "Longest Palindromic Substring",
        "Daily Temperatures",
      ]),
    );
    expect(notDueProblems.map((p) => p.title)).toEqual(
      expect.arrayContaining(["Binary Search", "Number of Islands", "Coin Change"]),
    );
  });

  it("contains an excluded problem that is overdue but not reviewable", () => {
    const data = buildTodayDemoSeedData(baseDate);
    const excluded = data.problems.find((p) => p.title === "Valid Palindrome");

    expect(excluded).toBeTruthy();
    expect(excluded?.excludeFromReview).toBe(true);
    expect(excluded!.nextReviewDate < today).toBe(true);
  });

  it("contains at least three local-today review events for Done today", () => {
    const data = buildTodayDemoSeedData(baseDate);
    const todaysEvents = data.reviewEvents.filter((event) => event.date === today);

    expect(todaysEvents).toHaveLength(3);
    expect(todaysEvents.map((event) => event.problemId)).toEqual(
      expect.arrayContaining([
        "demo-lru-cache",
        "demo-group-anagrams",
        "demo-max-depth-binary-tree",
      ]),
    );
  });

  it("uses retuned SRS schedules for reviewed-today demo problems", () => {
    const data = buildTodayDemoSeedData(baseDate);
    const lru = data.problems.find((p) => p.id === "demo-lru-cache");
    const anagrams = data.problems.find((p) => p.id === "demo-group-anagrams");
    const maxDepth = data.problems.find((p) => p.id === "demo-max-depth-binary-tree");

    expect(lru?.nextReviewDate).toBe("2026-05-24");
    expect(lru?.fiveStarStreak).toBe(0);
    expect(anagrams?.nextReviewDate).toBe("2026-05-19");
    expect(anagrams?.fiveStarStreak).toBe(0);
    expect(maxDepth?.nextReviewDate).toBe("2026-06-13");
    expect(maxDepth?.fiveStarStreak).toBe(1);
  });

  it("seeds recent review log days and demo preferences", () => {
    const data = buildTodayDemoSeedData(baseDate);

    expect(data.reviewLog.map((entry) => entry.date)).toEqual(
      expect.arrayContaining([today, "2026-05-13", "2026-05-12"]),
    );
    expect(data.preferences).toEqual({
      dailyReviewGoal: 5,
      hidePatternsDuringReview: false,
      enabledExtraPatterns: ["Mono Stack", "Intervals", "Prefix Sum", "OOD"],
    });
  });
});
