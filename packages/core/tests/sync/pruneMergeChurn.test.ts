import { describe, it, expect } from "vitest";
import type { ReviewEvent } from "../../../../src/types";
import { mergeReviewEvents } from "../../../../src/utils/sync";

function makeEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    date: "2026-03-10",
    problemId: "prob-1",
    confidence: 3,
    patterns: ["Two Pointers"],
    timestamp: "2026-03-10T12:00:00.000Z",
    ...overrides,
  };
}

// F-3 acceptance: local review events older than a prune cutoff were removed
// locally (storage-size housekeeping). Cloud still holds the full history.
// Merging must NOT resurrect the pre-cutoff cloud events — otherwise every
// sync re-adds what pruning removed (prune/merge churn).
describe("mergeReviewEvents — F-3 prune churn", () => {
  const prunedBefore = "2026-03-01T00:00:00.000Z";

  // Local was pruned: only events at/after the cutoff remain.
  const recentLocal = [
    makeEvent({ problemId: "p-recent-1", date: "2026-03-05", timestamp: "2026-03-05T10:00:00.000Z" }),
    makeEvent({ problemId: "p-recent-2", date: "2026-03-10", timestamp: "2026-03-10T10:00:00.000Z" }),
  ];

  // Cloud has full history, including events from before the cutoff.
  const fullCloud = [
    makeEvent({ problemId: "p-old-1", date: "2026-01-15", timestamp: "2026-01-15T10:00:00.000Z" }),
    makeEvent({ problemId: "p-old-2", date: "2026-02-20", timestamp: "2026-02-20T10:00:00.000Z" }),
    makeEvent({ problemId: "p-recent-1", date: "2026-03-05", timestamp: "2026-03-05T10:00:00.000Z" }),
    makeEvent({ problemId: "p-recent-2", date: "2026-03-10", timestamp: "2026-03-10T10:00:00.000Z" }),
  ];

  // Desired (core) behavior: merge respects the prune watermark and drops
  // pre-cutoff cloud events. Web's 2-arg mergeReviewEvents has no cutoff
  // concept and re-adds them.
  // FIXED-BY: Phase 5 (F-3 prune watermark; call gains {prunedBefore} option)
  it.fails("does not resurrect pre-cutoff cloud events after a local prune", () => {
    const { events } = mergeReviewEvents(recentLocal, fullCloud);
    const resurrected = events.filter((event) => event.timestamp < prunedBefore);
    expect(resurrected).toEqual([]);
    expect(events.map((e) => e.problemId).sort()).toEqual(["p-recent-1", "p-recent-2"]);
  });

  it("is idempotent — merging the merged result with cloud again yields identical events", () => {
    const first = mergeReviewEvents(recentLocal, fullCloud);
    const second = mergeReviewEvents(first.events, fullCloud);
    expect(second.events).toEqual(first.events);
    expect(second.addedFromCloud).toBe(0);
  });
});
