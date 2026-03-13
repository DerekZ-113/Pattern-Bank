import { describe, it, expect } from "vitest";
import { searchProblems, getProblemByNumber, buildLeetCodeUrl } from "../src/utils/leetcodeProblems";

describe("getProblemByNumber", () => {
  it("returns problem for valid number", () => {
    const problem = getProblemByNumber(1);
    expect(problem).not.toBeNull();
    expect(problem.t).toBe("Two Sum");
    expect(problem.d).toBe("Easy");
    expect(problem.s).toBe("two-sum");
  });

  it("returns null for non-existent number", () => {
    expect(getProblemByNumber(999999)).toBeNull();
  });

  it("returns null for 0", () => {
    expect(getProblemByNumber(0)).toBeNull();
  });
});

describe("buildLeetCodeUrl", () => {
  it("builds correct URL from slug", () => {
    expect(buildLeetCodeUrl("two-sum")).toBe(
      "https://leetcode.com/problems/two-sum/description/"
    );
  });
});

describe("searchProblems", () => {
  it("returns empty array for empty query", () => {
    expect(searchProblems("")).toEqual([]);
    expect(searchProblems("  ")).toEqual([]);
    expect(searchProblems(null)).toEqual([]);
  });

  it("finds exact number match", () => {
    const results = searchProblems("1");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].n).toBe(1);
    expect(results[0].t).toBe("Two Sum");
  });

  it("finds by number prefix", () => {
    const results = searchProblems("10");
    // Should include problem 10 and others starting with 10x
    expect(results.some((p) => p.n === 10)).toBe(true);
  });

  it("finds by title substring", () => {
    const results = searchProblems("two sum");
    expect(results.some((p) => p.t === "Two Sum")).toBe(true);
  });

  it("is case insensitive for title search", () => {
    const results = searchProblems("TWO SUM");
    expect(results.some((p) => p.t === "Two Sum")).toBe(true);
  });

  it("respects limit parameter", () => {
    const results = searchProblems("a", 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("defaults to limit of 20", () => {
    const results = searchProblems("a");
    expect(results.length).toBeLessThanOrEqual(20);
  });
});
