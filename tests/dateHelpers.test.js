import { describe, it, expect, vi } from "vitest";
import { todayStr, utcToLocalDateStr, addDays, formatRelativeDate, generateId } from "../src/utils/dateHelpers";

describe("todayStr", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = todayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date", () => {
    const expected = new Date().toISOString().split("T")[0];
    expect(todayStr()).toBe(expected);
  });
});

describe("utcToLocalDateStr", () => {
  it("converts a valid ISO timestamp to YYYY-MM-DD", () => {
    const result = utcToLocalDateStr("2026-03-15T10:30:00.000Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns null for null input", () => {
    expect(utcToLocalDateStr(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(utcToLocalDateStr(undefined)).toBeNull();
  });

  it("returns null for invalid timestamp", () => {
    expect(utcToLocalDateStr("not-a-date")).toBeNull();
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    expect(addDays("2026-03-01", 5)).toBe("2026-03-06");
  });

  it("adds zero days (identity)", () => {
    expect(addDays("2026-03-15", 0)).toBe("2026-03-15");
  });

  it("subtracts days with negative value", () => {
    expect(addDays("2026-03-10", -3)).toBe("2026-03-07");
  });

  it("handles month boundary", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("handles year boundary", () => {
    expect(addDays("2025-12-30", 5)).toBe("2026-01-04");
  });

  it("handles leap year", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-28", 2)).toBe("2028-03-01");
  });
});

describe("formatRelativeDate", () => {
  it('returns "Today" for today', () => {
    expect(formatRelativeDate(todayStr())).toBe("Today");
  });

  it('returns "Tomorrow" for tomorrow', () => {
    const tomorrow = addDays(todayStr(), 1);
    expect(formatRelativeDate(tomorrow)).toBe("Tomorrow");
  });

  it('returns "Xd" for future dates beyond tomorrow', () => {
    const future = addDays(todayStr(), 5);
    expect(formatRelativeDate(future)).toBe("5d");
  });

  it('returns "Xd ago" for past dates', () => {
    const past = addDays(todayStr(), -3);
    expect(formatRelativeDate(past)).toBe("3d ago");
  });
});

describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
