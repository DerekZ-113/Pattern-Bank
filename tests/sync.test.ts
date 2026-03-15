import { describe, it, expect } from "vitest";
import type { Problem, ReviewLogEntry } from "../src/types";
import { mergeProblems, mergeReviewLog } from "../src/utils/sync";

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

function makeEntry(date: string): ReviewLogEntry {
  return { date };
}

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
    const ids = problems.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(20); // no duplicates
    expect(cloudAdded).toBe(5); // 5 cloud-only problems
    expect(cloudWon).toBe(0); // same timestamps → local wins
  });

  it("does not mutate input arrays", () => {
    const local = [makeProblem({ id: "a" }), makeProblem({ id: "b" })];
    const cloud = [makeProblem({ id: "b" }), makeProblem({ id: "c" })];
    const localCopy = [...local];
    const cloudCopy = [...cloud];
    mergeProblems(local, cloud);
    expect(local).toHaveLength(localCopy.length);
    expect(cloud).toHaveLength(cloudCopy.length);
    expect(local[0].id).toBe(localCopy[0].id);
    expect(cloud[0].id).toBe(cloudCopy[0].id);
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
    const winner = problems[0];
    expect(winner.title).toBe("Two Sum");
    expect(winner.leetcodeNumber).toBe(1);
    expect(winner.url).toBe("https://leetcode.com/problems/two-sum");
    expect(winner.difficulty).toBe("Easy");
    expect(winner.patterns).toEqual(["Hash Table", "Array"]);
    expect(winner.confidence).toBe(5);
    expect(winner.notes).toBe("classic problem");
    expect(winner.excludeFromReview).toBe(true);
    expect(winner.dateAdded).toBe("2026-01-01");
    expect(winner.lastReviewed).toBe("2026-03-01");
    expect(winner.nextReviewDate).toBe("2026-03-15");
    expect(winner.updatedAt).toBe("2026-03-10T00:00:00.000Z");
  });
});

describe("mergeReviewLog", () => {
  it("returns local log when cloud is empty", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-02")];
    const { log, addedFromCloud } = mergeReviewLog(local, []);
    expect(log).toHaveLength(2);
    expect(log.map((e) => e.date)).toEqual(["2026-03-01", "2026-03-02"]);
    expect(addedFromCloud).toBe(0);
  });

  it("returns cloud log when local is empty", () => {
    const cloud = [makeEntry("2026-03-05"), makeEntry("2026-03-06")];
    const { log, addedFromCloud } = mergeReviewLog([], cloud);
    expect(log).toHaveLength(2);
    expect(log.map((e) => e.date)).toEqual(["2026-03-05", "2026-03-06"]);
    expect(addedFromCloud).toBe(2);
  });

  it("deduplicates entries with the same date", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-02")];
    const cloud = [makeEntry("2026-03-02"), makeEntry("2026-03-03")];
    const { log, addedFromCloud } = mergeReviewLog(local, cloud);
    expect(log).toHaveLength(3);
    const dates = log.map((e) => e.date);
    expect(dates).toContain("2026-03-01");
    expect(dates).toContain("2026-03-02");
    expect(dates).toContain("2026-03-03");
    expect(addedFromCloud).toBe(1);
  });

  it("unions entries with different dates", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-03")];
    const cloud = [makeEntry("2026-03-02"), makeEntry("2026-03-04")];
    const { log, addedFromCloud } = mergeReviewLog(local, cloud);
    expect(log).toHaveLength(4);
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
    expect(log).toHaveLength(0);
    expect(addedFromCloud).toBe(0);
  });

  it("does not mutate input arrays", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-02")];
    const cloud = [makeEntry("2026-03-02"), makeEntry("2026-03-03")];
    const localCopy = [...local];
    const cloudCopy = [...cloud];
    mergeReviewLog(local, cloud);
    expect(local).toHaveLength(localCopy.length);
    expect(cloud).toHaveLength(cloudCopy.length);
    expect(local[0].date).toBe(localCopy[0].date);
    expect(cloud[0].date).toBe(cloudCopy[0].date);
  });

  it("preserves order: local entries first, then new cloud entries", () => {
    const local = [makeEntry("2026-03-01"), makeEntry("2026-03-03")];
    const cloud = [makeEntry("2026-03-03"), makeEntry("2026-03-05"), makeEntry("2026-03-07")];
    const { log, addedFromCloud } = mergeReviewLog(local, cloud);
    expect(log).toHaveLength(4);
    // Local entries come first, in their original order
    expect(log[0].date).toBe("2026-03-01");
    expect(log[1].date).toBe("2026-03-03");
    // Then new cloud entries (not duplicates), in their original order
    expect(log[2].date).toBe("2026-03-05");
    expect(log[3].date).toBe("2026-03-07");
    expect(addedFromCloud).toBe(2);
  });
});
