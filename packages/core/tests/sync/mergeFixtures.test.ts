import { describe, it, expect } from "vitest";
import type { DataReset, Problem, ProblemTombstone, ReviewEvent } from "../../../../src/types";
import {
  mergeProblems,
  mergeProblemTombstones,
  filterTombstonedProblems,
  filterTombstonesAfterDataReset,
  mergeReviewEvents,
} from "../../../../src/utils/sync";

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: `id-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Problem",
    leetcodeNumber: null,
    url: null,
    difficulty: "Medium",
    patterns: [],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-03-01",
    lastReviewed: null,
    nextReviewDate: "2026-03-02",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    date: "2026-03-10",
    problemId: "prob-1",
    confidence: 3,
    patterns: ["Hash Table"],
    timestamp: "2026-03-10T12:00:00.000Z",
    ...overrides,
  };
}

describe("mergeProblems — newest-wins with valid timestamps", () => {
  it("keeps the cloud version when cloud updatedAt is newer", () => {
    const local = makeProblem({ id: "shared", notes: "local", updatedAt: "2026-03-05T00:00:00.000Z" });
    const cloud = makeProblem({ id: "shared", notes: "cloud", updatedAt: "2026-03-10T00:00:00.000Z" });
    const { problems, cloudWon } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("cloud");
    expect(cloudWon).toBe(1);
  });

  it("keeps the local version when local updatedAt is newer", () => {
    const local = makeProblem({ id: "shared", notes: "local", updatedAt: "2026-03-10T00:00:00.000Z" });
    const cloud = makeProblem({ id: "shared", notes: "cloud", updatedAt: "2026-03-05T00:00:00.000Z" });
    const { problems, cloudWon } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("local");
    expect(cloudWon).toBe(0);
  });

  it("keeps the local version on an exact timestamp tie", () => {
    const ts = "2026-03-10T00:00:00.000Z";
    const local = makeProblem({ id: "shared", notes: "local", updatedAt: ts });
    const cloud = makeProblem({ id: "shared", notes: "cloud", updatedAt: ts });
    const { problems } = mergeProblems([local], [cloud]);
    expect(problems[0].notes).toBe("local");
  });

  it("unions disjoint local-only and cloud-only problems", () => {
    const { problems, cloudAdded } = mergeProblems(
      [makeProblem({ id: "l1" })],
      [makeProblem({ id: "c1" }), makeProblem({ id: "c2" })]
    );
    expect(problems.map((p) => p.id).sort()).toEqual(["c1", "c2", "l1"]);
    expect(cloudAdded).toBe(2);
  });
});

describe("mergeProblems — F-17 invalid updatedAt guard", () => {
  // Canonical (mobile) semantics: a malformed updatedAt is treated as epoch 0,
  // so the side with a valid timestamp deterministically wins.
  // Web compares `cloudTime > NaN` (always false), so the malformed LOCAL entry wins.
  // FIXED-BY: Phase 5 (F-17) — web mergeProblems must NaN-guard updatedAt like mobile's timestampMs
  it.fails("cloud entry with a valid updatedAt beats a local entry with malformed updatedAt", () => {
    const local = makeProblem({ id: "shared", notes: "local", updatedAt: "not-a-date" });
    const cloud = makeProblem({ id: "shared", notes: "cloud", updatedAt: "2026-03-10T00:00:00.000Z" });
    const { problems } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("cloud");
  });

  it("local entry with a valid updatedAt beats a cloud entry with malformed updatedAt, without crashing", () => {
    const local = makeProblem({ id: "shared", notes: "local", updatedAt: "2026-03-10T00:00:00.000Z" });
    const cloud = makeProblem({ id: "shared", notes: "cloud", updatedAt: "garbage" });
    let result!: ReturnType<typeof mergeProblems>;
    expect(() => {
      result = mergeProblems([local], [cloud]);
    }).not.toThrow();
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].notes).toBe("local");
  });

  it("resolves deterministically (local wins) when both timestamps are malformed", () => {
    const local = makeProblem({ id: "shared", notes: "local", updatedAt: "bogus-a" });
    const cloud = makeProblem({ id: "shared", notes: "cloud", updatedAt: "bogus-b" });
    const { problems } = mergeProblems([local], [cloud]);
    expect(problems).toHaveLength(1);
    expect(problems[0].notes).toBe("local");
  });

  it("cloud wins when local updatedAt is missing entirely", () => {
    const local = makeProblem({ id: "shared", notes: "local", updatedAt: null as unknown as string });
    const cloud = makeProblem({ id: "shared", notes: "cloud", updatedAt: "2026-03-10T00:00:00.000Z" });
    const { problems } = mergeProblems([local], [cloud]);
    expect(problems[0].notes).toBe("cloud");
  });
});

describe("tombstone suppression", () => {
  it("keeps a problem dead when a newer cloud tombstone exists for it", () => {
    const problem = makeProblem({ id: "dead-1", updatedAt: "2026-03-10T00:00:00.000Z" });
    const cloudTombstone: ProblemTombstone = { problemId: "dead-1", deletedAt: "2026-03-11T00:00:00.000Z" };

    // Compose the same steps syncOnSignIn performs: merge tombstones, then filter both sides.
    const { tombstones } = mergeProblemTombstones([], [cloudTombstone]);
    const filteredLocal = filterTombstonedProblems([problem], tombstones);
    const filteredCloud = filterTombstonedProblems([problem], tombstones);
    const { problems } = mergeProblems(filteredLocal, filteredCloud);

    expect(problems).toEqual([]);
    expect(tombstones).toEqual([cloudTombstone]);
  });

  it("prefers the newest tombstone when both sides have one for the same problem", () => {
    const olderLocal: ProblemTombstone = { problemId: "p1", deletedAt: "2026-03-10T00:00:00.000Z" };
    const newerCloud: ProblemTombstone = { problemId: "p1", deletedAt: "2026-03-11T00:00:00.000Z" };
    const { tombstones, addedFromCloud } = mergeProblemTombstones([olderLocal], [newerCloud]);
    expect(tombstones).toEqual([newerCloud]);
    expect(addedFromCloud).toBe(1);
  });
});

describe("reset-marker filtering", () => {
  // filterProblemsAfterDataReset is internal to web's syncOnSignIn; the exported
  // reset-marker filter at this level is filterTombstonesAfterDataReset.
  const reset: DataReset = { resetAt: "2026-03-12T00:00:00.000Z" };

  it("excludes cloud tombstones older than the reset marker", () => {
    const stale: ProblemTombstone = { problemId: "old", deletedAt: "2026-03-11T00:00:00.000Z" };
    const fresh: ProblemTombstone = { problemId: "new", deletedAt: "2026-03-13T00:00:00.000Z" };
    expect(filterTombstonesAfterDataReset([stale, fresh], reset)).toEqual([fresh]);
  });

  it("excludes tombstones whose deletedAt exactly equals the reset marker", () => {
    const boundary: ProblemTombstone = { problemId: "edge", deletedAt: reset.resetAt };
    expect(filterTombstonesAfterDataReset([boundary], reset)).toEqual([]);
  });

  it("returns tombstones unchanged when there is no reset marker", () => {
    const t: ProblemTombstone = { problemId: "p", deletedAt: "2026-03-01T00:00:00.000Z" };
    expect(filterTombstonesAfterDataReset([t], null)).toEqual([t]);
  });
});

describe("mergeReviewEvents — 5s near-duplicate tolerance", () => {
  it("collapses two events for the same problem on the same date 3s apart into one", () => {
    const local = makeEvent({ timestamp: "2026-03-10T12:00:00.000Z" });
    const cloud = makeEvent({ timestamp: "2026-03-10T12:00:03.000Z" });
    const { events, addedFromCloud } = mergeReviewEvents([local], [cloud]);
    expect(events).toHaveLength(1);
    expect(addedFromCloud).toBe(0);
  });

  it("keeps two events for the same problem more than 5s apart", () => {
    const local = makeEvent({ timestamp: "2026-03-10T12:00:00.000Z" });
    const cloud = makeEvent({ timestamp: "2026-03-10T12:00:06.000Z" });
    const { events } = mergeReviewEvents([local], [cloud]);
    expect(events).toHaveLength(2);
  });

  // Canonical: two events 3s apart but on DIFFERENT calendar dates (near midnight)
  // are distinct streak days and must both survive the merge — collapsing them
  // silently drops a streak day. Web's reviewEventsMatch ignores the date field,
  // so it collapses them into one.
  // FIXED-BY: Phase 5 (date-aware event matching) — reviewEventsMatch must only
  // treat near-duplicates as the same event when their date fields agree
  it.fails("keeps near-midnight events 3s apart that fall on different dates", () => {
    const beforeMidnight = makeEvent({
      date: "2026-03-10",
      timestamp: "2026-03-10T23:59:58.500Z",
    });
    const afterMidnight = makeEvent({
      date: "2026-03-11",
      timestamp: "2026-03-11T00:00:01.000Z",
    });
    const { events } = mergeReviewEvents([beforeMidnight], [afterMidnight]);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.date).sort()).toEqual(["2026-03-10", "2026-03-11"]);
  });
});
