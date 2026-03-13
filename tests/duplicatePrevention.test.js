import { describe, it, expect } from "vitest";
import { deduplicateProblems } from "../src/utils/sync";

function makeProblem(overrides = {}) {
  return {
    id: `id-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Problem",
    leetcodeNumber: null,
    difficulty: "Medium",
    confidence: 3,
    notes: "",
    dateAdded: "2026-03-01",
    lastReviewed: null,
    nextReviewDate: "2026-03-02",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("deduplicateProblems", () => {
  it("returns problems unchanged when no duplicates", () => {
    const problems = [
      makeProblem({ leetcodeNumber: 1 }),
      makeProblem({ leetcodeNumber: 2 }),
      makeProblem({ leetcodeNumber: 3 }),
    ];
    const { problems: result, removedIds } = deduplicateProblems(problems);
    expect(result).toHaveLength(3);
    expect(removedIds).toHaveLength(0);
  });

  it("removes duplicate by leetcodeNumber, keeps most recent updatedAt", () => {
    const older = makeProblem({
      id: "old-id",
      leetcodeNumber: 1,
      title: "Two Sum",
      updatedAt: "2026-03-01T00:00:00.000Z",
      notes: "old notes",
    });
    const newer = makeProblem({
      id: "new-id",
      leetcodeNumber: 1,
      title: "Two Sum",
      updatedAt: "2026-03-10T00:00:00.000Z",
      notes: "new notes",
    });
    const { problems: result, removedIds } = deduplicateProblems([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new-id");
    expect(result[0].notes).toBe("new notes");
    expect(removedIds).toEqual(["old-id"]);
  });

  it("keeps older when newer comes first in array (order doesn't matter, updatedAt does)", () => {
    const newer = makeProblem({
      id: "new-id",
      leetcodeNumber: 1,
      updatedAt: "2026-03-10T00:00:00.000Z",
    });
    const older = makeProblem({
      id: "old-id",
      leetcodeNumber: 1,
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
    const { problems: result, removedIds } = deduplicateProblems([newer, older]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new-id");
    expect(removedIds).toEqual(["old-id"]);
  });

  it("keeps all custom problems (null leetcodeNumber) without deduplication", () => {
    const custom1 = makeProblem({ id: "c1", leetcodeNumber: null, title: "Custom A" });
    const custom2 = makeProblem({ id: "c2", leetcodeNumber: null, title: "Custom B" });
    const custom3 = makeProblem({ id: "c3", leetcodeNumber: null, title: "Custom A" });
    const { problems: result, removedIds } = deduplicateProblems([custom1, custom2, custom3]);
    expect(result).toHaveLength(3);
    expect(removedIds).toHaveLength(0);
  });

  it("handles mixed: dedupes LC numbers but keeps custom problems", () => {
    const lc1a = makeProblem({ id: "a", leetcodeNumber: 1, updatedAt: "2026-03-01T00:00:00.000Z" });
    const lc1b = makeProblem({ id: "b", leetcodeNumber: 1, updatedAt: "2026-03-05T00:00:00.000Z" });
    const custom = makeProblem({ id: "c", leetcodeNumber: null });
    const lc2 = makeProblem({ id: "d", leetcodeNumber: 2 });
    const { problems: result, removedIds } = deduplicateProblems([lc1a, custom, lc1b, lc2]);
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.id).sort()).toEqual(["b", "c", "d"]);
    expect(removedIds).toEqual(["a"]);
  });

  it("handles empty array", () => {
    const { problems: result, removedIds } = deduplicateProblems([]);
    expect(result).toHaveLength(0);
    expect(removedIds).toHaveLength(0);
  });

  it("handles triple duplicates — keeps most recent", () => {
    const p1 = makeProblem({ id: "a", leetcodeNumber: 1, updatedAt: "2026-03-01T00:00:00.000Z" });
    const p2 = makeProblem({ id: "b", leetcodeNumber: 1, updatedAt: "2026-03-05T00:00:00.000Z" });
    const p3 = makeProblem({ id: "c", leetcodeNumber: 1, updatedAt: "2026-03-10T00:00:00.000Z" });
    const { problems: result, removedIds } = deduplicateProblems([p1, p2, p3]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c");
    expect(removedIds).toHaveLength(2);
    expect(removedIds).toContain("a");
    expect(removedIds).toContain("b");
  });

  it("does not mutate the input array", () => {
    const problems = [
      makeProblem({ id: "a", leetcodeNumber: 1, updatedAt: "2026-03-01T00:00:00.000Z" }),
      makeProblem({ id: "b", leetcodeNumber: 1, updatedAt: "2026-03-05T00:00:00.000Z" }),
    ];
    const original = [...problems];
    deduplicateProblems(problems);
    expect(problems).toHaveLength(original.length);
    expect(problems[0].id).toBe(original[0].id);
  });

  it("falls back to keeping first when updatedAt is missing", () => {
    const p1 = makeProblem({ id: "a", leetcodeNumber: 1, updatedAt: null });
    const p2 = makeProblem({ id: "b", leetcodeNumber: 1, updatedAt: null });
    const { problems: result, removedIds } = deduplicateProblems([p1, p2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
    expect(removedIds).toEqual(["b"]);
  });
});
