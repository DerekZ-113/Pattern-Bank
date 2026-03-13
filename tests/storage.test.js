import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage before importing storage module
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const {
  loadProblems,
  saveProblems,
  loadReviewLog,
  saveReviewLog,
  logReviewToday,
  calculateStreak,
  countReviewedToday,
  loadPreferences,
  savePreferences,
} = await import("../src/utils/storage");

const { todayStr, addDays } = await import("../src/utils/dateHelpers");

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe("loadProblems / saveProblems", () => {
  it("returns empty array when nothing stored", () => {
    expect(loadProblems()).toEqual([]);
  });

  it("round-trips problems", () => {
    const problems = [
      { id: "1", title: "Two Sum", difficulty: "Easy", patterns: ["Hash Table"] },
    ];
    saveProblems(problems);
    expect(loadProblems()).toEqual(problems);
  });

  it("returns empty array on corrupted JSON", () => {
    localStorageMock.setItem("patternbank-problems", "not valid json{{{");
    expect(loadProblems()).toEqual([]);
  });
});

describe("loadReviewLog / saveReviewLog", () => {
  it("returns empty array when nothing stored", () => {
    expect(loadReviewLog()).toEqual([]);
  });

  it("round-trips review log", () => {
    const log = [{ date: "2026-03-10" }, { date: "2026-03-11" }];
    saveReviewLog(log);
    expect(loadReviewLog()).toEqual(log);
  });
});

describe("logReviewToday", () => {
  it("adds today's date to log", () => {
    logReviewToday();
    const log = loadReviewLog();
    expect(log).toHaveLength(1);
    expect(log[0].date).toBe(todayStr());
  });

  it("is idempotent — does not duplicate today's entry", () => {
    logReviewToday();
    logReviewToday();
    logReviewToday();
    const log = loadReviewLog();
    expect(log).toHaveLength(1);
  });
});

describe("calculateStreak", () => {
  it("returns 0 for empty log", () => {
    expect(calculateStreak()).toBe(0);
  });

  it("returns 1 if only today reviewed", () => {
    saveReviewLog([{ date: todayStr() }]);
    expect(calculateStreak()).toBe(1);
  });

  it("counts consecutive days", () => {
    const today = todayStr();
    saveReviewLog([
      { date: addDays(today, -2) },
      { date: addDays(today, -1) },
      { date: today },
    ]);
    expect(calculateStreak()).toBe(3);
  });

  it("breaks streak on gap", () => {
    const today = todayStr();
    saveReviewLog([
      { date: addDays(today, -5) },
      // gap at -4, -3, -2
      { date: addDays(today, -1) },
      { date: today },
    ]);
    expect(calculateStreak()).toBe(2);
  });

  it("counts yesterday as streak if today not yet reviewed", () => {
    const today = todayStr();
    saveReviewLog([
      { date: addDays(today, -2) },
      { date: addDays(today, -1) },
    ]);
    expect(calculateStreak()).toBe(2);
  });

  it("returns 0 if last review was 2+ days ago", () => {
    saveReviewLog([{ date: addDays(todayStr(), -3) }]);
    expect(calculateStreak()).toBe(0);
  });
});

describe("countReviewedToday", () => {
  it("returns 0 for empty array", () => {
    expect(countReviewedToday([])).toBe(0);
  });

  it("counts problems reviewed today", () => {
    const today = todayStr();
    const problems = [
      { id: "1", lastReviewed: today },
      { id: "2", lastReviewed: addDays(today, -1) },
      { id: "3", lastReviewed: today },
    ];
    expect(countReviewedToday(problems)).toBe(2);
  });
});

describe("loadPreferences / savePreferences", () => {
  it("returns defaults when nothing stored", () => {
    expect(loadPreferences()).toEqual({ dailyReviewGoal: 5 });
  });

  it("round-trips preferences", () => {
    savePreferences({ dailyReviewGoal: 8 });
    expect(loadPreferences()).toEqual({ dailyReviewGoal: 8 });
  });

  it("merges with defaults for missing keys", () => {
    localStorageMock.setItem("patternbank-preferences", JSON.stringify({}));
    const prefs = loadPreferences();
    expect(prefs.dailyReviewGoal).toBe(5);
  });

  it("returns defaults on corrupted JSON", () => {
    localStorageMock.setItem("patternbank-preferences", "bad{json");
    expect(loadPreferences()).toEqual({ dailyReviewGoal: 5 });
  });
});
