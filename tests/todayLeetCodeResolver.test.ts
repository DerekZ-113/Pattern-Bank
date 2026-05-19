import { describe, expect, it } from "vitest";
import { resolveTodayLeetCodeState } from "../src/utils/todayLeetCodeResolver";
import type { LeetCodeIgnoredImport, LeetCodeSubmission, Problem, ReviewEvent } from "../src/types";
import type { TodayLeetCodeCompletion } from "../src/utils/todayLeetCodeCompletions";

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-05-01",
    lastReviewed: null,
    nextReviewDate: "2026-05-15",
    fiveStarStreak: 0,
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSubmission(overrides: Partial<LeetCodeSubmission> = {}): LeetCodeSubmission {
  return {
    id: "sub-db-1",
    userId: "user-1",
    leetcodeUsername: "derek113",
    leetcodeSubmissionId: "lc-sub-1",
    titleSlug: "two-sum",
    title: "Two Sum",
    leetcodeNumber: 1,
    difficulty: "Easy",
    submittedAt: "2026-05-15T18:00:00.000Z",
    problemId: "p1",
    status: "linked_existing",
    createdAt: "2026-05-15T18:01:00.000Z",
    updatedAt: "2026-05-15T18:01:00.000Z",
    ...overrides,
  };
}

function makeCompletion(overrides: Partial<TodayLeetCodeCompletion> = {}): TodayLeetCodeCompletion {
  return {
    key: "slug:two-sum",
    date: "2026-05-15",
    submissionDbId: "sub-db-1",
    leetcodeSubmissionId: "lc-sub-1",
    titleSlug: "two-sum",
    leetcodeNumber: 1,
    problemId: "p1",
    action: "rated",
    completedAt: "2026-05-15T18:02:00.000Z",
    ...overrides,
  };
}

describe("resolveTodayLeetCodeState", () => {
  it("keeps a stale synced known solve out of From LeetCode and overlays it into Done today", () => {
    const result = resolveTodayLeetCodeState({
      problems: [makeProblem()],
      reviewEvents: [],
      leetcodeSubmissions: [
        makeSubmission({
          id: "fresh-row",
          leetcodeSubmissionId: "lc-sub-1",
          titleSlug: "two-sum-v2",
          leetcodeNumber: null,
          problemId: "p1",
          status: "linked_existing",
        }),
      ],
      ignoredImports: [],
      todayCompletions: [makeCompletion()],
      today: "2026-05-15",
    });

    expect(result.fromLeetCodeItems).toEqual([]);
    expect(result.doneTodayLeetCodeSubmissions[0]).toMatchObject({
      id: "fresh-row",
      status: "rated",
      problemId: "p1",
    });
  });

  it("keeps a linked-existing completion out of From LeetCode even though linked_existing is normally actionable", () => {
    const result = resolveTodayLeetCodeState({
      problems: [makeProblem()],
      reviewEvents: [],
      leetcodeSubmissions: [
        makeSubmission({
          status: "linked_existing",
          problemId: "p1",
        }),
      ],
      ignoredImports: [],
      todayCompletions: [
        makeCompletion({
          action: "linked_existing",
          problemId: "p1",
          titleSlug: "two-sum",
          leetcodeNumber: 1,
        }),
      ],
      today: "2026-05-15",
    });

    expect(result.fromLeetCodeItems).toEqual([]);
    expect(result.doneTodayLeetCodeSubmissions[0]).toMatchObject({
      status: "linked_existing",
      problemId: "p1",
    });
  });

  it("returns unmatched detected solves as actionable pending imports", () => {
    const result = resolveTodayLeetCodeState({
      problems: [],
      reviewEvents: [],
      leetcodeSubmissions: [makeSubmission({ problemId: null, status: "detected" })],
      ignoredImports: [] as LeetCodeIgnoredImport[],
      todayCompletions: [],
      today: "2026-05-15",
    });

    expect(result.fromLeetCodeItems).toHaveLength(1);
    expect(result.fromLeetCodeItems[0]).toMatchObject({
      kind: "pending_import",
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
    });
    expect(result.doneTodayLeetCodeSubmissions[0]).toMatchObject({
      id: "sub-db-1",
      status: "detected",
      problemId: null,
    });
  });

  it("filters known solves reviewed today even if raw sync status is stale", () => {
    const reviewEvents: ReviewEvent[] = [{
      date: "2026-05-15",
      problemId: "p1",
      confidence: 4,
      patterns: ["Hash Table"],
      timestamp: "2026-05-15T18:05:00.000Z",
    }];

    const result = resolveTodayLeetCodeState({
      problems: [makeProblem()],
      reviewEvents,
      leetcodeSubmissions: [makeSubmission({ status: "linked_existing" })],
      ignoredImports: [],
      todayCompletions: [],
      today: "2026-05-15",
    });

    expect(result.fromLeetCodeItems).toEqual([]);
    expect(result.doneTodayLeetCodeSubmissions[0]).toMatchObject({
      status: "rated",
      problemId: "p1",
    });
  });
});
