import { describe, it, expect } from "vitest";
import { mergeReviewEvents } from "../../src/sync/reviewEvents";
import { makeEvent } from "../helpers/syncTestUtils";

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

  it("does not resurrect pre-cutoff cloud events after a local prune", () => {
    const { events, addedFromCloud } = mergeReviewEvents(recentLocal, fullCloud, { prunedBefore });
    const resurrected = events.filter((event) => event.timestamp < prunedBefore);
    expect(resurrected).toEqual([]);
    expect(events.map((e) => e.problemId).sort()).toEqual(["p-recent-1", "p-recent-2"]);
    expect(addedFromCloud).toBe(0);
  });

  it("does not report pruned local survivors as local-only backfill", () => {
    const { localOnlyEvents } = mergeReviewEvents(recentLocal, fullCloud, { prunedBefore });
    expect(localOnlyEvents).toEqual([]);
  });

  it("keeps an event whose timestamp exactly equals the watermark", () => {
    const boundary = makeEvent({ problemId: "p-boundary", date: "2026-03-01", timestamp: prunedBefore });
    const { events } = mergeReviewEvents(recentLocal, [...fullCloud, boundary], { prunedBefore });
    expect(events.map((e) => e.problemId)).toContain("p-boundary");
  });

  it("is idempotent — merging the merged result with cloud again yields identical events", () => {
    const first = mergeReviewEvents(recentLocal, fullCloud, { prunedBefore });
    const second = mergeReviewEvents(first.events, fullCloud, { prunedBefore });
    expect(second.events).toEqual(first.events);
    expect(second.addedFromCloud).toBe(0);
  });

  it("resurrects nothing extra without a watermark either when histories already match", () => {
    const first = mergeReviewEvents(fullCloud, fullCloud);
    expect(first.events).toEqual(fullCloud);
    expect(first.addedFromCloud).toBe(0);
    expect(first.localOnlyEvents).toEqual([]);
  });
});
