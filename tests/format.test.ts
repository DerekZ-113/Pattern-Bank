import { describe, it, expect } from "vitest";
import { formatClockTime, formatLastSynced, formatNextReview } from "../src/utils/format";

describe("formatLastSynced", () => {
  it("handles a missing timestamp", () => {
    expect(formatLastSynced(null)).toBe("Not synced yet");
    expect(formatLastSynced(undefined)).toBe("Not synced yet");
  });

  it("treats invalid and future timestamps as recent", () => {
    expect(formatLastSynced("not-a-date")).toBe("Last synced recently");
    expect(formatLastSynced(new Date(Date.now() + 60_000).toISOString())).toBe(
      "Last synced recently"
    );
  });

  it("formats minutes, hours, and days ago", () => {
    expect(formatLastSynced(new Date(Date.now() - 20_000).toISOString())).toBe(
      "Last synced just now"
    );
    expect(formatLastSynced(new Date(Date.now() - 5 * 60_000).toISOString())).toBe(
      "Last synced 5m ago"
    );
    expect(formatLastSynced(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe(
      "Last synced 3h ago"
    );
    expect(formatLastSynced(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe(
      "Last synced 2d ago"
    );
  });
});

describe("formatClockTime", () => {
  it("formats an ISO timestamp as a local clock time", () => {
    // Local-constructed date → deterministic local clock reading in any TZ.
    expect(formatClockTime(new Date(2026, 6, 21, 18, 5).toISOString())).toBe("6:05 PM");
  });

  it("returns an empty string for invalid timestamps", () => {
    expect(formatClockTime("not-a-date")).toBe("");
  });
});

describe("formatNextReview", () => {
  it("says tomorrow for a one-day interval", () => {
    expect(formatNextReview(1)).toBe("Next review tomorrow");
  });

  it("counts days for longer intervals", () => {
    expect(formatNextReview(2)).toBe("Next review in 2 days");
    expect(formatNextReview(30)).toBe("Next review in 30 days");
    expect(formatNextReview(365)).toBe("Next review in 365 days");
  });

  it("never promises a review today or in the past", () => {
    expect(formatNextReview(0)).toBe("Next review tomorrow");
  });
});
