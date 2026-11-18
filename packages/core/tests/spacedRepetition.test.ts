import { describe, it, expect } from "vitest";
import {
  FIVE_STAR_GRADUATION_INTERVALS,
  INTERVALS,
  getDefaultFiveStarStreak,
  getFiveStarGraduationIntervalDays,
  getIntervalDays,
  getNextFiveStarStreak,
  getPreviousFiveStarStreak,
  getReviewIntervalDays,
  dayNumber,
  prioritizeProblems,
  ringPosition,
  rotationKey,
  rotationPointer,
} from "../src/spacedRepetition";
import type { Confidence, Problem } from "../src/types";

describe("INTERVALS", () => {
  it("maps confidence 1-5 to expected days", () => {
    expect(INTERVALS[1]).toBe(1);
    expect(INTERVALS[2]).toBe(2);
    expect(INTERVALS[3]).toBe(5);
    expect(INTERVALS[4]).toBe(10);
    expect(INTERVALS[5]).toBe(30);
  });
});

describe("getIntervalDays", () => {
  it("returns correct interval for each confidence level", () => {
    expect(getIntervalDays(1)).toBe(1);
    expect(getIntervalDays(2)).toBe(2);
    expect(getIntervalDays(3)).toBe(5);
    expect(getIntervalDays(4)).toBe(10);
    expect(getIntervalDays(5)).toBe(30);
  });

  it("returns 1 as fallback for invalid confidence", () => {
    expect(getIntervalDays(0 as unknown as Confidence)).toBe(1);
    expect(getIntervalDays(6 as unknown as Confidence)).toBe(1);
    expect(getIntervalDays(undefined as unknown as Confidence)).toBe(1);
    expect(getIntervalDays(null as unknown as Confidence)).toBe(1);
  });
});

describe("5-star graduation", () => {
  it("defines the graduation intervals", () => {
    expect(FIVE_STAR_GRADUATION_INTERVALS).toEqual([30, 60, 120, 240, 365]);
  });

  it("returns graduated intervals capped at one year", () => {
    expect(getFiveStarGraduationIntervalDays(0)).toBe(30);
    expect(getFiveStarGraduationIntervalDays(1)).toBe(30);
    expect(getFiveStarGraduationIntervalDays(2)).toBe(60);
    expect(getFiveStarGraduationIntervalDays(3)).toBe(120);
    expect(getFiveStarGraduationIntervalDays(4)).toBe(240);
    expect(getFiveStarGraduationIntervalDays(5)).toBe(365);
    expect(getFiveStarGraduationIntervalDays(12)).toBe(365);
  });

  it("defaults old 5-star problems to previous streak 1", () => {
    const problem = { confidence: 5 } as Problem;
    expect(getDefaultFiveStarStreak(problem.confidence)).toBe(1);
    expect(getPreviousFiveStarStreak(problem)).toBe(1);
    expect(getNextFiveStarStreak(problem, 5)).toBe(2);
    expect(getReviewIntervalDays(problem, 5)).toBe(60);
  });

  it("defaults old non-5-star problems to previous streak 0", () => {
    const problem = { confidence: 4 } as Problem;
    expect(getDefaultFiveStarStreak(problem.confidence)).toBe(0);
    expect(getPreviousFiveStarStreak(problem)).toBe(0);
    expect(getNextFiveStarStreak(problem, 5)).toBe(1);
    expect(getReviewIntervalDays(problem, 5)).toBe(30);
  });

  it("preserves explicit streak 0 for a 5-star problem", () => {
    const problem = { confidence: 5, fiveStarStreak: 0 } as Problem;
    expect(getPreviousFiveStarStreak(problem)).toBe(0);
    expect(getNextFiveStarStreak(problem, 5)).toBe(1);
    expect(getReviewIntervalDays(problem, 5)).toBe(30);
  });

  it("resets streak on ratings below 5 and uses base intervals", () => {
    const problem = { confidence: 5, fiveStarStreak: 4 } as Problem;
    expect(getNextFiveStarStreak(problem, 4)).toBe(0);
    expect(getReviewIntervalDays(problem, 4)).toBe(10);
  });
});

describe("prioritizeProblems", () => {
  it("returns empty array for empty input", () => {
    expect(prioritizeProblems([], 5)).toEqual([]);
  });

  it("returns empty array for limit 0", () => {
    const problems = [{ id: "a", confidence: 1, nextReviewDate: "2026-01-01" }] as Problem[];
    expect(prioritizeProblems(problems, 0)).toEqual([]);
  });

  it("returns single problem unchanged", () => {
    const problems = [{ id: "a", confidence: 3, nextReviewDate: "2026-01-01" }] as Problem[];
    const result = prioritizeProblems(problems, 5);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("sorts lowest confidence first", () => {
    const problems = [
      { id: "high", confidence: 5, nextReviewDate: "2026-01-01" },
      { id: "low", confidence: 1, nextReviewDate: "2026-01-01" },
      { id: "mid", confidence: 3, nextReviewDate: "2026-01-01" },
    ] as Problem[];
    const result = prioritizeProblems(problems, 3);
    expect(result[0].id).toBe("low");
    expect(result[1].id).toBe("mid");
    expect(result[2].id).toBe("high");
  });

  it("puts overdue cards before cards due today inside one level", () => {
    const today = "2026-11-16";
    const problems = [
      { id: "due-today-a", confidence: 3, nextReviewDate: "2026-11-16" },
      { id: "overdue-a", confidence: 3, nextReviewDate: "2026-11-15" },
      { id: "due-today-b", confidence: 3, nextReviewDate: "2026-11-16" },
      { id: "overdue-b", confidence: 3, nextReviewDate: "2026-01-01" },
    ] as Problem[];
    const ids = prioritizeProblems(problems, 4, today).map((p) => p.id);
    expect([...ids.slice(0, 2)].sort()).toEqual(["overdue-a", "overdue-b"]);
    expect([...ids.slice(2)].sort()).toEqual(["due-today-a", "due-today-b"]);
  });

  it("orders overdue cards of one level by the day's rotation key, not by how long they have waited", () => {
    const today = "2026-11-16";
    const problems = [
      { id: "recent", confidence: 3, nextReviewDate: "2026-11-11" },
      { id: "old", confidence: 3, nextReviewDate: "2026-01-01" },
      { id: "medium", confidence: 3, nextReviewDate: "2026-06-01" },
    ] as Problem[];
    const expected = ["recent", "old", "medium"].sort(
      (a, b) => rotationKey(a, today) - rotationKey(b, today),
    );
    expect(prioritizeProblems(problems, 3, today).map((p) => p.id)).toEqual(expected);
  });

  it("fills the limit from the weaker level before a stronger level gets a slot", () => {
    const today = "2026-11-16";
    const weak = ["w1", "w2", "w3", "w4"].map((id) => ({ id, confidence: 1, nextReviewDate: today }));
    const strong = ["s1", "s2"].map((id) => ({ id, confidence: 2, nextReviewDate: "2026-01-01" }));
    const result = prioritizeProblems([...strong, ...weak] as Problem[], 3, today);
    expect(result.every((p) => p.confidence === 1)).toBe(true);
  });

  it("leaves the rest of the day's order in place when the first card is removed", () => {
    const today = "2026-11-16";
    const problems = Array.from({ length: 9 }, (_, i) => ({
      id: `card-${i}`,
      confidence: 3,
      nextReviewDate: "2026-11-01",
    })) as Problem[];
    const full = prioritizeProblems(problems, 9, today).map((p) => p.id);
    const withoutFirst = prioritizeProblems(
      problems.filter((p) => p.id !== full[0]),
      9,
      today,
    ).map((p) => p.id);
    expect(withoutFirst).toEqual(full.slice(1));
  });

  it("takes turns: a level larger than the limit shows different cards on consecutive days", () => {
    const problems = Array.from({ length: 12 }, (_, i) => ({
      id: `backlog-${i}`,
      confidence: 2,
      nextReviewDate: "2026-10-01",
    })) as Problem[];
    const shown = ["2026-11-16", "2026-11-17", "2026-11-18"].map((day) =>
      prioritizeProblems(problems, 5, day)
        .map((p) => p.id)
        .sort()
        .join(","),
    );
    expect(new Set(shown).size).toBeGreaterThanOrEqual(2);
    const onAllThree = shown[0].split(",").filter((id) => shown[1].includes(id) && shown[2].includes(id));
    expect(onAllThree.length).toBeLessThan(5);
  });

  it("puts a card dismissed yesterday behind the overdue cards of its level", () => {
    // Dismiss sets nextReviewDate to tomorrow, so on that day it is "due today".
    const today = "2026-11-17";
    const problems = [
      { id: "dismissed-yesterday", confidence: 2, nextReviewDate: "2026-11-17" },
      { id: "overdue-1", confidence: 2, nextReviewDate: "2026-11-10" },
      { id: "overdue-2", confidence: 2, nextReviewDate: "2026-11-12" },
    ] as Problem[];
    const ids = prioritizeProblems(problems, 2, today).map((p) => p.id);
    expect(ids).not.toContain("dismissed-yesterday");
  });

  it("breaks a rotation-key collision by id", () => {
    const today = "2026-11-16";
    // Two different ids on one ring position (2276179588). Among 3,846 ids
    // the chance of some pair doing this is about 1 in 600, and without the
    // id rule their order would follow the order they were stored in, which
    // differs between the web app and the iOS app.
    expect(ringPosition("p-139599")).toBe(ringPosition("p-322382"));
    const pair = [
      { id: "p-322382", confidence: 3, nextReviewDate: "2026-11-01" },
      { id: "p-139599", confidence: 3, nextReviewDate: "2026-11-01" },
    ] as Problem[];
    expect(prioritizeProblems(pair, 2, today).map((p) => p.id)).toEqual(["p-139599", "p-322382"]);
    expect(prioritizeProblems([...pair].reverse(), 2, today).map((p) => p.id)).toEqual([
      "p-139599",
      "p-322382",
    ]);
  });

  it("keeps cards with the same id in the order they came", () => {
    const problems = [
      { id: "same", confidence: 3, nextReviewDate: "2026-11-01", title: "second" },
      { id: "same", confidence: 3, nextReviewDate: "2026-11-01", title: "first" },
    ] as Problem[];
    expect(prioritizeProblems(problems, 2, "2026-11-16").map((p) => p.title)).toEqual(["second", "first"]);
  });

  it("respects limit parameter", () => {
    const problems = [
      { id: "a", confidence: 1, nextReviewDate: "2026-01-01" },
      { id: "b", confidence: 2, nextReviewDate: "2026-01-01" },
      { id: "c", confidence: 3, nextReviewDate: "2026-01-01" },
    ] as Problem[];
    const result = prioritizeProblems(problems, 2);
    expect(result).toHaveLength(2);
  });

  it("produces stable ordering for same input", () => {
    const problems = [
      { id: "a", confidence: 3, nextReviewDate: "2026-01-01" },
      { id: "b", confidence: 3, nextReviewDate: "2026-01-01" },
      { id: "c", confidence: 3, nextReviewDate: "2026-01-01" },
    ] as Problem[];
    const result1 = prioritizeProblems(problems, 3);
    const result2 = prioritizeProblems(problems, 3);
    expect(result1.map((p) => p.id)).toEqual(result2.map((p) => p.id));
  });

  it("does not mutate original array", () => {
    const problems = [
      { id: "b", confidence: 5, nextReviewDate: "2026-01-01" },
      { id: "a", confidence: 1, nextReviewDate: "2026-01-01" },
    ] as Problem[];
    const original = [...problems];
    prioritizeProblems(problems, 2);
    expect(problems[0].id).toBe(original[0].id);
    expect(problems[1].id).toBe(original[1].id);
  });

  it("defaults confidence to 3 when missing", () => {
    const problems = [
      { id: "no-conf", nextReviewDate: "2026-01-01" },
      { id: "low", confidence: 1, nextReviewDate: "2026-01-01" },
    ] as Problem[];
    const result = prioritizeProblems(problems, 2);
    expect(result[0].id).toBe("low");
    expect(result[1].id).toBe("no-conf");
  });
});

describe("queue rotation keys", () => {
  it("ringPosition matches the reference values", () => {
    expect(ringPosition("a")).toBe(444641715);
    expect(ringPosition("abc")).toBe(482950588);
    expect(ringPosition("weak-overdue")).toBe(3920010620);
    expect(ringPosition("3f2c1e0a-1b2c-4d5e-8f90-123456789abc")).toBe(2622137607);
    expect(ringPosition("题目-1")).toBe(1855853268);
  });

  it("dayNumber counts whole days from 1970-01-01", () => {
    expect(dayNumber("1970-01-01")).toBe(0);
    expect(dayNumber("1970-01-02")).toBe(1);
    expect(dayNumber("2026-11-16")).toBe(20773);
  });

  it("rotationPointer matches the reference values", () => {
    expect(rotationPointer("2026-11-16")).toBe(1804083389);
    expect(rotationPointer("2026-11-17")).toBe(163551862);
    expect(rotationPointer("2026-11-18")).toBe(2817987631);
    expect(rotationPointer("2027-01-01")).toBe(3649044475);
  });

  it("rotationKey is the distance from the day's pointer to the card, wrapping at 2^32", () => {
    // 444641715 - 1804083389 wraps to 2935525622.
    expect(rotationKey("a", "2026-11-16")).toBe(2935525622);
    // 3920010620 - 1804083389 does not wrap.
    expect(rotationKey("weak-overdue", "2026-11-16")).toBe(2115927231);
  });

  it("an unreadable date counts as day 0 instead of producing NaN", () => {
    expect(dayNumber("not-a-date")).toBe(0);
  });

  // Only `YYYY-MM-DD` is a date here. JavaScript and Swift each forgive
  // different malformed strings (an empty part, a space, an exponent, a year
  // under 100), so anything else is day 0 on both.
  it.each([
    "2026--17",
    "2026-11-",
    " 2026-11-17",
    "2026-1e1-17",
    "2026-11-17.5",
    "2026-11-17T00:00:00.000Z",
    "26-11-17",
    "0099-01-01",
    "0000-01-01",
    "-0001-01-01",
    "275761-01-01",
    "2026-1-7",
    "",
  ])("dayNumber(%j) is 0", (text) => {
    expect(dayNumber(text)).toBe(0);
  });

  it("dayNumber keeps reading well-formed dates the calendar does not have", () => {
    // The month and the day roll over, the same way on every platform.
    expect(dayNumber("2026-13-01")).toBe(dayNumber("2027-01-01"));
    expect(dayNumber("2027-02-29")).toBe(dayNumber("2027-03-01"));
    expect(dayNumber("1969-12-31")).toBe(-1);
    expect(rotationPointer("")).toBe(0);
  });
});
