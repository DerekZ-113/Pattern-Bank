import { describe, it, expect } from "vitest";
import {
  calculateLongestStreak,
  buildReviewCountMap,
  getWeekStart,
  groupEventsByWeek,
  getConfidenceDistribution,
  getTopPatterns,
} from "../src/progressUtils";
import type { ReviewLogEntry, ReviewEvent } from "../src/types";

// ── calculateLongestStreak ───────────────────────────────

describe("calculateLongestStreak", () => {
  it("returns 0 for empty log", () => {
    expect(calculateLongestStreak([])).toBe(0);
  });

  it("returns 1 for a single date", () => {
    expect(calculateLongestStreak([{ date: "2026-03-10" }])).toBe(1);
  });

  it("counts consecutive days", () => {
    const log: ReviewLogEntry[] = [
      { date: "2026-03-10" },
      { date: "2026-03-11" },
      { date: "2026-03-12" },
    ];
    expect(calculateLongestStreak(log)).toBe(3);
  });

  it("returns the longest of multiple streaks", () => {
    const log: ReviewLogEntry[] = [
      { date: "2026-03-01" },
      { date: "2026-03-02" },
      // gap
      { date: "2026-03-10" },
      { date: "2026-03-11" },
      { date: "2026-03-12" },
      { date: "2026-03-13" },
    ];
    expect(calculateLongestStreak(log)).toBe(4);
  });

  it("handles unsorted dates", () => {
    const log: ReviewLogEntry[] = [
      { date: "2026-03-12" },
      { date: "2026-03-10" },
      { date: "2026-03-11" },
    ];
    expect(calculateLongestStreak(log)).toBe(3);
  });

  it("deduplicates dates", () => {
    const log: ReviewLogEntry[] = [
      { date: "2026-03-10" },
      { date: "2026-03-10" },
      { date: "2026-03-11" },
    ];
    expect(calculateLongestStreak(log)).toBe(2);
  });
});

// ── buildReviewCountMap ──────────────────────────────────

describe("buildReviewCountMap", () => {
  it("returns empty map for empty inputs", () => {
    expect(buildReviewCountMap([], []).size).toBe(0);
  });

  it("counts reviewEvents per date", () => {
    const events: ReviewEvent[] = [
      { date: "2026-03-10", problemId: "a", confidence: 3, patterns: [], timestamp: "" },
      { date: "2026-03-10", problemId: "b", confidence: 4, patterns: [], timestamp: "" },
      { date: "2026-03-11", problemId: "c", confidence: 5, patterns: [], timestamp: "" },
    ];
    const map = buildReviewCountMap(events, []);
    expect(map.get("2026-03-10")).toBe(2);
    expect(map.get("2026-03-11")).toBe(1);
  });

  it("uses reviewLog as fallback for legacy dates", () => {
    const events: ReviewEvent[] = [
      { date: "2026-03-11", problemId: "a", confidence: 3, patterns: [], timestamp: "" },
    ];
    const log: ReviewLogEntry[] = [
      { date: "2026-03-10" }, // no events for this date
      { date: "2026-03-11" }, // has events — should NOT override
    ];
    const map = buildReviewCountMap(events, log);
    expect(map.get("2026-03-10")).toBe(1); // fallback
    expect(map.get("2026-03-11")).toBe(1); // from events, not overridden
  });

  it("does not override event counts with log fallback", () => {
    const events: ReviewEvent[] = [
      { date: "2026-03-10", problemId: "a", confidence: 3, patterns: [], timestamp: "" },
      { date: "2026-03-10", problemId: "b", confidence: 4, patterns: [], timestamp: "" },
      { date: "2026-03-10", problemId: "c", confidence: 5, patterns: [], timestamp: "" },
    ];
    const log: ReviewLogEntry[] = [{ date: "2026-03-10" }];
    const map = buildReviewCountMap(events, log);
    expect(map.get("2026-03-10")).toBe(3); // events win
  });
});

// ── getWeekStart ─────────────────────────────────────────

describe("getWeekStart", () => {
  it("returns Sunday for a Sunday", () => {
    // 2026-03-08 is a Sunday
    expect(getWeekStart("2026-03-08")).toBe("2026-03-08");
  });

  it("returns previous Sunday for a Wednesday", () => {
    // 2026-03-11 is a Wednesday
    expect(getWeekStart("2026-03-11")).toBe("2026-03-08");
  });

  it("returns previous Sunday for a Saturday", () => {
    // 2026-03-14 is a Saturday
    expect(getWeekStart("2026-03-14")).toBe("2026-03-08");
  });
});

// ── groupEventsByWeek ────────────────────────────────────

describe("groupEventsByWeek", () => {
  it("returns null averages for weeks with no events", () => {
    const weeks = groupEventsByWeek([], 4, "2026-03-01");
    expect(weeks).toHaveLength(4);
    weeks.forEach((w) => expect(w.avg).toBeNull());
  });

  it("computes average confidence per week", () => {
    const events: ReviewEvent[] = [
      { date: "2026-03-09", problemId: "a", confidence: 2, patterns: [], timestamp: "" },
      { date: "2026-03-10", problemId: "b", confidence: 4, patterns: [], timestamp: "" },
    ];
    // Both dates fall in the week starting 2026-03-08 (Sunday)
    const weeks = groupEventsByWeek(events, 2, "2026-03-08");
    const firstWeek = weeks.find((w) => w.weekStart === "2026-03-08");
    expect(firstWeek?.avg).toBe(3); // (2+4)/2
  });

  it("filters events before startDate", () => {
    const events: ReviewEvent[] = [
      { date: "2026-02-01", problemId: "a", confidence: 1, patterns: [], timestamp: "" },
      { date: "2026-03-09", problemId: "b", confidence: 5, patterns: [], timestamp: "" },
    ];
    const weeks = groupEventsByWeek(events, 2, "2026-03-08");
    const firstWeek = weeks.find((w) => w.weekStart === "2026-03-08");
    expect(firstWeek?.avg).toBe(5); // only the March event
  });
});

// ── getConfidenceDistribution ────────────────────────────

describe("getConfidenceDistribution", () => {
  it("returns all zeros for empty input", () => {
    expect(getConfidenceDistribution([])).toEqual([0, 0, 0, 0, 0]);
  });

  it("counts each confidence level", () => {
    expect(getConfidenceDistribution([1, 2, 3, 3, 5, 5, 5])).toEqual([1, 1, 2, 0, 3]);
  });

  it("ignores out-of-range values", () => {
    expect(getConfidenceDistribution([0, 6, 3])).toEqual([0, 0, 1, 0, 0]);
  });
});

// ── getTopPatterns ───────────────────────────────────────

describe("getTopPatterns", () => {
  it("returns empty array for no patterns", () => {
    expect(getTopPatterns([], 5)).toEqual([]);
  });

  it("returns top N patterns sorted by count", () => {
    const patterns = [
      ["DP", "Graph"],
      ["DP"],
      ["BFS", "Graph"],
      ["DP", "BFS"],
    ];
    const top = getTopPatterns(patterns, 2);
    expect(top).toEqual([
      ["DP", 3],
      ["Graph", 2],
    ]);
  });

  it("returns all if fewer than limit", () => {
    const patterns = [["DP"], ["BFS"]];
    const top = getTopPatterns(patterns, 5);
    expect(top).toHaveLength(2);
  });
});
