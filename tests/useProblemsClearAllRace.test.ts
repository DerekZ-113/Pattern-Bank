// @vitest-environment jsdom
// F-20 pins that need useCloudSync itself mocked (incompatible with the
// real-hook flows in useProblems.test.ts): (a) handleClearAllData invalidates
// the in-flight sync, (b) handleSyncComplete discards a result older than the
// local data reset even if it slips through.
import { renderHook, act } from "@testing-library/react";
import useProblems from "../src/hooks/useProblems";
import useCloudSync from "../src/hooks/useCloudSync";
import type { SyncCompleteContext } from "../src/hooks/useCloudSync";
import {
  loadDataReset,
  saveDataReset,
  saveReviewLog,
  saveReviewEvents,
  saveProblemTombstones,
} from "../src/utils/storage";
import type { User } from "@supabase/supabase-js";
import type { Problem, Preferences } from "../src/types";
import type { SyncResult } from "../src/utils/sync";

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

vi.mock("../src/utils/sync", () => ({
  syncOnSignIn: vi.fn(),
  pushProblemToCloud: vi.fn(),
  pushProblemsToCloud: vi.fn(),
  deleteProblemFromCloud: vi.fn(),
  pushReviewToCloud: vi.fn(),
  replaceReviewInCloud: vi.fn(),
  pushReviewEventsToCloud: vi.fn(),
  pushPreferencesToCloud: vi.fn(),
  clearAllCloudData: vi.fn(),
  deduplicateProblems: vi.fn((problems: Problem[]) => ({ problems, removedIds: [] })),
  mergeProblems: vi.fn((local: Problem[], cloud: Problem[]) => ({ problems: [...local, ...cloud], cloudAdded: cloud.length, cloudWon: 0 })),
  mergeReviewLog: vi.fn((local, cloud) => ({ log: [...local, ...cloud], addedFromCloud: cloud.length })),
  mergeReviewEvents: vi.fn((local, cloud) => ({ events: [...local, ...cloud], addedFromCloud: cloud.length, localOnlyEvents: [] })),
  mergeProblemTombstones: vi.fn((local, cloud) => ({ tombstones: [...local, ...cloud], addedFromCloud: cloud.length })),
  filterTombstonedProblems: vi.fn((problems) => problems),
  filterTombstonesAfterDataReset: vi.fn((tombstones) => tombstones),
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "test-1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum",
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

const mockUser = { id: "user-123" } as User;
const mockShowToast = vi.fn();
const defaultPrefs: Preferences = { dailyReviewGoal: 5, hidePatternsDuringReview: false, enabledExtraPatterns: [] };

function makeSyncResult(overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    problems: [],
    reviewLog: [],
    reviewEvents: [],
    preferences: defaultPrefs,
    problemTombstones: [],
    dataReset: null,
    hasChanges: false,
    error: null,
    ...overrides,
  };
}

const invalidateInFlightSync = vi.fn();
let capturedOnSyncComplete: ((result: SyncResult, context: SyncCompleteContext) => void) | null = null;

describe("useProblems clear-all race (F-20, mocked useCloudSync)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSyncComplete = null;
    (loadDataReset as ReturnType<typeof vi.fn>).mockReturnValue(null);
    vi.mocked(useCloudSync).mockImplementation((params) => {
      capturedOnSyncComplete = params.onSyncComplete;
      return { syncStatus: "idle", invalidateInFlightSync };
    });
  });

  it("handleClearAllData invalidates the in-flight sync before anything else", async () => {
    const { result } = renderHook(() =>
      useProblems({ user: mockUser, showToast: mockShowToast })
    );

    await act(async () => {
      await result.current.handleClearAllData();
    });

    expect(invalidateInFlightSync).toHaveBeenCalledTimes(1);
    expect(invalidateInFlightSync.mock.invocationCallOrder[0]).toBeLessThan(
      (saveDataReset as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    );
  });

  it("handleSyncComplete discards a sync result older than the local data reset", () => {
    (loadDataReset as ReturnType<typeof vi.fn>).mockReturnValue({ resetAt: "2026-06-02T00:00:00.000Z" });

    const { result } = renderHook(() =>
      useProblems({ user: mockUser, showToast: mockShowToast })
    );
    expect(capturedOnSyncComplete).not.toBeNull();

    const stale = makeSyncResult({
      problems: [makeProblem({ id: "resurrected-1" })],
      reviewLog: [{ date: "2026-05-01" }],
      dataReset: { resetAt: "2026-06-01T00:00:00.000Z" },
      hasChanges: true,
    });
    act(() => {
      capturedOnSyncComplete!(stale, { preferenceRevisionAtStart: 0 });
    });

    expect(result.current.problems).toEqual([]);
    expect(saveProblemTombstones).not.toHaveBeenCalled();
    expect(saveReviewLog).not.toHaveBeenCalled();
    expect(saveReviewEvents).not.toHaveBeenCalled();
  });

  it("handleSyncComplete still applies a result carrying the same reset marker", () => {
    const reset = { resetAt: "2026-06-02T00:00:00.000Z" };
    (loadDataReset as ReturnType<typeof vi.fn>).mockReturnValue(reset);

    const { result } = renderHook(() =>
      useProblems({ user: mockUser, showToast: mockShowToast })
    );

    const fresh = makeSyncResult({
      problems: [makeProblem({ id: "post-reset-1" })],
      dataReset: reset,
      hasChanges: true,
    });
    act(() => {
      capturedOnSyncComplete!(fresh, { preferenceRevisionAtStart: 0 });
    });

    expect(result.current.problems.map((p) => p.id)).toEqual(["post-reset-1"]);
    expect(saveProblemTombstones).toHaveBeenCalled();
  });
});
