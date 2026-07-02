// Consolidated pure-merge suite: union of web tests/sync.test.ts and the
// pure-merge halves of mobile src/utils/__tests__/sync.test.ts, deduplicated,
// running against the core implementations.
import { describe, it, expect } from "vitest";
import {
  mergeProblems,
  mergeProblemTombstones,
  mergeReviewLog,
  filterTombstonedProblems,
  filterTombstonesAfterDataReset,
} from "../../src/sync/merge";
import { mergeReviewEvents } from "../../src/sync/reviewEvents";
import { makeEntry, makeEvent, makeProblem } from "../helpers/syncTestUtils";

describe("mergeProblems", () => {
  it("returns local problems when cloud is empty", () => {
    const local = [makeProblem({ id: "a" }), makeProblem({ id: "b" })];
    const { problems, cloudAdded, cloudWon } = mergeProblems(local, []);
    expect(problems).toHaveLength(2);
    expect(problems.map((p) => p.id).sort()).toEqual(["a", "b"]);
    expect(cloudAdded).toBe(0);
    expect(cloudWon).toBe(0);
  });

  it("returns cloud problems when local is empty", () => {
    const cloud = [makeProblem({ id: "c" }), makeProblem({ id: "d" })];
    const { problems, cloudAdded, cloudWon } = mergeProblems([], cloud);
    expect(problems).toHaveLength(2);
    expect(problems.map((p) => p.id).sort()).toEqual(["c", "d"]);
    expect(cloudAdded).toBe(2);
    expect(cloudWon).toBe(0);
  });

  it("unions local-only and cloud-only problems", () => {
    const local = [makeProblem({ id: "local-1" }), makeProblem({ id: "local-2" })];
    const cloud = [makeProblem({ id: "cloud-1" }), makeProblem({ id: "cloud-2" })];
    const { problems, cloudAdded, cloudWon } = mergeProblems(local, cloud);
    expect(problems).toHaveLength(4);
    expect(problems.map((p) => p.id).sort()).toEqual(["cloud-1", "cloud-2", "local-1", "local-2"]);
    expect(cloudAdded).toBe(2);
    expect(cloudWon).toBe(0);
  });

  it("keeps local version when updatedAt is equal (local wins on tie)", () => {
    const ts = "2026-03-10T00:00:00.000Z";
    const local = makeProblem({ id: "shared", notes: "local notes", updatedAt: ts });
    const cloud = makeProblem({ id: "shared", notes: "cloud notes", updatedAt: ts });
    const { problems, cloudAdded, cloudWon } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("local notes");
    expect(cloudAdded).toBe(0);
    expect(cloudWon).toBe(0);
  });

  it("keeps local version when local is newer", () => {
    const local = makeProblem({ id: "shared", notes: "local notes", updatedAt: "2026-03-10T00:00:00.000Z" });
    const cloud = makeProblem({ id: "shared", notes: "cloud notes", updatedAt: "2026-03-05T00:00:00.000Z" });
    const { problems, cloudWon } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("local notes");
    expect(cloudWon).toBe(0);
  });

  it("keeps cloud version when cloud is newer", () => {
    const local = makeProblem({ id: "shared", notes: "local notes", updatedAt: "2026-03-05T00:00:00.000Z" });
    const cloud = makeProblem({ id: "shared", notes: "cloud notes", updatedAt: "2026-03-10T00:00:00.000Z" });
    const { problems, cloudAdded, cloudWon } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("cloud notes");
    expect(cloudAdded).toBe(0);
    expect(cloudWon).toBe(1);
  });

  it("handles both updatedAt null → local wins", () => {
    const local = makeProblem({ id: "shared", notes: "local notes", updatedAt: null as unknown as string });
    const cloud = makeProblem({ id: "shared", notes: "cloud notes", updatedAt: null as unknown as string });
    const { problems, cloudWon } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("local notes");
    expect(cloudWon).toBe(0);
  });

  it("handles local updatedAt null, cloud has timestamp → cloud wins", () => {
    const local = makeProblem({ id: "shared", notes: "local notes", updatedAt: null as unknown as string });
    const cloud = makeProblem({ id: "shared", notes: "cloud notes", updatedAt: "2026-03-01T00:00:00.000Z" });
    const { problems, cloudWon } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("cloud notes");
    expect(cloudWon).toBe(1);
  });

  it("handles cloud updatedAt null, local has timestamp → local wins", () => {
    const local = makeProblem({ id: "shared", notes: "local notes", updatedAt: "2026-03-01T00:00:00.000Z" });
    const cloud = makeProblem({ id: "shared", notes: "cloud notes", updatedAt: null as unknown as string });
    const { problems, cloudWon } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("local notes");
    expect(cloudWon).toBe(0);
  });

  it("merges large sets without duplicating shared IDs", () => {
    const sharedIds = Array.from({ length: 10 }, (_, i) => `shared-${i}`);
    const local = [
      ...sharedIds.map((id) => makeProblem({ id, updatedAt: "2026-03-01T00:00:00.000Z" })),
      ...Array.from({ length: 5 }, (_, i) => makeProblem({ id: `local-only-${i}` })),
    ];
    const cloud = [
      ...sharedIds.map((id) => makeProblem({ id, updatedAt: "2026-03-01T00:00:00.000Z" })),
      ...Array.from({ length: 5 }, (_, i) => makeProblem({ id: `cloud-only-${i}` })),
    ];
    const { problems, cloudAdded, cloudWon } = mergeProblems(local, cloud);
    expect(problems).toHaveLength(20); // 10 shared + 5 local-only + 5 cloud-only
    expect(new Set(problems.map((p) => p.id)).size).toBe(20); // no duplicates
    expect(cloudAdded).toBe(5);
    expect(cloudWon).toBe(0); // same timestamps → local wins
  });

  it("handles 100+ problems (mobile union)", () => {
    const local = Array.from({ length: 50 }, (_, i) => makeProblem({ id: `local-${i}` }));
    const cloud = Array.from({ length: 60 }, (_, i) => makeProblem({ id: `cloud-${i}` }));
    const { problems } = mergeProblems(local, cloud);
    expect(problems).toHaveLength(110);
  });

  it("does not mutate input arrays", () => {
    const local = [makeProblem({ id: "a" }), makeProblem({ id: "b" })];
    const cloud = [makeProblem({ id: "b" }), makeProblem({ id: "c" })];
    const localCopy = [...local];
    const cloudCopy = [...cloud];
    mergeProblems(local, cloud);
    expect(local).toEqual(localCopy);
    expect(cloud).toEqual(cloudCopy);
  });

  it("preserves all fields of the winning problem", () => {
    const local = makeProblem({
      id: "shared",
      title: "Two Sum",
      leetcodeNumber: 1,
      url: "https://leetcode.com/problems/two-sum",
      difficulty: "Easy",
      patterns: ["Hash Table", "Array"],
      confidence: 5,
      notes: "classic problem",
      excludeFromReview: true,
      dateAdded: "2026-01-01",
      lastReviewed: "2026-03-01",
      nextReviewDate: "2026-03-15",
      updatedAt: "2026-03-10T00:00:00.000Z",
    });
    const cloud = makeProblem({ id: "shared", updatedAt: "2026-03-05T00:00:00.000Z" });
    const { problems } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toEqual(local);
  });
});

describe("mergeReviewLog", () => {
  it("returns local log when cloud is empty", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-02")];
    const { log, addedFromCloud } = mergeReviewLog(local, []);
    expect(log.map((e) => e.date)).toEqual(["2026-03-01", "2026-03-02"]);
    expect(addedFromCloud).toBe(0);
  });

  it("returns cloud log when local is empty", () => {
    const cloud = [makeEntry("2026-03-05"), makeEntry("2026-03-06")];
    const { log, addedFromCloud } = mergeReviewLog([], cloud);
    expect(log.map((e) => e.date)).toEqual(["2026-03-05", "2026-03-06"]);
    expect(addedFromCloud).toBe(2);
  });

  it("deduplicates entries with the same date", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-02")];
    const cloud = [makeEntry("2026-03-02"), makeEntry("2026-03-03")];
    const { log, addedFromCloud } = mergeReviewLog(local, cloud);
    expect(log.map((e) => e.date).sort()).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"]);
    expect(addedFromCloud).toBe(1);
  });

  it("unions entries with different dates", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-03")];
    const cloud = [makeEntry("2026-03-02"), makeEntry("2026-03-04")];
    const { log, addedFromCloud } = mergeReviewLog(local, cloud);
    expect(log.map((e) => e.date).sort()).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
    ]);
    expect(addedFromCloud).toBe(2);
  });

  it("handles both empty → empty result", () => {
    const { log, addedFromCloud } = mergeReviewLog([], []);
    expect(log).toEqual([]);
    expect(addedFromCloud).toBe(0);
  });

  it("does not mutate input arrays", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-02")];
    const cloud = [makeEntry("2026-03-02"), makeEntry("2026-03-03")];
    const localCopy = [...local];
    const cloudCopy = [...cloud];
    mergeReviewLog(local, cloud);
    expect(local).toEqual(localCopy);
    expect(cloud).toEqual(cloudCopy);
  });

  it("preserves order: local entries first, then new cloud entries", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-03")];
    const cloud = [makeEntry("2026-03-03"), makeEntry("2026-03-05"), makeEntry("2026-03-07")];
    const { log, addedFromCloud } = mergeReviewLog(local, cloud);
    expect(log.map((e) => e.date)).toEqual(["2026-03-01", "2026-03-03", "2026-03-05", "2026-03-07"]);
    expect(addedFromCloud).toBe(2);
  });
});

describe("tombstone helpers (mobile union)", () => {
  it("newest tombstone wins for same problem", () => {
    const result = mergeProblemTombstones(
      [{ problemId: "p1", deletedAt: "2026-03-14T12:00:00.000Z" }],
      [{ problemId: "p1", deletedAt: "2026-03-15T12:00:00.000Z" }],
    );
    expect(result.tombstones).toEqual([
      { problemId: "p1", deletedAt: "2026-03-15T12:00:00.000Z" },
    ]);
    expect(result.addedFromCloud).toBe(1);
  });

  it("filters tombstoned problems", () => {
    const result = filterTombstonedProblems(
      [makeProblem({ id: "p1" }), makeProblem({ id: "p2" })],
      [{ problemId: "p1", deletedAt: "2026-03-14T12:00:00.000Z" }],
    );
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("keeps a problem updated after its tombstone (restore wins, F-25)", () => {
    const result = filterTombstonedProblems(
      [
        makeProblem({ id: "restored", updatedAt: "2026-03-15T12:00:00.000Z" }),
        makeProblem({ id: "stale", updatedAt: "2026-03-13T12:00:00.000Z" }),
      ],
      [
        { problemId: "restored", deletedAt: "2026-03-14T12:00:00.000Z" },
        { problemId: "stale", deletedAt: "2026-03-14T12:00:00.000Z" },
      ],
    );
    expect(result.map((p) => p.id)).toEqual(["restored"]);
  });

  it("removes a problem whose update ties its tombstone (delete wins ties)", () => {
    const result = filterTombstonedProblems(
      [makeProblem({ id: "tie", updatedAt: "2026-03-14T12:00:00.000Z" })],
      [{ problemId: "tie", deletedAt: "2026-03-14T12:00:00.000Z" }],
    );
    expect(result).toEqual([]);
  });

  it("ignores tombstones that are older than or equal to the active reset", () => {
    const result = filterTombstonesAfterDataReset(
      [
        { problemId: "old", deletedAt: "2026-03-14T12:00:00.000Z" },
        { problemId: "equal", deletedAt: "2026-03-15T12:00:00.000Z" },
        { problemId: "new", deletedAt: "2026-03-15T12:00:01.000Z" },
      ],
      { resetAt: "2026-03-15T12:00:00.000Z" },
    );
    expect(result).toEqual([
      { problemId: "new", deletedAt: "2026-03-15T12:00:01.000Z" },
    ]);
  });
});

describe("mergeReviewEvents (mobile union)", () => {
  it("does not treat a near cloud duplicate as local-only backfill", () => {
    const localEvent = makeEvent({ problemId: "p1", timestamp: "2026-03-14T12:00:00.000Z", date: "2026-03-14" });
    const cloudEvent = makeEvent({ problemId: "p1", timestamp: "2026-03-14T12:00:03.000Z", date: "2026-03-14" });

    const result = mergeReviewEvents([localEvent], [cloudEvent]);

    expect(result.localOnlyEvents).toEqual([]);
  });

  it("keeps a same-day re-rate with a different confidence (distinct review, not timestamp drift)", () => {
    const first = makeEvent({ problemId: "p1", confidence: 4, date: "2026-03-14", timestamp: "2026-03-14T12:00:00.000Z" });
    const rerate = makeEvent({ problemId: "p1", confidence: 5, date: "2026-03-14", timestamp: "2026-03-14T12:00:01.000Z" });

    const { events } = mergeReviewEvents([], [first, rerate]);

    expect(events).toHaveLength(2);
    expect(events.map((e) => e.confidence)).toEqual([4, 5]);
  });

  it("still collapses a same-confidence pair within the drift window as one review", () => {
    const original = makeEvent({ problemId: "p1", confidence: 4, date: "2026-03-14", timestamp: "2026-03-14T12:00:00.000Z" });
    const drifted = makeEvent({ problemId: "p1", confidence: 4, date: "2026-03-14", timestamp: "2026-03-14T12:00:02.000Z" });

    const { events } = mergeReviewEvents([original], [drifted]);

    expect(events).toHaveLength(1);
  });
});
