import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildNewProblems,
  buildReviewedProblem,
  computeReviewProgress,
  filterExistingProblems,
  mergeImportedProblems,
} from "../src/problemTransforms";
import { prioritizeProblems } from "../src/spacedRepetition";
import type { Confidence, LeetCodeProblem, Problem } from "../src/types";

// Helper to create a test problem
function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "test-1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    dateAdded: "2026-03-01",
    lastReviewed: "2026-03-10",
    nextReviewDate: "2026-03-10",
    updatedAt: "2026-03-10T00:00:00Z",
    excludeFromReview: false,
    ...overrides,
  };
}

// Simulates the Today review filtering logic
function filterDueProblems(problems: Problem[], today: string): Problem[] {
  return problems.filter((p) => p.nextReviewDate <= today && !p.excludeFromReview);
}

// Simulates the AllProblemsView review status filter
function filterByReviewStatus(problems: Problem[], status: string): Problem[] {
  if (status === "active") return problems.filter((p) => !p.excludeFromReview);
  if (status === "excluded") return problems.filter((p) => p.excludeFromReview);
  return problems;
}

describe("Exclude from Review — Due List Filtering", () => {
  const today = "2026-03-13";

  it("includes non-excluded due problems", () => {
    const problems = [makeProblem({ nextReviewDate: "2026-03-12" })];
    const due = filterDueProblems(problems, today);
    expect(due).toHaveLength(1);
  });

  it("excludes problems with excludeFromReview: true", () => {
    const problems = [
      makeProblem({ id: "a", nextReviewDate: "2026-03-12", excludeFromReview: true }),
    ];
    const due = filterDueProblems(problems, today);
    expect(due).toHaveLength(0);
  });

  it("handles mix of excluded and active problems", () => {
    const problems = [
      makeProblem({ id: "a", nextReviewDate: "2026-03-10", excludeFromReview: false }),
      makeProblem({ id: "b", nextReviewDate: "2026-03-10", excludeFromReview: true }),
      makeProblem({ id: "c", nextReviewDate: "2026-03-10", excludeFromReview: false }),
    ];
    const due = filterDueProblems(problems, today);
    expect(due).toHaveLength(2);
    expect(due.map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("treats problems without excludeFromReview field as active (backward compat)", () => {
    const problem = makeProblem({ nextReviewDate: "2026-03-12" }) as Partial<Problem>;
    delete problem.excludeFromReview;
    const due = filterDueProblems([problem as Problem], today);
    expect(due).toHaveLength(1);
  });

  it("treats excludeFromReview: false as active", () => {
    const problems = [makeProblem({ nextReviewDate: "2026-03-12", excludeFromReview: false })];
    const due = filterDueProblems(problems, today);
    expect(due).toHaveLength(1);
  });

  it("does not include future problems even if not excluded", () => {
    const problems = [makeProblem({ nextReviewDate: "2026-03-20", excludeFromReview: false })];
    const due = filterDueProblems(problems, today);
    expect(due).toHaveLength(0);
  });
});

describe("Exclude from Review — AllProblemsView Filter", () => {
  const problems = [
    makeProblem({ id: "a", excludeFromReview: false }),
    makeProblem({ id: "b", excludeFromReview: true }),
    makeProblem({ id: "c", excludeFromReview: false }),
  ];

  it("shows all problems when filter is 'all'", () => {
    expect(filterByReviewStatus(problems, "all")).toHaveLength(3);
  });

  it("shows only active problems when filter is 'active'", () => {
    const result = filterByReviewStatus(problems, "active");
    expect(result).toHaveLength(2);
    expect(result.every((p) => !p.excludeFromReview)).toBe(true);
  });

  it("shows only excluded problems when filter is 'excluded'", () => {
    const result = filterByReviewStatus(problems, "excluded");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });
});

describe("Exclude from Review — Toggle Logic", () => {
  it("flips excludeFromReview from false to true", () => {
    const problem = makeProblem({ excludeFromReview: false });
    const toggled = { ...problem, excludeFromReview: !problem.excludeFromReview };
    expect(toggled.excludeFromReview).toBe(true);
  });

  it("flips excludeFromReview from true to false", () => {
    const problem = makeProblem({ excludeFromReview: true });
    const toggled = { ...problem, excludeFromReview: !problem.excludeFromReview };
    expect(toggled.excludeFromReview).toBe(false);
  });

  it("does not mutate the original problem", () => {
    const problem = makeProblem({ excludeFromReview: false });
    const toggled = { ...problem, excludeFromReview: !problem.excludeFromReview };
    expect(problem.excludeFromReview).toBe(false);
    expect(toggled.excludeFromReview).toBe(true);
  });
});

describe("Exclude from Review — transforms (mobile union)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 14, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("buildNewProblems sets excludeFromReview: false", () => {
    const lc = [{ n: 1, t: "Two Sum", s: "two-sum", d: "Easy" }] as LeetCodeProblem[];
    const result = buildNewProblems(lc, {
      today: "2026-03-14",
      now: "2026-03-14T12:00:00.000Z",
      dailyGoal: 5,
      patternMap: null,
    });
    expect(result[0].excludeFromReview).toBe(false);
  });

  it("buildReviewedProblem preserves excludeFromReview", () => {
    const problem = makeProblem({ excludeFromReview: true });
    const result = buildReviewedProblem(problem, 4 as Confidence);
    expect(result.excludeFromReview).toBe(true);
  });

  it("filterExistingProblems ignores excludeFromReview", () => {
    const lc = [{ n: 1 }, { n: 2 }] as LeetCodeProblem[];
    const existing = [makeProblem({ leetcodeNumber: 1, excludeFromReview: true })];
    const { newProblems } = filterExistingProblems(lc, existing);
    // Problem 1 is still filtered even though excluded
    expect(newProblems).toHaveLength(1);
    expect(newProblems[0].n).toBe(2);
  });

  it("computeReviewProgress excludes problems with excludeFromReview from totalDue", () => {
    const problems = [
      makeProblem({ id: "a", excludeFromReview: true, nextReviewDate: "2026-03-10", lastReviewed: null }),
      makeProblem({ id: "b", excludeFromReview: false, nextReviewDate: "2026-03-10", lastReviewed: null }),
    ];
    const { totalDue } = computeReviewProgress(problems, 5);
    expect(totalDue).toBe(1);
  });

  it("mergeImportedProblems preserves excludeFromReview", () => {
    const existing = [makeProblem({ id: "a", excludeFromReview: false, updatedAt: "2026-01-01T00:00:00.000Z" })];
    const imported = [makeProblem({ id: "a", excludeFromReview: true, updatedAt: "2026-02-01T00:00:00.000Z" })];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems[0].excludeFromReview).toBe(true);
  });

  it("prioritizeProblems includes excluded problems (caller filters)", () => {
    const problems = [
      makeProblem({ id: "a", excludeFromReview: true, confidence: 1 as Confidence, nextReviewDate: "2026-03-10" }),
      makeProblem({ id: "b", excludeFromReview: false, confidence: 2 as Confidence, nextReviewDate: "2026-03-10" }),
    ];
    const result = prioritizeProblems(problems, 5);
    // prioritizeProblems does NOT filter by excludeFromReview — that's the caller's job
    expect(result).toHaveLength(2);
  });
});
