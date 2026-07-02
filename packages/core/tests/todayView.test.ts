import { describe, expect, it } from "vitest";
import {
  buildDoneTodayFeedItems,
  buildRemovedTodayLeetCodeItems,
  buildSolvedOnLeetCodeTodayIndex,
  buildTodayActivityFeedItems,
  buildTodayLeetCodeItemKey,
  buildTodayReviewState,
} from "../src/todayView";
import type { LeetCodeSubmission, Problem, ReviewEvent, TodayLeetCodeItem } from "../src/types";

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
    nextReviewDate: "2026-05-14",
    updatedAt: "2026-05-01T12:00:00.000Z",
    ...overrides,
  };
}

function makeReviewEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    date: "2026-05-14",
    problemId: "p1",
    confidence: 4,
    patterns: ["Hash Table"],
    timestamp: "2026-05-14T21:14:00.000Z",
    ...overrides,
  };
}

function makeTodayItem(overrides: Partial<TodayLeetCodeItem> = {}): TodayLeetCodeItem {
  return {
    kind: "linked_existing",
    submissionDbId: "sub-db-1",
    leetcodeSubmissionId: "lc-sub-1",
    titleSlug: "two-sum",
    title: "Two Sum",
    leetcodeNumber: 1,
    difficulty: "Easy",
    submittedAt: "2026-05-15T18:00:00.000Z",
    suggestedPatterns: ["Hash Table"],
    matchedProblemId: "p1",
    status: "linked_existing",
    statusLabel: "Review due",
    confidence: 3,
    reviewedTodayConfidence: null,
    ...overrides,
  } as TodayLeetCodeItem;
}

function makeSubmission(overrides: Partial<LeetCodeSubmission> = {}): LeetCodeSubmission {
  return {
    id: "sub-1",
    userId: "user-1",
    leetcodeUsername: "derek113",
    leetcodeSubmissionId: "lc-sub-1",
    titleSlug: "two-sum",
    title: "Two Sum",
    leetcodeNumber: 1,
    difficulty: "Easy",
    submittedAt: "2026-05-14T21:30:00.000Z",
    problemId: "p1",
    status: "linked_existing",
    createdAt: "2026-05-14T21:31:00.000Z",
    updatedAt: "2026-05-14T21:31:00.000Z",
    ...overrides,
  };
}

describe("buildTodayReviewState", () => {
  it("filters due reviews by explicit today", () => {
    const state = buildTodayReviewState(
      [
        makeProblem({ id: "due", nextReviewDate: "2026-05-14" }),
        makeProblem({ id: "future", nextReviewDate: "2026-05-15" }),
      ],
      5,
      "2026-05-14",
    );

    expect(state.totalDueCount).toBe(1);
    expect(state.todaysReviews.map((p) => p.id)).toEqual(["due"]);
  });

  it("excludes problems marked excludeFromReview", () => {
    const state = buildTodayReviewState(
      [
        makeProblem({ id: "active", excludeFromReview: false }),
        makeProblem({ id: "excluded", excludeFromReview: true }),
      ],
      5,
      "2026-05-14",
    );

    expect(state.totalDueCount).toBe(1);
    expect(state.todaysReviews.map((p) => p.id)).toEqual(["active"]);
  });

  it("preserves daily-goal cap and remaining-slot behavior", () => {
    const state = buildTodayReviewState(
      [
        makeProblem({ id: "reviewed", lastReviewed: "2026-05-14" }),
        makeProblem({ id: "due-1", confidence: 1 }),
        makeProblem({ id: "due-2", confidence: 2 }),
        makeProblem({ id: "due-3", confidence: 3 }),
      ],
      2,
      "2026-05-14",
    );

    expect(state.reviewedToday).toBe(1);
    expect(state.effectiveGoal).toBe(2);
    expect(state.remainingSlots).toBe(1);
    expect(state.totalDueCount).toBe(4);
    expect(state.todaysReviews).toHaveLength(1);
  });
});

describe("buildDoneTodayFeedItems", () => {
  it("filters Done today to explicit today and returns the feed count", () => {
    const items = buildDoneTodayFeedItems(
      [makeProblem()],
      [
        makeReviewEvent({ date: "2026-05-14" }),
        makeReviewEvent({ date: "2026-05-13", timestamp: "2026-05-13T21:14:00.000Z" }),
      ],
      "2026-05-14",
    );

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Two Sum");
  });

  it("sorts Done today rows reverse chronological by timestamp", () => {
    const items = buildDoneTodayFeedItems(
      [
        makeProblem({ id: "early", title: "Early Problem" }),
        makeProblem({ id: "late", title: "Late Problem" }),
      ],
      [
        makeReviewEvent({ problemId: "early", timestamp: "2026-05-14T15:00:00.000Z" }),
        makeReviewEvent({ problemId: "late", timestamp: "2026-05-14T23:00:00.000Z" }),
      ],
      "2026-05-14",
    );

    expect(items.map((item) => item.title)).toEqual(["Late Problem", "Early Problem"]);
  });

  it("skips events whose problem no longer exists", () => {
    const items = buildDoneTodayFeedItems(
      [makeProblem({ id: "existing" })],
      [
        makeReviewEvent({ problemId: "missing" }),
        makeReviewEvent({ problemId: "existing" }),
      ],
      "2026-05-14",
    );

    expect(items).toHaveLength(1);
    expect(items[0].problemId).toBe("existing");
  });
});

describe("buildTodayActivityFeedItems", () => {
  it("creates PB review rows and linked LeetCode rows for today", () => {
    const items = buildTodayActivityFeedItems({
      problems: [
        makeProblem(),
        makeProblem({
          id: "p2",
          title: "Number of Islands",
          leetcodeNumber: 200,
          difficulty: "Medium",
          nextReviewDate: "2026-05-20",
        }),
      ],
      reviewEvents: [makeReviewEvent({ timestamp: "2026-05-14T22:00:00.000Z" })],
      leetcodeSubmissions: [
        makeSubmission({
          id: "sub-2",
          problemId: "p2",
          title: "Number of Islands",
          titleSlug: "number-of-islands",
          leetcodeNumber: 200,
          difficulty: "Medium",
          status: "linked_existing",
          submittedAt: "2026-05-14T21:00:00.000Z",
        }),
      ],
      today: "2026-05-14",
    });

    expect(items.map((item) => item.type)).toEqual(["pb_review", "leetcode_solve"]);
    expect(items[0]).toMatchObject({ type: "pb_review", problemId: "p1", confidence: 4 });
    expect(items[1]).toMatchObject({
      type: "leetcode_solve",
      submissionDbId: "sub-2",
      problemId: "p2",
      status: "linked_existing",
      canRate: false,
    });
  });

  it("excludes ignored submissions and detected pending imports from Done Today", () => {
    const items = buildTodayActivityFeedItems({
      problems: [makeProblem()],
      reviewEvents: [],
      leetcodeSubmissions: [
        makeSubmission({ id: "ignored", status: "ignored" }),
        makeSubmission({ id: "detected", status: "detected", problemId: null, leetcodeNumber: 200 }),
      ],
      today: "2026-05-14",
    });

    expect(items).toEqual([]);
  });

  it("matches LeetCode rows by leetcodeNumber when problemId is not present", () => {
    const items = buildTodayActivityFeedItems({
      problems: [makeProblem({ id: "local-two-sum", leetcodeNumber: 1 })],
      reviewEvents: [],
      leetcodeSubmissions: [makeSubmission({ problemId: null, status: "imported" })],
      today: "2026-05-14",
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "leetcode_solve",
      problemId: "local-two-sum",
      status: "imported",
    });
  });

  it("treats a detected LeetCode submission as Done Today when it matches a local problem by leetcodeNumber", () => {
    const items = buildTodayActivityFeedItems({
      problems: [makeProblem({ id: "local-two-sum", leetcodeNumber: 1, nextReviewDate: "2026-05-14" })],
      reviewEvents: [],
      leetcodeSubmissions: [makeSubmission({ problemId: null, status: "detected" })],
      today: "2026-05-14",
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "leetcode_solve",
      submissionDbId: "sub-1",
      problemId: "local-two-sum",
      status: "linked_existing",
      reviewDue: true,
      canRate: true,
    });
  });

  it("treats a detected LeetCode submission as Done Today when it matches a local problem by problemId", () => {
    const items = buildTodayActivityFeedItems({
      problems: [makeProblem({ id: "local-two-sum", leetcodeNumber: 1, nextReviewDate: "2026-05-20" })],
      reviewEvents: [],
      leetcodeSubmissions: [makeSubmission({ problemId: "local-two-sum", status: "detected" })],
      today: "2026-05-14",
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "leetcode_solve",
      problemId: "local-two-sum",
      status: "linked_existing",
      reviewDue: false,
      canRate: false,
    });
  });

  it("keeps unmatched detected LeetCode submissions out of Done Today", () => {
    const items = buildTodayActivityFeedItems({
      problems: [makeProblem({ id: "different-problem", leetcodeNumber: 999 })],
      reviewEvents: [],
      leetcodeSubmissions: [makeSubmission({ problemId: null, status: "detected" })],
      today: "2026-05-14",
    });

    expect(items).toEqual([]);
  });

  it("sets canRate only for due local problems that were not already reviewed today", () => {
    const dueItems = buildTodayActivityFeedItems({
      problems: [makeProblem({ nextReviewDate: "2026-05-14", lastReviewed: null })],
      reviewEvents: [],
      leetcodeSubmissions: [makeSubmission()],
      today: "2026-05-14",
    });
    const excludedItems = buildTodayActivityFeedItems({
      problems: [makeProblem({ excludeFromReview: true, nextReviewDate: "2026-05-14" })],
      reviewEvents: [],
      leetcodeSubmissions: [makeSubmission()],
      today: "2026-05-14",
    });
    const reviewedItems = buildTodayActivityFeedItems({
      problems: [makeProblem({ nextReviewDate: "2026-05-14", lastReviewed: "2026-05-14" })],
      reviewEvents: [],
      leetcodeSubmissions: [makeSubmission()],
      today: "2026-05-14",
    });

    expect(dueItems[0]).toMatchObject({ type: "leetcode_solve", canRate: true, reviewDue: true });
    expect(excludedItems[0]).toMatchObject({ type: "leetcode_solve", canRate: false, reviewDue: false });
    expect(reviewedItems[0]).toMatchObject({ type: "leetcode_solve", canRate: false, reviewDue: true });
  });

  it("renders only the PB review row when a LeetCode solve was reviewed later the same day", () => {
    const items = buildTodayActivityFeedItems({
      problems: [makeProblem()],
      reviewEvents: [makeReviewEvent({ timestamp: "2026-05-14T21:35:00.000Z" })],
      leetcodeSubmissions: [makeSubmission({ submittedAt: "2026-05-14T21:30:00.000Z" })],
      today: "2026-05-14",
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: "pb_review", problemId: "p1" });
  });

  it("sorts PB and LeetCode rows reverse chronological", () => {
    const items = buildTodayActivityFeedItems({
      problems: [
        makeProblem({ id: "p1", leetcodeNumber: 1 }),
        makeProblem({ id: "p2", title: "LRU Cache", leetcodeNumber: 146 }),
      ],
      reviewEvents: [makeReviewEvent({ problemId: "p1", timestamp: "2026-05-14T20:00:00.000Z" })],
      leetcodeSubmissions: [
        makeSubmission({
          id: "sub-late",
          problemId: "p2",
          title: "LRU Cache",
          leetcodeNumber: 146,
          submittedAt: "2026-05-14T23:00:00.000Z",
          status: "rated",
        }),
      ],
      today: "2026-05-14",
    });

    expect(items.map((item) => item.title)).toEqual(["LRU Cache", "Two Sum"]);
  });
});

describe("buildSolvedOnLeetCodeTodayIndex", () => {
  it("indexes solved LeetCode problem ids and numbers for the current local day", () => {
    const index = buildSolvedOnLeetCodeTodayIndex([makeSubmission()], "2026-05-14");

    expect(index.problemIds.has("p1")).toBe(true);
    expect(index.leetcodeNumbers.has(1)).toBe(true);
  });
});

describe("buildTodayActivityFeedItems — LeetCode row dedupe (mobile union)", () => {
  it("dedupes LeetCode Done Today rows by problem and keeps stronger status", () => {
    const items = buildTodayActivityFeedItems({
      problems: [makeProblem({ id: "p1", leetcodeNumber: 1, nextReviewDate: "2026-05-16" })],
      reviewEvents: [],
      leetcodeSubmissions: [
        makeSubmission({ id: "linked", status: "linked_existing", submittedAt: "2026-05-14T18:00:00.000Z" }),
        makeSubmission({ id: "rated", status: "rated", submittedAt: "2026-05-14T17:00:00.000Z" }),
      ],
      today: "2026-05-14",
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: "leetcode_solve", status: "rated", submissionDbId: "rated" });
  });
});

describe("buildSolvedOnLeetCodeTodayIndex — filtering (mobile union)", () => {
  it("indexes LeetCode solves from today only", () => {
    const index = buildSolvedOnLeetCodeTodayIndex([
      makeSubmission({ problemId: "today", leetcodeNumber: 1, submittedAt: "2026-05-14T18:00:00.000Z" }),
      makeSubmission({ problemId: "old", leetcodeNumber: 2, submittedAt: "2026-05-13T18:00:00.000Z" }),
      makeSubmission({ problemId: "ignored", leetcodeNumber: 3, status: "ignored", submittedAt: "2026-05-14T18:00:00.000Z" }),
    ], "2026-05-14");

    expect(index.problemIds.has("today")).toBe(true);
    expect(index.leetcodeNumbers.has(1)).toBe(true);
    expect(index.problemIds.has("old")).toBe(false);
    expect(index.problemIds.has("ignored")).toBe(false);
  });
});

describe("buildTodayLeetCodeItemKey", () => {
  it("builds stable LeetCode item keys with completion identity priority", () => {
    expect(buildTodayLeetCodeItemKey(makeTodayItem({ titleSlug: "two-sum", leetcodeNumber: 1 }))).toBe("slug:two-sum");
    expect(buildTodayLeetCodeItemKey(makeTodayItem({ titleSlug: "", leetcodeNumber: 1 }))).toBe("number:1");
    expect(buildTodayLeetCodeItemKey(makeTodayItem({ titleSlug: "", leetcodeNumber: null, matchedProblemId: "p1" }))).toBe("problem:p1");
    expect(buildTodayLeetCodeItemKey(makeTodayItem({
      titleSlug: "",
      leetcodeNumber: null,
      matchedProblemId: null,
      leetcodeSubmissionId: "lc-sub-1",
    }))).toBe("leetcode-submission:lc-sub-1");
  });
});

describe("buildRemovedTodayLeetCodeItems", () => {
  it("returns only newly removed LeetCode rows that are not already exiting", () => {
    const kept = makeTodayItem({ submissionDbId: "kept", titleSlug: "kept" });
    const removed = makeTodayItem({ submissionDbId: "removed", titleSlug: "removed" });
    const alreadyExiting = makeTodayItem({ submissionDbId: "already", titleSlug: "already" });

    const removedItems = buildRemovedTodayLeetCodeItems({
      previousItems: [kept, removed, alreadyExiting],
      currentItems: [kept],
      exitingKeys: new Set([buildTodayLeetCodeItemKey(alreadyExiting)]),
    });

    expect(removedItems).toEqual([{
      key: buildTodayLeetCodeItemKey(removed),
      item: removed,
    }]);
  });
});
