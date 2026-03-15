import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Problem } from "../src/types";
import type { BackupData } from "../src/types";

// Mock localStorage before importing storage module
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = String(value); }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
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
  importData,
  exportData,
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
    ] as Problem[];
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
    ] as Problem[];
    expect(countReviewedToday(problems)).toBe(2);
  });
});

describe("loadPreferences / savePreferences", () => {
  it("returns defaults when nothing stored", () => {
    expect(loadPreferences()).toEqual({ dailyReviewGoal: 5, hidePatternsDuringReview: false });
  });

  it("round-trips preferences", () => {
    savePreferences({ dailyReviewGoal: 8, hidePatternsDuringReview: false });
    expect(loadPreferences()).toEqual({ dailyReviewGoal: 8, hidePatternsDuringReview: false });
  });

  it("merges with defaults for missing keys", () => {
    localStorageMock.setItem("patternbank-preferences", JSON.stringify({}));
    const prefs = loadPreferences();
    expect(prefs.dailyReviewGoal).toBe(5);
  });

  it("returns defaults on corrupted JSON", () => {
    localStorageMock.setItem("patternbank-preferences", "bad{json");
    expect(loadPreferences()).toEqual({ dailyReviewGoal: 5, hidePatternsDuringReview: false });
  });
});

// ---------------------------------------------------------------------------
// importData
// ---------------------------------------------------------------------------

class MockFileReader {
  onload: ((e: { target: { result: string } }) => void) | null = null;
  onerror: (() => void) | null = null;
  readAsText(_file: File) {
    // overridden per test
  }
}

describe("importData", () => {
  beforeEach(() => {
    vi.stubGlobal("FileReader", MockFileReader);
  });

  it("resolves with parsed BackupData for valid JSON file", async () => {
    const backup: BackupData = {
      exportedAt: "2026-03-14T00:00:00.000Z",
      problems: [
        { id: "1", title: "Two Sum", difficulty: "Easy", patterns: ["Hash Table"] } as Problem,
      ],
    };

    MockFileReader.prototype.readAsText = function () {
      this.onload?.({ target: { result: JSON.stringify(backup) } });
    };

    const mockFile = new Blob([JSON.stringify(backup)]) as File;
    const result = await importData(mockFile);
    expect(result.exportedAt).toBe(backup.exportedAt);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].id).toBe("1");
  });

  it("includes reviewLog when present in backup", async () => {
    const backup: BackupData = {
      exportedAt: "2026-03-14T00:00:00.000Z",
      problems: [
        { id: "1", title: "Two Sum", difficulty: "Easy", patterns: ["Hash Table"] } as Problem,
      ],
      reviewLog: [{ date: "2026-03-13" }, { date: "2026-03-14" }],
    };

    MockFileReader.prototype.readAsText = function () {
      this.onload?.({ target: { result: JSON.stringify(backup) } });
    };

    const mockFile = new Blob([JSON.stringify(backup)]) as File;
    const result = await importData(mockFile);
    expect(result.reviewLog).toHaveLength(2);
    expect(result.reviewLog?.[0].date).toBe("2026-03-13");
  });

  it("rejects when problems array is missing", async () => {
    const badData = { exportedAt: "2026-03-14T00:00:00.000Z" };

    MockFileReader.prototype.readAsText = function () {
      this.onload?.({ target: { result: JSON.stringify(badData) } });
    };

    const mockFile = new Blob([JSON.stringify(badData)]) as File;
    await expect(importData(mockFile)).rejects.toThrow(
      "Invalid backup file: missing problems array"
    );
  });

  it("rejects when problems is not an array", async () => {
    const badData = { exportedAt: "2026-03-14T00:00:00.000Z", problems: "not-an-array" };

    MockFileReader.prototype.readAsText = function () {
      this.onload?.({ target: { result: JSON.stringify(badData) } });
    };

    const mockFile = new Blob([JSON.stringify(badData)]) as File;
    await expect(importData(mockFile)).rejects.toThrow(
      "Invalid backup file: missing problems array"
    );
  });

  it("rejects when problems have missing required fields", async () => {
    const badData = {
      exportedAt: "2026-03-14T00:00:00.000Z",
      problems: [{ id: "1", title: "Two Sum" }], // missing difficulty and patterns
    };

    MockFileReader.prototype.readAsText = function () {
      this.onload?.({ target: { result: JSON.stringify(badData) } });
    };

    const mockFile = new Blob([JSON.stringify(badData)]) as File;
    await expect(importData(mockFile)).rejects.toThrow(
      "Invalid backup file: problems have missing fields"
    );
  });

  it("rejects on invalid JSON", async () => {
    MockFileReader.prototype.readAsText = function () {
      this.onload?.({ target: { result: "not valid json{{{{" } });
    };

    const mockFile = new Blob(["not valid json{{{{"]) as File;
    await expect(importData(mockFile)).rejects.toThrow(
      "Could not parse file. Is it a valid JSON backup?"
    );
  });

  it("rejects on FileReader error", async () => {
    MockFileReader.prototype.readAsText = function () {
      this.onerror?.();
    };

    const mockFile = new Blob(["anything"]) as File;
    await expect(importData(mockFile)).rejects.toThrow("Failed to read file");
  });
});

// ---------------------------------------------------------------------------
// exportData
// ---------------------------------------------------------------------------

describe("exportData", () => {
  let mockClick: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockCreateElement: ReturnType<typeof vi.fn>;
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockClick = vi.fn();
    mockCreateObjectURL = vi.fn(() => "blob:mock-url");
    mockRevokeObjectURL = vi.fn();
    mockAnchor = { href: "", download: "", click: mockClick };
    mockCreateElement = vi.fn(() => mockAnchor);

    vi.stubGlobal("URL", {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });
    vi.stubGlobal("document", {
      createElement: mockCreateElement,
    });
    vi.stubGlobal("Blob", class MockBlob {
      content: string[];
      type: string;
      constructor(content: string[], options?: { type?: string }) {
        this.content = content;
        this.type = options?.type ?? "";
      }
    });
  });

  it("creates a download link with correct filename pattern", () => {
    exportData();

    expect(mockCreateElement).toHaveBeenCalledWith("a");
    expect(mockAnchor.href).toBe("blob:mock-url");
    expect(mockAnchor.download).toMatch(/^patternbank-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("triggers a click on the anchor element", () => {
    exportData();
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it("includes problems and reviewLog in exported JSON", () => {
    const problems = [
      { id: "1", title: "Two Sum", difficulty: "Easy", patterns: ["Hash Table"] } as Problem,
    ];
    saveProblems(problems);
    saveReviewLog([{ date: "2026-03-14" }]);

    exportData();

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = mockCreateObjectURL.mock.calls[0][0] as { content: string[] };
    const exported = JSON.parse(blobArg.content[0]) as BackupData;
    expect(exported.problems).toHaveLength(1);
    expect(exported.problems[0].id).toBe("1");
    expect(exported.reviewLog).toHaveLength(1);
    expect(exported.reviewLog?.[0].date).toBe("2026-03-14");
  });

  it("calls URL.revokeObjectURL after click", () => {
    exportData();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("sets exportedAt to a valid ISO timestamp", () => {
    exportData();

    const blobArg = mockCreateObjectURL.mock.calls[0][0] as { content: string[] };
    const exported = JSON.parse(blobArg.content[0]) as BackupData;
    const exportedAt = exported.exportedAt!;
    expect(() => new Date(exportedAt)).not.toThrow();
    expect(new Date(exportedAt).toISOString()).toBe(exportedAt);
  });
});
