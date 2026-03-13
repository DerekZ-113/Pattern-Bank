import { describe, it, expect } from "vitest";

// Helper to create a test problem
function makeProblem(overrides = {}) {
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

// Simulates the DashboardView filtering logic
function filterDueProblems(problems, today) {
  return problems.filter((p) => p.nextReviewDate <= today && !p.excludeFromReview);
}

// Simulates the AllProblemsView review status filter
function filterByReviewStatus(problems, status) {
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
    const problem = makeProblem({ nextReviewDate: "2026-03-12" });
    delete problem.excludeFromReview;
    const due = filterDueProblems([problem], today);
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
