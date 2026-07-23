import { describe, it, expect } from "vitest";
import {
  CORE_PATTERNS,
  EXTRA_PATTERNS,
  PATTERN_CATEGORIES,
  groupPatternsByCategory,
} from "../src/constants";

describe("pattern constants", () => {
  it("includes Array and Math as core patterns", () => {
    expect(CORE_PATTERNS).toContain("Array");
    expect(CORE_PATTERNS).toContain("Math");
    expect(CORE_PATTERNS).toHaveLength(20);
  });

  it("categorizes exactly the agreed structures and strategies", () => {
    expect([...PATTERN_CATEGORIES.structures]).toEqual([
      "Array", "Hash Table", "Linked List", "Stack", "Queue",
      "Tree", "Heap", "Graph", "Trie", "Union Find",
    ]);
    expect([...PATTERN_CATEGORIES.strategies]).toEqual([
      "Two Pointers", "Sliding Window", "Binary Search", "Sorting",
      "BFS", "DFS", "Greedy", "Backtracking", "DP", "Math",
      "Intervals", "Mono Stack", "Prefix Sum", "Bit", "System Design", "OOD",
    ]);
  });

  it("keeps categories disjoint and covering every known pattern", () => {
    const structures = new Set<string>(PATTERN_CATEGORIES.structures);
    const strategies = new Set<string>(PATTERN_CATEGORIES.strategies);
    for (const p of structures) expect(strategies.has(p)).toBe(false);

    // Regression trap: any future pattern added to CORE/EXTRA without a
    // category assignment fails here.
    const categorized = new Set([...structures, ...strategies]);
    for (const p of [...CORE_PATTERNS, ...EXTRA_PATTERNS]) {
      expect(categorized.has(p)).toBe(true);
    }
    expect(categorized.size).toBe(CORE_PATTERNS.length + EXTRA_PATTERNS.length);
  });
});

describe("groupPatternsByCategory", () => {
  it("splits a mixed list into structures, strategies, and custom", () => {
    expect(groupPatternsByCategory(["DP", "Array", "Two Pointers", "Tree"])).toEqual({
      structures: ["Array", "Tree"],
      strategies: ["DP", "Two Pointers"],
      custom: [],
    });
  });

  it("preserves input order within each group", () => {
    const { structures, strategies } = groupPatternsByCategory([
      "Union Find", "Math", "Array", "Greedy",
    ]);
    expect(structures).toEqual(["Union Find", "Array"]);
    expect(strategies).toEqual(["Math", "Greedy"]);
  });

  it("routes unknown names to custom in input order", () => {
    expect(groupPatternsByCategory(["My Pattern", "Array", "Another One"])).toEqual({
      structures: ["Array"],
      strategies: [],
      custom: ["My Pattern", "Another One"],
    });
  });

  it("returns three empty arrays for empty input", () => {
    expect(groupPatternsByCategory([])).toEqual({
      structures: [],
      strategies: [],
      custom: [],
    });
  });

  it("does not mutate the input array", () => {
    const input = Object.freeze(["DP", "Array", "Custom X"]) as unknown as string[];
    expect(() => groupPatternsByCategory(input)).not.toThrow();
    expect(input).toEqual(["DP", "Array", "Custom X"]);
  });
});
