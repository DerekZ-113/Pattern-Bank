import type { Confidence, Difficulty, Problem } from "./types";

// Search, filter and sort for the problem list. One rule for the web app and
// the iOS app (PatternBankKit/ProblemQuery.swift is the Swift twin), so the
// two lists cannot drift apart again.

export type ProblemSortKey = "leetcodeNumber" | "dateAdded" | "confidence" | "nextReview";
export type ProblemReviewStatusFilter = "all" | "active" | "excluded";

export interface ProblemQuery {
  /** Matched against title, notes and problem number; case and surrounding spaces ignored. */
  search: string;
  /** A pattern name, or null for every pattern. */
  pattern: string | null;
  difficulty: Difficulty | null;
  confidence: Confidence | null;
  reviewStatus: ProblemReviewStatusFilter;
  sortBy: ProblemSortKey;
}

export const DEFAULT_PROBLEM_QUERY: ProblemQuery = {
  search: "",
  pattern: null,
  difficulty: null,
  confidence: null,
  reviewStatus: "all",
  sortBy: "leetcodeNumber",
};

/** True when the query narrows the list. The sort alone does not count. */
export function hasActiveProblemFilters(query: ProblemQuery): boolean {
  return Boolean(
    query.search ||
      query.pattern !== null ||
      query.difficulty !== null ||
      query.confidence !== null ||
      query.reviewStatus !== "all",
  );
}

function matches(problem: Problem, query: ProblemQuery, search: string): boolean {
  if (
    search &&
    !problem.title.toLowerCase().includes(search) &&
    !(problem.notes && problem.notes.toLowerCase().includes(search)) &&
    !(problem.leetcodeNumber && String(problem.leetcodeNumber).includes(search))
  ) {
    return false;
  }
  if (query.pattern !== null && !problem.patterns.includes(query.pattern)) return false;
  if (query.difficulty !== null && problem.difficulty !== query.difficulty) return false;
  if (query.confidence !== null && problem.confidence !== query.confidence) return false;
  if (query.reviewStatus === "active" && problem.excludeFromReview) return false;
  if (query.reviewStatus === "excluded" && !problem.excludeFromReview) return false;
  return true;
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function compare(a: Problem, b: Problem, sortBy: ProblemSortKey): number {
  switch (sortBy) {
    case "dateAdded":
      return compareStrings(b.dateAdded, a.dateAdded); // newest first
    case "confidence":
      return a.confidence - b.confidence;
    case "nextReview":
      return compareStrings(a.nextReviewDate, b.nextReviewDate);
    case "leetcodeNumber":
      // Problems without a number go last.
      if (a.leetcodeNumber == null && b.leetcodeNumber == null) return 0;
      if (a.leetcodeNumber == null) return 1;
      if (b.leetcodeNumber == null) return -1;
      return a.leetcodeNumber - b.leetcodeNumber;
  }
}

/**
 * The problems that match the query, in its sort order. Problems that tie
 * keep the order they were given in. The input is not changed.
 */
export function queryProblems(problems: readonly Problem[], query: ProblemQuery): Problem[] {
  const search = query.search.toLowerCase().trim();
  return problems
    .filter((problem) => matches(problem, query, search))
    .sort((a, b) => compare(a, b, query.sortBy));
}
