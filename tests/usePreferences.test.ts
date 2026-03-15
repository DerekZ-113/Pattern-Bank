// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import usePreferences from "../src/hooks/usePreferences";
import { loadPreferences, savePreferences } from "../src/utils/storage";
import { pushPreferencesToCloud } from "../src/utils/sync";

vi.mock("../src/utils/storage", () => ({
  loadPreferences: vi.fn(() => ({ dailyReviewGoal: 5 })),
  savePreferences: vi.fn(),
  loadProblems: vi.fn(() => []),
  saveProblems: vi.fn(),
  loadReviewLog: vi.fn(() => []),
  saveReviewLog: vi.fn(),
  logReviewToday: vi.fn(),
  importData: vi.fn(),
  exportData: vi.fn(),
  calculateStreak: vi.fn(() => 0),
  countReviewedToday: vi.fn(() => 0),
}));

vi.mock("../src/utils/sync", () => ({
  pushPreferencesToCloud: vi.fn(),
  syncOnSignIn: vi.fn(),
  pushProblemToCloud: vi.fn(),
  pushProblemsToCloud: vi.fn(),
  deleteProblemFromCloud: vi.fn(),
  pushReviewToCloud: vi.fn(),
  deduplicateProblems: vi.fn(() => ({ problems: [], removedIds: [] })),
  mergeProblems: vi.fn(),
  mergeReviewLog: vi.fn(),
}));

const mockUser = { id: "user-123" } as User;

describe("usePreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (loadPreferences as ReturnType<typeof vi.fn>).mockReturnValue({ dailyReviewGoal: 5 });
  });

  it("loads initial preferences from localStorage", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    expect(loadPreferences).toHaveBeenCalledTimes(1);
    expect(result.current.preferences).toEqual({ dailyReviewGoal: 5 });
  });

  it("saves preferences to localStorage on change", async () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    // The useEffect fires after initial render to save initial preferences
    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith({ dailyReviewGoal: 5 });
    });

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 10 });
    });

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith({ dailyReviewGoal: 10 });
    });
  });

  it("handleUpdatePreferences merges partial updates", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 20 });
    });

    expect(result.current.preferences).toEqual({ dailyReviewGoal: 20 });
  });

  it("replacePreferences overwrites all preferences", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    act(() => {
      result.current.replacePreferences({ dailyReviewGoal: 99, hidePatternsDuringReview: false });
    });

    expect(result.current.preferences).toEqual({ dailyReviewGoal: 99, hidePatternsDuringReview: false });
  });

  it("pushes to cloud when user is authenticated", () => {
    const { result } = renderHook(() => usePreferences({ user: mockUser }));

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 15 });
    });

    expect(pushPreferencesToCloud).toHaveBeenCalledTimes(1);
    expect(pushPreferencesToCloud).toHaveBeenCalledWith("user-123", { dailyReviewGoal: 15 });
  });

  it("does not push to cloud when user is null", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 15 });
    });

    expect(pushPreferencesToCloud).not.toHaveBeenCalled();
  });
});
