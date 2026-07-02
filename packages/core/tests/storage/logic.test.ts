import { describe, it, expect } from "vitest";
import { calculateStreak, countReviewedToday, pruneOldEvents } from "../../src/storage/logic";
import { todayStr, addDays } from "../../src/dateHelpers";
import type { Problem, ReviewEvent } from "../../src/types";

function makeEvent(date: string, overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    date,
    problemId: "p1",
    confidence: 3,
    patterns: [],
    timestamp: `${date}T12:00:00.000Z`,
    ...overrides,
  };
}

describe("calculateStreak", () => {
  const today = todayStr();

  it("returns 0 for an empty log", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const log = [
      { date: addDays(today, -2) },
      { date: addDays(today, -1) },
      { date: today },
    ];
    expect(calculateStreak(log)).toBe(3);
  });

  it("keeps the streak alive when today has no review yet", () => {
    const log = [
      { date: addDays(today, -2) },
      { date: addDays(today, -1) },
    ];
    expect(calculateStreak(log)).toBe(2);
  });

  it("returns 0 when the most recent review is older than yesterday", () => {
    expect(calculateStreak([{ date: addDays(today, -3) }])).toBe(0);
  });

  it("stops counting at a gap", () => {
    const log = [
      { date: addDays(today, -4) },
      { date: addDays(today, -1) },
      { date: today },
    ];
    expect(calculateStreak(log)).toBe(2);
  });
});

describe("countReviewedToday", () => {
  it("counts only problems whose lastReviewed is today", () => {
    const today = todayStr();
    const problems = [
      { id: "a", lastReviewed: today },
      { id: "b", lastReviewed: addDays(today, -1) },
      { id: "c", lastReviewed: null },
      { id: "d", lastReviewed: today },
    ] as Problem[];
    expect(countReviewedToday(problems)).toBe(2);
    expect(countReviewedToday([])).toBe(0);
  });
});

describe("pruneOldEvents (F-3 pure watermark)", () => {
  it("keeps events on or after the cutoff and returns the cutoff watermark", () => {
    const today = "2026-07-01";
    const events = [
      makeEvent("2026-01-01"),
      makeEvent("2026-01-02"),
      makeEvent("2026-06-30"),
      makeEvent("2026-07-01"),
    ];

    const { kept, cutoffIso } = pruneOldEvents(events, { retentionDays: 180, today });

    expect(cutoffIso).toBe("2026-01-02"); // today - 180 days
    expect(kept.map((e) => e.date)).toEqual(["2026-01-02", "2026-06-30", "2026-07-01"]);
  });

  it("keeps an event exactly on the cutoff date", () => {
    const { kept, cutoffIso } = pruneOldEvents(
      [makeEvent("2026-06-21")],
      { retentionDays: 10, today: "2026-07-01" },
    );
    expect(cutoffIso).toBe("2026-06-21");
    expect(kept).toHaveLength(1);
  });

  it("null retentionDays disables pruning: kept=all, cutoffIso=null (web behavior)", () => {
    const events = [makeEvent("1999-01-01"), makeEvent("2026-07-01")];
    const { kept, cutoffIso } = pruneOldEvents(events, { retentionDays: null });
    expect(kept).toHaveLength(2);
    expect(cutoffIso).toBeNull();
  });

  it("undefined retentionDays also disables pruning", () => {
    const events = [makeEvent("1999-01-01")];
    const { kept, cutoffIso } = pruneOldEvents(events, {});
    expect(kept).toHaveLength(1);
    expect(cutoffIso).toBeNull();
  });

  it("defaults today to the current local date", () => {
    const recent = makeEvent(todayStr());
    const ancient = makeEvent("1999-01-01");
    const { kept, cutoffIso } = pruneOldEvents([recent, ancient], { retentionDays: 30 });
    expect(kept).toEqual([recent]);
    expect(cutoffIso).toBe(addDays(todayStr(), -30));
  });

  it("is pure: does not mutate the input array and has no persistence side effects", () => {
    const events = [
      makeEvent("2026-01-01"),
      makeEvent("2026-07-01"),
    ];
    const snapshot = events.map((e) => ({ ...e }));

    const first = pruneOldEvents(events, { retentionDays: 30, today: "2026-07-01" });
    const second = pruneOldEvents(events, { retentionDays: 30, today: "2026-07-01" });

    expect(events).toEqual(snapshot);
    expect(first.kept).toEqual(second.kept);
    expect(first.kept).not.toBe(events);
  });
});
