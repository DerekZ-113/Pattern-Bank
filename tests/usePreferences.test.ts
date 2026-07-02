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
const fullPrefs = { dailyReviewGoal: 5, hidePatternsDuringReview: false, enabledExtraPatterns: [] };

describe("usePreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (loadPreferences as ReturnType<typeof vi.fn>).mockReturnValue(fullPrefs);
  });

  it("loads initial preferences from localStorage", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    expect(loadPreferences).toHaveBeenCalledTimes(1);
    expect(result.current.preferences).toEqual(fullPrefs);
  });

  it("saves preferences to localStorage on change", async () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    // The useEffect fires after initial render to save initial preferences
    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith(fullPrefs);
    });

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 10 });
    });

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith({ ...fullPrefs, dailyReviewGoal: 10, updatedAt: expect.any(String) });
    });
  });

  it("handleUpdatePreferences merges partial updates", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 20 });
    });

    expect(result.current.preferences).toEqual({ ...fullPrefs, dailyReviewGoal: 20, updatedAt: expect.any(String) });
  });

  it("stamps updatedAt on user edits so newest-wins sync can rank them (F-6)", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));
    const before = Date.now();

    act(() => {
      result.current.handleUpdatePreferences({ hidePatternsDuringReview: true });
    });

    const stamped = result.current.preferences.updatedAt;
    expect(stamped).toBeDefined();
    expect(new Date(stamped!).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("replacePreferences overwrites all preferences", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    act(() => {
      result.current.replacePreferences({ dailyReviewGoal: 99, hidePatternsDuringReview: false, enabledExtraPatterns: [] });
    });

    expect(result.current.preferences).toEqual({ dailyReviewGoal: 99, hidePatternsDuringReview: false, enabledExtraPatterns: [] });
  });

  it("increments preference revision only for user updates", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    expect(result.current.getPreferenceRevision()).toBe(0);

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 12 });
    });

    expect(result.current.getPreferenceRevision()).toBe(1);

    act(() => {
      result.current.replacePreferences({ dailyReviewGoal: 9, hidePatternsDuringReview: true, enabledExtraPatterns: [] });
    });

    expect(result.current.getPreferenceRevision()).toBe(1);
  });

  it("returns current preferences from the internal ref after local and cloud changes", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    expect(result.current.getCurrentPreferences()).toEqual(fullPrefs);

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 12 });
    });

    expect(result.current.getCurrentPreferences()).toEqual({ ...fullPrefs, dailyReviewGoal: 12, updatedAt: expect.any(String) });

    const cloudPrefs = { dailyReviewGoal: 9, hidePatternsDuringReview: true, enabledExtraPatterns: ["Graph"] };
    act(() => {
      result.current.replacePreferences(cloudPrefs);
    });

    expect(result.current.getCurrentPreferences()).toEqual(cloudPrefs);
  });

  it("pushes to cloud when user is authenticated", () => {
    const { result } = renderHook(() => usePreferences({ user: mockUser }));

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 15 });
    });

    expect(pushPreferencesToCloud).toHaveBeenCalledTimes(1);
    expect(pushPreferencesToCloud).toHaveBeenCalledWith("user-123", { ...fullPrefs, dailyReviewGoal: 15, updatedAt: expect.any(String) });
  });

  it("does not push to cloud when user is null", () => {
    const { result } = renderHook(() => usePreferences({ user: null }));

    act(() => {
      result.current.handleUpdatePreferences({ dailyReviewGoal: 15 });
    });

    expect(pushPreferencesToCloud).not.toHaveBeenCalled();
  });
});
