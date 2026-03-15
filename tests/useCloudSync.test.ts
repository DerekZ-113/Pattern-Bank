// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import useCloudSync from "../src/hooks/useCloudSync";
import { syncOnSignIn } from "../src/utils/sync";
import type { Problem, Preferences, ReviewLogEntry } from "../src/types";

vi.mock("../src/utils/storage", () => ({
  loadReviewLog: vi.fn(() => []),
  loadProblems: vi.fn(() => []),
  saveProblems: vi.fn(),
  savePreferences: vi.fn(),
  loadPreferences: vi.fn(() => ({ dailyReviewGoal: 5 })),
  saveReviewLog: vi.fn(),
  logReviewToday: vi.fn(),
  importData: vi.fn(),
  exportData: vi.fn(),
  calculateStreak: vi.fn(() => 0),
  countReviewedToday: vi.fn(() => 0),
}));

vi.mock("../src/utils/sync", () => ({
  syncOnSignIn: vi.fn(),
  pushProblemToCloud: vi.fn(),
  pushProblemsToCloud: vi.fn(),
  deleteProblemFromCloud: vi.fn(),
  pushReviewToCloud: vi.fn(),
  pushPreferencesToCloud: vi.fn(),
  deduplicateProblems: vi.fn(() => ({ problems: [], removedIds: [] })),
  mergeProblems: vi.fn(),
  mergeReviewLog: vi.fn(),
}));

const mockSyncOnSignIn = syncOnSignIn as ReturnType<typeof vi.fn>;

const mockUser = { id: "user-123" } as User;

const defaultPreferences: Preferences = { dailyReviewGoal: 5, hidePatternsDuringReview: false };

const mockProblem: Problem = {
  id: "test-1",
  title: "Two Sum",
  leetcodeNumber: 1,
  url: "https://leetcode.com/problems/two-sum/",
  difficulty: "Easy",
  patterns: ["Hash Map"],
  confidence: 3,
  notes: "",
  excludeFromReview: false,
  dateAdded: "2026-01-01",
  lastReviewed: null,
  nextReviewDate: "2026-01-04",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeSuccessResult(
  problems: Problem[] = [],
  reviewLog: ReviewLogEntry[] = [],
  preferences: Preferences = defaultPreferences,
  hasChanges: boolean = false
) {
  return { problems, reviewLog, preferences, hasChanges, error: null };
}

function makeDefaultParams(overrides: Partial<Parameters<typeof useCloudSync>[0]> = {}) {
  return {
    user: null as User | null,
    problems: [],
    preferences: defaultPreferences,
    showToast: vi.fn(),
    onSyncComplete: vi.fn(),
    ...overrides,
  };
}

describe("useCloudSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: sync resolves successfully with no data
    mockSyncOnSignIn.mockResolvedValue(makeSuccessResult());
  });

  it("starts with idle status when no user", () => {
    const { result } = renderHook(() => useCloudSync(makeDefaultParams()));
    expect(result.current.syncStatus).toBe("idle");
  });

  it("calls syncOnSignIn when user becomes non-null", async () => {
    const params = makeDefaultParams();
    const { rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(mockSyncOnSignIn).toHaveBeenCalledTimes(1);
    });

    expect(mockSyncOnSignIn).toHaveBeenCalledWith(
      mockUser.id,
      params.problems,
      [],
      params.preferences
    );
  });

  it("sets status to syncing during sync", async () => {
    // Use a never-resolving promise to freeze the sync in-flight
    let resolveSyncFn!: (value: ReturnType<typeof makeSuccessResult>) => void;
    const pendingPromise = new Promise<ReturnType<typeof makeSuccessResult>>(
      (resolve) => { resolveSyncFn = resolve; }
    );
    mockSyncOnSignIn.mockReturnValue(pendingPromise);

    const params = makeDefaultParams();
    const { result, rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("syncing");
    });

    // Clean up — resolve the pending promise so there are no dangling state updates
    resolveSyncFn(makeSuccessResult());
  });

  it("sets status to synced on success", async () => {
    mockSyncOnSignIn.mockResolvedValue(makeSuccessResult());

    const params = makeDefaultParams();
    const { result, rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("synced");
    });
  });

  it("sets status to error on sync failure", async () => {
    mockSyncOnSignIn.mockResolvedValue({ ...makeSuccessResult(), error: new Error("network error") });

    const params = makeDefaultParams();
    const { result, rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("error");
    });
  });

  it("calls onSyncComplete with merged result on success", async () => {
    const syncResult = makeSuccessResult([mockProblem]);
    mockSyncOnSignIn.mockResolvedValue(syncResult);

    const params = makeDefaultParams();
    const { rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(params.onSyncComplete).toHaveBeenCalledTimes(1);
    });

    expect(params.onSyncComplete).toHaveBeenCalledWith(syncResult);
  });

  it("shows toast on sync failure", async () => {
    mockSyncOnSignIn.mockResolvedValue({ ...makeSuccessResult(), error: new Error("failed") });

    const params = makeDefaultParams();
    const { rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(params.showToast).toHaveBeenCalledWith("Sync failed — working offline");
    });
  });

  it("does not re-sync on subsequent renders (hasSyncedRef guard)", async () => {
    mockSyncOnSignIn.mockResolvedValue(makeSuccessResult());

    const params = makeDefaultParams({ user: mockUser });
    const { rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    await waitFor(() => {
      expect(mockSyncOnSignIn).toHaveBeenCalledTimes(1);
    });

    // Re-render several times with the same user — should not trigger sync again
    rerender({ ...params, user: mockUser });
    rerender({ ...params, user: mockUser });
    rerender({ ...params, user: mockUser });

    expect(mockSyncOnSignIn).toHaveBeenCalledTimes(1);
  });

  it("resets status to idle when user signs out", async () => {
    mockSyncOnSignIn.mockResolvedValue(makeSuccessResult());

    const params = makeDefaultParams();
    const { result, rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    // Sign in
    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("synced");
    });

    // Sign out
    rerender({ ...params, user: null });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("idle");
    });
  });

  it("shows 'Data synced' toast when sync has changes", async () => {
    const syncResult = makeSuccessResult([mockProblem], [], defaultPreferences, true);
    mockSyncOnSignIn.mockResolvedValue(syncResult);

    const params = makeDefaultParams();
    const { rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(params.showToast).toHaveBeenCalledWith("Data synced");
    });
  });

  it("does not show 'Data synced' toast when sync has no changes", async () => {
    const syncResult = makeSuccessResult([mockProblem], [], defaultPreferences, false);
    mockSyncOnSignIn.mockResolvedValue(syncResult);

    const params = makeDefaultParams();
    const { result, rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("synced");
    });

    // Give enough time for any async state updates
    await waitFor(() => {
      expect(mockSyncOnSignIn).toHaveBeenCalledTimes(1);
    });

    expect(params.showToast).not.toHaveBeenCalled();
  });

  it("re-syncs after signing out and back in", async () => {
    mockSyncOnSignIn.mockResolvedValue(makeSuccessResult());

    const params = makeDefaultParams();
    const { result, rerender } = renderHook((props) => useCloudSync(props), {
      initialProps: params,
    });

    // First sign-in — should sync
    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("synced");
    });

    expect(mockSyncOnSignIn).toHaveBeenCalledTimes(1);

    // Sign out — resets hasSyncedRef
    rerender({ ...params, user: null });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("idle");
    });

    // Sign back in — should sync again
    rerender({ ...params, user: mockUser });

    await waitFor(() => {
      expect(mockSyncOnSignIn).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe("synced");
    });
  });
});
