// @vitest-environment jsdom
// handleImport restore contract (F-20/F-23/F-25): a backup imported after
// "Clear all data" (or after deleting a problem) must stick across the next
// sign-in sync. Storage is mocked for control; merge logic is the REAL core
// implementation so these tests exercise actual newest-wins/dedupe semantics.
import { renderHook, act } from "@testing-library/react";
import useProblems from "../src/hooks/useProblems";
import useCloudSync from "../src/hooks/useCloudSync";
import {
  loadProblems,
  loadReviewLog,
  saveReviewLog,
  loadReviewEvents,
  saveReviewEvents,
  loadProblemTombstones,
  loadDataReset,
  importData,
} from "../src/utils/storage";
import { pushProblemsToCloud, pushReviewEventsToCloud } from "../src/utils/sync";
import { timestampMs } from "@patternbank/core";
import type { User } from "@supabase/supabase-js";
import type { BackupData, Problem, ReviewEvent } from "../src/types";

vi.mock("../src/hooks/useCloudSync", () => ({
  default: vi.fn(),
}));

vi.mock("../src/utils/storage", () => ({
  loadProblems: vi.fn(() => []),
  saveProblems: vi.fn(),
  loadPreferences: vi.fn(() => ({ dailyReviewGoal: 5, hidePatternsDuringReview: false, enabledExtraPatterns: [] })),
  savePreferences: vi.fn(),
  loadReviewLog: vi.fn(() => []),
  saveReviewLog: vi.fn(),
  logReviewToday: vi.fn(),
  logReviewEvent: vi.fn(),
  logOrReplaceReviewEvent: vi.fn(),
  loadReviewEvents: vi.fn(() => []),
  saveReviewEvents: vi.fn(),
  loadProblemTombstones: vi.fn(() => []),
  saveProblemTombstones: vi.fn(),
  recordProblemTombstone: vi.fn(),
  loadDataReset: vi.fn(() => null),
  saveDataReset: vi.fn(),
  importData: vi.fn(),
  exportData: vi.fn(),
}));

// Push layer mocked, merge/filter logic real — the restore contract depends on
// actual newest-wins and event-dedupe behavior, not mock arithmetic.
vi.mock("../src/utils/sync", async () => {
  const core = await vi.importActual<typeof import("@patternbank/core")>("@patternbank/core");
  return {
    syncOnSignIn: vi.fn(),
    pushProblemToCloud: vi.fn(),
    pushProblemsToCloud: vi.fn(),
    deleteProblemFromCloud: vi.fn(),
    pushReviewToCloud: vi.fn(),
    replaceReviewInCloud: vi.fn(),
    pushReviewEventsToCloud: vi.fn(),
    pushPreferencesToCloud: vi.fn(),
    clearAllCloudData: vi.fn(),
    deduplicateProblems: core.deduplicateProblems,
    mergeProblems: core.mergeProblems,
    mergeReviewLog: core.mergeReviewLog,
    mergeReviewEvents: core.mergeReviewEvents,
    mergeProblemTombstones: core.mergeProblemTombstones,
    filterTombstonedProblems: core.filterTombstonedProblems,
    filterTombstonesAfterDataReset: core.filterTombstonesAfterDataReset,
  };
});

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p1",
    title: "Two Sum",
    leetcodeNumber: null,
    url: null,
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-05-01",
    lastReviewed: null,
    nextReviewDate: "2026-05-02",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    date: "2026-05-01",
    problemId: "p1",
    confidence: 3,
    patterns: ["Hash Table"],
    timestamp: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}

function makeBackup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    exportedAt: "2026-06-01T00:00:00.000Z",
    problems: [makeProblem()],
    reviewLog: [],
    reviewEvents: [],
    ...overrides,
  };
}

const NOW_ISO = "2026-06-15T10:00:00.000Z";
const RESET = { resetAt: "2026-06-10T00:00:00.000Z" };
const mockUser = { id: "user-123" } as User;
const mockShowToast = vi.fn();
const dummyFile = new File(["{}"], "backup.json", { type: "application/json" });

function mockedStorage<T extends (...args: never[]) => unknown>(fn: T) {
  return vi.mocked(fn);
}

async function importBackup(
  result: { current: ReturnType<typeof useProblems> },
  backup: BackupData,
) {
  mockedStorage(importData).mockResolvedValue(backup);
  await act(async () => {
    await result.current.handleImport(dummyFile);
  });
}

describe("handleImport restore contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_ISO));
    mockedStorage(loadProblems).mockReturnValue([]);
    mockedStorage(loadReviewLog).mockReturnValue([]);
    mockedStorage(loadReviewEvents).mockReturnValue([]);
    mockedStorage(loadProblemTombstones).mockReturnValue([]);
    mockedStorage(loadDataReset).mockReturnValue(null);
    vi.mocked(useCloudSync).mockReturnValue({ syncStatus: "idle", invalidateInFlightSync: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-stamps imported problems that predate the active data reset and pushes the re-stamped rows (F-20)", async () => {
    mockedStorage(loadDataReset).mockReturnValue(RESET);
    const { result } = renderHook(() => useProblems({ user: mockUser, showToast: mockShowToast }));

    await importBackup(result, makeBackup({ problems: [makeProblem({ updatedAt: "2026-05-01T00:00:00.000Z" })] }));

    expect(result.current.problems).toHaveLength(1);
    expect(result.current.problems[0].updatedAt).toBe(NOW_ISO);
    expect(pushProblemsToCloud).toHaveBeenCalledWith(mockUser.id, [
      expect.objectContaining({ id: "p1", updatedAt: NOW_ISO }),
    ]);
  });

  it("keeps original timestamps when no reset or tombstone is in play (newest-wins preserved)", async () => {
    const newerLocal = makeProblem({ id: "p2", updatedAt: "2026-06-05T00:00:00.000Z", notes: "local" });
    mockedStorage(loadProblems).mockReturnValue([newerLocal]);
    const { result } = renderHook(() => useProblems({ user: mockUser, showToast: mockShowToast }));

    await importBackup(
      result,
      makeBackup({
        problems: [
          makeProblem({ id: "p1", updatedAt: "2026-05-01T00:00:00.000Z" }),
          makeProblem({ id: "p2", updatedAt: "2026-05-02T00:00:00.000Z", notes: "stale backup" }),
        ],
      }),
    );

    const byId = new Map(result.current.problems.map((p) => [p.id, p]));
    // Accepted imported row keeps its historical stamp — no blind re-stamp.
    expect(byId.get("p1")?.updatedAt).toBe("2026-05-01T00:00:00.000Z");
    // Newer local copy still wins over the older backup copy.
    expect(byId.get("p2")?.notes).toBe("local");
    expect(pushProblemsToCloud).toHaveBeenCalledWith(mockUser.id, [
      expect.objectContaining({ id: "p1", updatedAt: "2026-05-01T00:00:00.000Z" }),
    ]);
  });

  it("merges the backup review log into the local log instead of replacing it (F-23)", async () => {
    mockedStorage(loadReviewLog).mockReturnValue([{ date: "2026-06-12" }]);
    const { result } = renderHook(() => useProblems({ user: mockUser, showToast: mockShowToast }));

    await importBackup(result, makeBackup({ reviewLog: [{ date: "2026-05-01" }, { date: "2026-06-12" }] }));

    expect(saveReviewLog).toHaveBeenCalledWith([{ date: "2026-06-12" }, { date: "2026-05-01" }]);
  });

  it("merges backup review events into the local set instead of replacing it (F-23)", async () => {
    const existing = makeEvent({ problemId: "p9", date: "2026-06-12", timestamp: "2026-06-12T09:00:00.000Z" });
    mockedStorage(loadReviewEvents).mockReturnValue([existing]);
    const { result } = renderHook(() => useProblems({ user: mockUser, showToast: mockShowToast }));

    await importBackup(result, makeBackup({ reviewEvents: [makeEvent()] }));

    const saved = vi.mocked(saveReviewEvents).mock.lastCall![0];
    expect(saved).toHaveLength(2);
    expect(saved).toContainEqual(existing);
    expect(saved).toContainEqual(makeEvent());
  });

  it("re-stamps pre-reset review events past the reset, preserving their date, and pushes only new ones (F-20)", async () => {
    mockedStorage(loadDataReset).mockReturnValue(RESET);
    const postClear = makeEvent({ problemId: "p9", date: "2026-06-14", timestamp: "2026-06-14T09:00:00.000Z" });
    mockedStorage(loadReviewEvents).mockReturnValue([postClear]);
    const { result } = renderHook(() => useProblems({ user: mockUser, showToast: mockShowToast }));

    await importBackup(
      result,
      makeBackup({
        problems: [makeProblem()],
        reviewEvents: [makeEvent({ date: "2026-05-01", timestamp: "2026-05-01T10:00:00.000Z" })],
      }),
    );

    const saved = vi.mocked(saveReviewEvents).mock.lastCall![0] as ReviewEvent[];
    expect(saved).toHaveLength(2);
    const restored = saved.find((e) => e.problemId === "p1")!;
    expect(restored.date).toBe("2026-05-01");
    expect(timestampMs(restored.timestamp)).toBeGreaterThanOrEqual(timestampMs(NOW_ISO));
    expect(pushReviewEventsToCloud).toHaveBeenCalledTimes(1);
    expect(vi.mocked(pushReviewEventsToCloud).mock.calls[0][1]).toEqual([restored]);
  });

  it("re-stamps an imported problem past its live local tombstone (F-25)", async () => {
    mockedStorage(loadProblemTombstones).mockReturnValue([
      { problemId: "p1", deletedAt: "2026-06-01T00:00:00.000Z" },
    ]);
    const { result } = renderHook(() => useProblems({ user: mockUser, showToast: mockShowToast }));

    await importBackup(result, makeBackup({ problems: [makeProblem({ updatedAt: "2026-05-01T00:00:00.000Z" })] }));

    expect(result.current.problems[0].updatedAt).toBe(NOW_ISO);
    expect(pushProblemsToCloud).toHaveBeenCalledWith(mockUser.id, [
      expect.objectContaining({ id: "p1", updatedAt: NOW_ISO }),
    ]);
  });

  it("a same-day re-rate in the backup survives a restore after clear-all (latest rating wins)", async () => {
    mockedStorage(loadDataReset).mockReturnValue(RESET);
    const { result } = renderHook(() => useProblems({ user: mockUser, showToast: mockShowToast }));

    await importBackup(
      result,
      makeBackup({
        problems: [makeProblem()],
        reviewEvents: [
          makeEvent({ confidence: 4, date: "2026-05-01", timestamp: "2026-05-01T10:00:00.000Z" }),
          makeEvent({ confidence: 5, date: "2026-05-01", timestamp: "2026-05-01T10:00:02.000Z" }),
        ],
      }),
    );

    const saved = vi.mocked(saveReviewEvents).mock.lastCall![0] as ReviewEvent[];
    expect(saved).toHaveLength(2);
    const sorted = [...saved].sort((a, b) => timestampMs(a.timestamp) - timestampMs(b.timestamp));
    expect(sorted[sorted.length - 1].confidence).toBe(5);
  });

  it("does not duplicate review events when the same backup is imported twice after a clear-all", async () => {
    mockedStorage(loadDataReset).mockReturnValue(RESET);
    const { result } = renderHook(() => useProblems({ user: mockUser, showToast: mockShowToast }));
    const backup = makeBackup({
      problems: [makeProblem()],
      reviewEvents: [makeEvent({ date: "2026-05-01", timestamp: "2026-05-01T10:00:00.000Z" })],
    });

    await importBackup(result, backup);
    const firstSaved = vi.mocked(saveReviewEvents).mock.lastCall![0] as ReviewEvent[];
    expect(firstSaved).toHaveLength(1);

    // Second import minutes later, with the first restore already persisted.
    vi.setSystemTime(new Date("2026-06-15T10:05:00.000Z"));
    mockedStorage(loadReviewEvents).mockReturnValue(firstSaved);
    await importBackup(result, backup);

    const secondSaved = vi.mocked(saveReviewEvents).mock.lastCall![0] as ReviewEvent[];
    expect(secondSaved).toEqual(firstSaved);
    expect(pushReviewEventsToCloud).toHaveBeenCalledTimes(1);
  });
});
