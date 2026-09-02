import { describe, it, expect } from "vitest";
import {
  CORE_PATTERNS,
  EXTRA_PATTERNS,
  PATTERN_CATEGORIES,
  getVisiblePatterns,
  groupPatternsByCategory,
} from "../src/constants";

describe("pattern constants", () => {
  it("includes Array and Math as core patterns", () => {
    expect(CORE_PATTERNS).toContain("Array");
    expect(CORE_PATTERNS).toContain("Math");
    expect(CORE_PATTERNS).toHaveLength(20);
  });

  it("includes Database as an opt-in extra, not a core pattern", () => {
    expect(EXTRA_PATTERNS).toContain("Database");
    expect(EXTRA_PATTERNS).toHaveLength(7);
    expect(CORE_PATTERNS).not.toContain("Database");
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
      "Database",
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

  it("files Database under strategies alongside System Design and OOD", () => {
    expect(groupPatternsByCategory(["Database", "Array"])).toEqual({
      structures: ["Array"],
      strategies: ["Database"],
      custom: [],
    });
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

describe("getVisiblePatterns", () => {
  it("hides Database until it is enabled", () => {
    const visible = getVisiblePatterns([]);
    expect(visible).not.toContain("Database");
    expect(visible).toHaveLength(CORE_PATTERNS.length);
  });

  it("appends an enabled Database after the core patterns", () => {
    const visible = getVisiblePatterns(["Database"]);
    expect(visible).toHaveLength(CORE_PATTERNS.length + 1);
    expect(visible[visible.length - 1]).toBe("Database");
  });
});
