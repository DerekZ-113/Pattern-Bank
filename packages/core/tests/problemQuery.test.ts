import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROBLEM_QUERY,
  hasActiveProblemFilters,
  queryProblems,
  type ProblemQuery,
} from "../src/problemQuery";
import type { Problem } from "../src/types";

// The same cases, with the same ids, are in PatternBankKit's
// ProblemQueryTests.swift. Change one side and the other must follow.

function problem(overrides: Partial<Problem> & { id: string }): Problem {
  return {
    title: "Two Sum",
    leetcodeNumber: null,
    url: null,
    difficulty: "Medium",
    patterns: [],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-03-01",
    lastReviewed: null,
    nextReviewDate: "2026-03-10",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  } as Problem;
}

const query = (overrides: Partial<ProblemQuery> = {}): ProblemQuery => ({
  ...DEFAULT_PROBLEM_QUERY,
  ...overrides,
});

const ids = (problems: Problem[]) => problems.map((p) => p.id);

describe("queryProblems: search", () => {
  const problems = [
    problem({ id: "a", title: "Two Sum", leetcodeNumber: 1 }),
    problem({ id: "b", title: "Best Time to Buy and Sell Stock", leetcodeNumber: 121, notes: "Track the running minimum" }),
    problem({ id: "c", title: "Burst Balloons", leetcodeNumber: 312 }),
    problem({ id: "d", title: "My own problem", leetcodeNumber: null, notes: "sum of pairs" }),
  ];

  it("matches the title without regard to case, ignoring surrounding spaces", () => {
    expect(ids(queryProblems(problems, query({ search: "  bURST " })))).toEqual(["c"]);
  });

  it("matches the notes", () => {
    expect(ids(queryProblems(problems, query({ search: "running min" })))).toEqual(["b"]);
  });

  it("matches any part of the problem number", () => {
    expect(ids(queryProblems(problems, query({ search: "12" })))).toEqual(["b", "c"]);
  });

  it("matches title or notes for the same text", () => {
    expect(ids(queryProblems(problems, query({ search: "sum" })))).toEqual(["a", "d"]);
  });

  it("returns everything for a search of only spaces", () => {
    expect(queryProblems(problems, query({ search: "   " }))).toHaveLength(4);
  });
});

describe("queryProblems: filters", () => {
  const problems = [
    problem({ id: "a", leetcodeNumber: 1, patterns: ["Array", "Hash Table"], difficulty: "Easy", confidence: 5 }),
    problem({ id: "b", leetcodeNumber: 2, patterns: ["Linked List"], difficulty: "Medium", confidence: 2, excludeFromReview: true }),
    problem({ id: "c", leetcodeNumber: 3, patterns: ["Hash Table", "Sliding Window"], difficulty: "Medium", confidence: 2 }),
    problem({ id: "d", leetcodeNumber: 4, patterns: ["Binary Search"], difficulty: "Hard", confidence: 1 }),
  ];

  it("keeps problems that carry the pattern", () => {
    expect(ids(queryProblems(problems, query({ pattern: "Hash Table" })))).toEqual(["a", "c"]);
  });

  it("keeps problems of the difficulty", () => {
    expect(ids(queryProblems(problems, query({ difficulty: "Medium" })))).toEqual(["b", "c"]);
  });

  it("keeps problems at the confidence", () => {
    expect(ids(queryProblems(problems, query({ confidence: 2 })))).toEqual(["b", "c"]);
  });

  it("separates active from excluded", () => {
    expect(ids(queryProblems(problems, query({ reviewStatus: "active" })))).toEqual(["a", "c", "d"]);
    expect(ids(queryProblems(problems, query({ reviewStatus: "excluded" })))).toEqual(["b"]);
  });

  it("applies every filter together", () => {
    const result = queryProblems(
      problems,
      query({ pattern: "Hash Table", difficulty: "Medium", confidence: 2, reviewStatus: "active", search: "two" }),
    );
    expect(ids(result)).toEqual(["c"]);
  });
});

describe("queryProblems: sort", () => {
  it("defaults to problem number, lowest first, with unnumbered problems last in their given order", () => {
    const problems = [
      problem({ id: "custom-1", leetcodeNumber: null }),
      problem({ id: "n200", leetcodeNumber: 200 }),
      problem({ id: "custom-2", leetcodeNumber: null }),
      problem({ id: "n15", leetcodeNumber: 15 }),
    ];
    expect(DEFAULT_PROBLEM_QUERY.sortBy).toBe("leetcodeNumber");
    expect(ids(queryProblems(problems, query()))).toEqual(["n15", "n200", "custom-1", "custom-2"]);
  });

  it("sorts by date added, newest first, keeping the given order on the same day", () => {
    const problems = [
      problem({ id: "old", dateAdded: "2026-01-05" }),
      problem({ id: "new-1", dateAdded: "2026-03-01" }),
      problem({ id: "mid", dateAdded: "2026-02-10" }),
      problem({ id: "new-2", dateAdded: "2026-03-01" }),
    ];
    expect(ids(queryProblems(problems, query({ sortBy: "dateAdded" })))).toEqual(["new-1", "new-2", "mid", "old"]);
  });

  it("sorts by confidence, lowest first, keeping the given order inside a level", () => {
    const problems = [
      problem({ id: "five", confidence: 5 }),
      problem({ id: "two-a", confidence: 2 }),
      problem({ id: "one", confidence: 1 }),
      problem({ id: "two-b", confidence: 2 }),
    ];
    expect(ids(queryProblems(problems, query({ sortBy: "confidence" })))).toEqual(["one", "two-a", "two-b", "five"]);
  });

  it("sorts by next review, soonest first, keeping the given order on the same day", () => {
    const problems = [
      problem({ id: "later", nextReviewDate: "2026-04-01" }),
      problem({ id: "soon-1", nextReviewDate: "2026-03-10" }),
      problem({ id: "soon-2", nextReviewDate: "2026-03-10" }),
      problem({ id: "soonest", nextReviewDate: "2026-03-02" }),
    ];
    expect(ids(queryProblems(problems, query({ sortBy: "nextReview" })))).toEqual(["soonest", "soon-1", "soon-2", "later"]);
  });

  it("does not change the list it was given", () => {
    const problems = [problem({ id: "b", leetcodeNumber: 2 }), problem({ id: "a", leetcodeNumber: 1 })];
    queryProblems(problems, query());
    expect(ids(problems)).toEqual(["b", "a"]);
  });
});

describe("hasActiveProblemFilters", () => {
  it("is false for the default query and for a different sort alone", () => {
    expect(hasActiveProblemFilters(DEFAULT_PROBLEM_QUERY)).toBe(false);
    expect(hasActiveProblemFilters(query({ sortBy: "confidence" }))).toBe(false);
  });

  it("is true for any search text or filter", () => {
    expect(hasActiveProblemFilters(query({ search: "x" }))).toBe(true);
    expect(hasActiveProblemFilters(query({ pattern: "Array" }))).toBe(true);
    expect(hasActiveProblemFilters(query({ difficulty: "Hard" }))).toBe(true);
    expect(hasActiveProblemFilters(query({ confidence: 4 }))).toBe(true);
    expect(hasActiveProblemFilters(query({ reviewStatus: "excluded" }))).toBe(true);
  });
});
