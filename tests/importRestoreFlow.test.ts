// @vitest-environment jsdom
// Full restore-flow regression (F-20 import contract): clear-all → import a
// pre-clear JSON backup → sign-in sync → the restored data must survive
// locally AND reach the cloud. Everything is real (storage.ts on jsdom
// localStorage, useProblems/usePreferences/useCloudSync, core merge +
// performFullSync) except the Supabase surface, which is a mock cloud
// holding stale pre-clear data — the exact state that used to swallow the
// restore.
import { renderHook, act, waitFor } from "@testing-library/react";
import useProblems from "../src/hooks/useProblems";
import {
  loadProblems,
  saveProblems,
  loadReviewLog,
  saveReviewLog,
  loadReviewEvents,
  saveReviewEvents,
  loadDataReset,
} from "../src/utils/storage";
import { timestampMs } from "@patternbank/core";
import type { User } from "@supabase/supabase-js";
import type { BackupData, Problem, ReviewEvent } from "../src/types";

const { mockCloud } = vi.hoisted(() => {
  const mockCloud = {
    fetchProblems: vi.fn(),
    fetchProblemTombstones: vi.fn(),
    fetchDataReset: vi.fn(),
    fetchReviewLog: vi.fn(),
    fetchReviewEvents: vi.fn(),
    fetchPreferences: vi.fn(),
    upsertDataReset: vi.fn(),
    deleteAllUserProblems: vi.fn(),
    deleteAllUserReviewLog: vi.fn(),
    upsertProblemTombstones: vi.fn(),
    deleteProblems: vi.fn(),
    upsertProblems: vi.fn(),
    batchInsertReviewLogs: vi.fn(),
    upsertPreferences: vi.fn(),
  };
  return { mockCloud };
});

// Real merge logic and a syncOnSignIn that drives the REAL core full sync
// against the mock cloud — mirroring src/utils/sync.ts exactly.
vi.mock("../src/utils/sync", async () => {
  const core = await vi.importActual<typeof import("@patternbank/core")>("@patternbank/core");
  const { webStorage } = await vi.importActual<typeof import("../src/adapters/webStorage")>(
    "../src/adapters/webStorage",
  );
  return {
    syncOnSignIn: vi.fn(
      async (userId, problems, reviewLog, reviewEvents, preferences, problemTombstones, dataReset) => {
        const result = await core.performFullSync({
          userId,
          cloud: mockCloud,
          storage: webStorage,
          local: { problems, reviewLog, reviewEvents, preferences, problemTombstones, dataReset },
          eventRetentionDays: null,
        });
        if (result.status === "error") {
          return {
            problems, reviewLog, reviewEvents, preferences, problemTombstones, dataReset,
            hasChanges: false, error: result.error,
          };
        }
        const { status: _status, ...rest } = result;
        return { ...rest, error: null };
      },
    ),
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
    lastReviewed: "2026-05-20",
    nextReviewDate: "2026-05-25",
    updatedAt: "2026-05-20T10:00:00.000Z",
    ...overrides,
  };
}

const preClearProblems = [makeProblem({ id: "p1" }), makeProblem({ id: "p2", title: "Add Two Numbers" })];
const preClearLog = [{ date: "2026-05-19" }, { date: "2026-05-20" }];
const preClearEvents: ReviewEvent[] = [
  { date: "2026-05-20", problemId: "p1", confidence: 3, patterns: ["Hash Table"], timestamp: "2026-05-20T10:00:00.000Z" },
];

const mockUser = { id: "user-123" } as User;
const showToast = vi.fn();

function greenCloudWithStalePreClearData() {
  mockCloud.fetchProblems.mockResolvedValue({ data: preClearProblems, error: null });
  mockCloud.fetchProblemTombstones.mockResolvedValue({ data: [], error: null });
  mockCloud.fetchDataReset.mockResolvedValue({ data: null, error: null });
  mockCloud.fetchReviewLog.mockResolvedValue({ data: preClearLog, error: null });
  mockCloud.fetchReviewEvents.mockResolvedValue({ data: preClearEvents, error: null });
  mockCloud.fetchPreferences.mockResolvedValue({ data: null, error: null });
  mockCloud.upsertDataReset.mockResolvedValue({ error: null });
  mockCloud.deleteAllUserProblems.mockResolvedValue({ error: null });
  mockCloud.deleteAllUserReviewLog.mockResolvedValue({ error: null });
  mockCloud.upsertProblemTombstones.mockResolvedValue({ error: null });
  mockCloud.deleteProblems.mockResolvedValue({ error: null });
  mockCloud.upsertProblems.mockResolvedValue({ data: [], error: null });
  mockCloud.batchInsertReviewLogs.mockResolvedValue({ error: null });
  mockCloud.upsertPreferences.mockResolvedValue({ data: null, error: null });
}

describe("clear-all → import backup → sign-in sync (full restore flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    greenCloudWithStalePreClearData();
  });

  it("the restored backup survives the sync locally and reaches the cloud", async () => {
    // Signed-out user with data, and a backup exported before the clear.
    saveProblems(preClearProblems);
    saveReviewLog(preClearLog);
    saveReviewEvents(preClearEvents);
    const backup: BackupData = {
      exportedAt: "2026-05-21T00:00:00.000Z",
      problems: preClearProblems,
      reviewLog: preClearLog,
      reviewEvents: preClearEvents,
    };
    const backupFile = new File([JSON.stringify(backup)], "backup.json", { type: "application/json" });

    const { result, rerender } = renderHook((props: { user: User | null }) => useProblems({ user: props.user, showToast }), {
      initialProps: { user: null as User | null },
    });
    expect(result.current.problems).toHaveLength(2);

    // 1. Clear all data (signed out — the cloud still holds the stale copy).
    await act(async () => {
      await result.current.handleClearAllData();
    });
    const reset = loadDataReset();
    expect(reset).not.toBeNull();
    expect(result.current.problems).toEqual([]);
    expect(loadReviewLog()).toEqual([]);
    expect(loadReviewEvents()).toEqual([]);

    // 2. Import the backup — restored rows must be re-stamped past the reset.
    await act(async () => {
      await result.current.handleImport(backupFile);
    });
    expect(result.current.problems).toHaveLength(2);
    for (const problem of result.current.problems) {
      expect(timestampMs(problem.updatedAt)).toBeGreaterThan(timestampMs(reset!.resetAt));
    }
    const restoredEvents = loadReviewEvents();
    expect(restoredEvents).toHaveLength(1);
    expect(restoredEvents[0].date).toBe("2026-05-20");
    expect(timestampMs(restoredEvents[0].timestamp)).toBeGreaterThan(timestampMs(reset!.resetAt));
    expect(loadReviewLog()).toEqual(preClearLog);

    // 3. Sign in — the sync must keep the restore and repair the cloud.
    rerender({ user: mockUser });
    await waitFor(() => expect(result.current.syncStatus).toBe("synced"));

    // Local survival.
    expect(result.current.problems.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
    expect(loadProblems().map((p) => p.id).sort()).toEqual(["p1", "p2"]);
    expect(loadReviewEvents()).toHaveLength(1);
    expect(loadReviewEvents()[0].date).toBe("2026-05-20");
    // Pre-reset log dates: the event-backed 05-20 survives the core sync
    // itself; the date-only 05-19 has no surviving event to vouch for it, so
    // it lives on locally (handleSyncComplete merges) but never reaches the
    // cloud or other devices.
    expect(loadReviewLog()).toContainEqual({ date: "2026-05-20" });

    // Cloud repair: the local reset marker won, the stale rows were wiped,
    // and the restored rows were pushed back up.
    expect(mockCloud.upsertDataReset).toHaveBeenCalledWith(mockUser.id, reset);
    expect(mockCloud.deleteAllUserProblems).toHaveBeenCalledWith(mockUser.id);
    expect(mockCloud.deleteAllUserReviewLog).toHaveBeenCalledWith(mockUser.id);
    expect(mockCloud.upsertProblems).toHaveBeenCalledTimes(1);
    const [pushedUserId, pushedProblems] = mockCloud.upsertProblems.mock.calls[0];
    expect(pushedUserId).toBe(mockUser.id);
    expect((pushedProblems as Problem[]).map((p) => p.id).sort()).toEqual(["p1", "p2"]);
    for (const problem of pushedProblems as Problem[]) {
      expect(timestampMs(problem.updatedAt)).toBeGreaterThan(timestampMs(reset!.resetAt));
    }
    expect(mockCloud.batchInsertReviewLogs).toHaveBeenCalledTimes(1);
    const [, backfilledEvents] = mockCloud.batchInsertReviewLogs.mock.calls[0];
    expect(backfilledEvents as ReviewEvent[]).toHaveLength(1);
    expect((backfilledEvents as ReviewEvent[])[0].date).toBe("2026-05-20");
  });
});
