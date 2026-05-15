import { describe, expect, it } from "vitest";
import {
  buildDoneTodayFeedItems,
  buildTodayReviewState,
} from "../src/utils/todayView";
import type { Problem, ReviewEvent } from "../src/types";

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
