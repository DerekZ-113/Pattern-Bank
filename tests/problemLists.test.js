import { describe, it, expect } from "vitest";
import { getListSummaries, getListProblems } from "../src/utils/problemLists";

describe("getListSummaries", () => {
  it("returns all 6 curated lists", () => {
    const summaries = getListSummaries(new Set());
    expect(summaries).toHaveLength(6);
    const ids = summaries.map((s) => s.id);
    expect(ids).toContain("neetcode75");
    expect(ids).toContain("neetcode150");
    expect(ids).toContain("neetcode250");
    expect(ids).toContain("grind75");
    expect(ids).toContain("grind169");
    expect(ids).toContain("hot100");
  });

  it("each summary has required fields", () => {
    const summaries = getListSummaries(new Set());
    for (const s of summaries) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("total");
      expect(s).toHaveProperty("existing");
      expect(s).toHaveProperty("newCount");
      expect(s.total).toBeGreaterThan(0);
    }
  });

  it("counts existing problems correctly", () => {
    const existing = new Set([1, 2, 3]); // Two Sum, Add Two Numbers, LSWRC
    const summaries = getListSummaries(existing);
    const neetcode75 = summaries.find((s) => s.id === "neetcode75");
    expect(neetcode75.existing).toBeGreaterThan(0);
    expect(neetcode75.newCount).toBe(neetcode75.total - neetcode75.existing);
  });

  it("reports 0 existing when library is empty", () => {
    const summaries = getListSummaries(new Set());
    for (const s of summaries) {
      expect(s.existing).toBe(0);
      expect(s.newCount).toBe(s.total);
    }
  });
});

describe("getListProblems", () => {
  it("returns problems for a valid list", () => {
    const { lcProblems } = getListProblems("neetcode75", new Set());
    expect(lcProblems.length).toBeGreaterThan(0);
    // Each problem should have the standard shape
    expect(lcProblems[0]).toHaveProperty("n");
    expect(lcProblems[0]).toHaveProperty("t");
    expect(lcProblems[0]).toHaveProperty("d");
  });

  it("returns empty for invalid list ID", () => {
    const { lcProblems, patternMap } = getListProblems("nonexistent", new Set());
    expect(lcProblems).toEqual([]);
    expect(patternMap.size).toBe(0);
  });

  it("filters out already-imported problems", () => {
    const allProblems = getListProblems("neetcode75", new Set());
    const withExisting = getListProblems("neetcode75", new Set([1])); // Two Sum already imported
    expect(withExisting.lcProblems.length).toBe(allProblems.lcProblems.length - 1);
    expect(withExisting.lcProblems.some((p) => p.n === 1)).toBe(false);
  });

  it("includes pattern map for problems with known patterns", () => {
    const { patternMap } = getListProblems("neetcode75", new Set());
    // Problem 1 (Two Sum) should map to Hash Table
    expect(patternMap.get(1)).toEqual(["Hash Table"]);
  });
});
