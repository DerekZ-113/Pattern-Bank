// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import useProblems from "../src/hooks/useProblems";
import {
  loadProblems,
  saveProblems,
  logReviewToday,
  logReviewEvent,
  logOrReplaceReviewEvent,
  saveReviewLog,
  saveReviewEvents,
  recordProblemTombstone,
  saveProblemTombstones,
  loadDataReset,
  saveDataReset,
} from "../src/utils/storage";
import {
  syncOnSignIn,
  pushProblemToCloud,
  deleteProblemFromCloud,
  pushProblemsToCloud,
  pushReviewToCloud,
  replaceReviewInCloud,
  pushPreferencesToCloud,
  deduplicateProblems,
} from "../src/utils/sync";
import type { User } from "@supabase/supabase-js";
import type { SyncResult } from "../src/utils/sync";
import type { Problem, Confidence, Preferences, SyncStatus } from "../src/types";
import { addDays, parseDateOnly, todayStr } from "@patternbank/core";

// ─── Mocks ───────────────────────────────────────────────────────────────────

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
  calculateStreak: vi.fn(() => 0),
  countReviewedToday: vi.fn(() => 0),
}));

vi.mock("../src/utils/sync", () => ({
  syncOnSignIn: vi.fn().mockResolvedValue({
    problems: [],
    reviewLog: [],
    reviewEvents: [],
    preferences: { dailyReviewGoal: 5, hidePatternsDuringReview: false, enabledExtraPatterns: [] },
    problemTombstones: [],
    dataReset: null,
    hasChanges: false,
    error: null,
  }),
  pushProblemToCloud: vi.fn(),
  pushProblemsToCloud: vi.fn(),
  deleteProblemFromCloud: vi.fn(),
  pushReviewToCloud: vi.fn(),
  replaceReviewInCloud: vi.fn(),
  pushPreferencesToCloud: vi.fn(),
  clearAllCloudData: vi.fn(),
  deduplicateProblems: vi.fn((problems: Problem[]) => ({ problems, removedIds: [] })),
  mergeProblems: vi.fn((local, cloud) => ({ problems: [...local, ...cloud], cloudAdded: cloud.length, cloudWon: 0 })),
  mergeReviewLog: vi.fn((local, cloud) => ({ log: [...local, ...cloud], addedFromCloud: cloud.length })),
  mergeReviewEvents: vi.fn((local, cloud) => ({ events: [...local, ...cloud], addedFromCloud: cloud.length, localOnlyEvents: [] })),
  mergeProblemTombstones: vi.fn((local, cloud) => ({ tombstones: [...local, ...cloud], addedFromCloud: cloud.length })),
  filterTombstonedProblems: vi.fn((problems) => problems),
  filterTombstonesAfterDataReset: vi.fn((tombstones) => tombstones),
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    dateAdded: "2025-01-01",
    lastReviewed: null,
    nextReviewDate: "2025-01-02",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const mockShowToast = vi.fn();
const mockUser = { id: "user-123" } as User;
const defaultPrefs: Preferences = { dailyReviewGoal: 5, hidePatternsDuringReview: false, enabledExtraPatterns: [] };
const mockSyncOnSignIn = syncOnSignIn as ReturnType<typeof vi.fn>;
const mockPushPreferencesToCloud = pushPreferencesToCloud as ReturnType<typeof vi.fn>;
const mockPushReviewToCloud = pushReviewToCloud as ReturnType<typeof vi.fn>;
const mockReplaceReviewInCloud = replaceReviewInCloud as ReturnType<typeof vi.fn>;

function makeSyncResult(preferences: Preferences, syncStatus?: SyncStatus) {
  return {
    problems: [],
    reviewLog: [],
    reviewEvents: [],
    preferences,
    problemTombstones: [],
    dataReset: null,
    hasChanges: syncStatus === "synced",
    error: null,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useProblems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to safe defaults
    (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (syncOnSignIn as ReturnType<typeof vi.fn>).mockResolvedValue(makeSyncResult(defaultPrefs));
    (deduplicateProblems as ReturnType<typeof vi.fn>).mockImplementation(
      (problems: Problem[]) => ({ problems, removedIds: [] })
    );
  });

  // ── Initialization ────────────────────────────────────────────────────────

  describe("initialization", () => {
    it("loads and deduplicates problems from localStorage on mount", () => {
      const existing = makeProblem();
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      expect(loadProblems).toHaveBeenCalledTimes(1);
      expect(deduplicateProblems).toHaveBeenCalledWith([existing]);
      expect(result.current.problems).toHaveLength(1);
      expect(result.current.problems[0].id).toBe("test-1");
    });

    it("saves deduped problems back if duplicates found", () => {
      const original = makeProblem({ id: "a" });
      const duplicate = makeProblem({ id: "b" });
      const deduped = [original];

      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([original, duplicate]);
      (deduplicateProblems as ReturnType<typeof vi.fn>).mockReturnValue({
        problems: deduped,
        removedIds: ["b"],
      });

      renderHook(() => useProblems({ user: null, showToast: mockShowToast }));

      // saveProblems is called during state init (removedIds.length > 0) and
      // also via the useEffect after mount — both should have the deduped list.
      expect(saveProblems).toHaveBeenCalledWith(deduped);
    });
  });

  describe("sign-in sync preferences", () => {
    it("applies cloud preferences when local preferences were unchanged during sync", async () => {
      let resolveSync!: (value: ReturnType<typeof makeSyncResult>) => void;
      const pendingSync = new Promise<ReturnType<typeof makeSyncResult>>((resolve) => {
        resolveSync = resolve;
      });
      const cloudPrefs: Preferences = {
        dailyReviewGoal: 11,
        hidePatternsDuringReview: true,
        enabledExtraPatterns: ["Sliding Window"],
      };
      mockSyncOnSignIn.mockReturnValue(pendingSync);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      await waitFor(() => {
        expect(mockSyncOnSignIn).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        resolveSync(makeSyncResult(cloudPrefs, "synced"));
        await pendingSync;
      });

      await waitFor(() => {
        expect(result.current.syncStatus).toBe("synced");
      });
      expect(result.current.preferences).toEqual(cloudPrefs);
    });

    it("keeps local preference edits made while sign-in sync is in flight", async () => {
      let resolveSync!: (value: ReturnType<typeof makeSyncResult>) => void;
      const pendingSync = new Promise<ReturnType<typeof makeSyncResult>>((resolve) => {
        resolveSync = resolve;
      });
      const cloudPrefs: Preferences = {
        dailyReviewGoal: 11,
        hidePatternsDuringReview: true,
        enabledExtraPatterns: ["Sliding Window"],
      };
      // User edits are stamped with updatedAt (F-6 newest-wins).
      const localPrefs = { ...defaultPrefs, dailyReviewGoal: 8, updatedAt: expect.any(String) };
      mockSyncOnSignIn.mockReturnValue(pendingSync);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      await waitFor(() => {
        expect(mockSyncOnSignIn).toHaveBeenCalledTimes(1);
      });

      act(() => {
        result.current.handleUpdatePreferences({ dailyReviewGoal: 8 });
      });
      expect(result.current.preferences).toEqual(localPrefs);
      expect(mockPushPreferencesToCloud).toHaveBeenCalledWith("user-123", localPrefs);
      mockPushPreferencesToCloud.mockClear();

      await act(async () => {
        resolveSync(makeSyncResult(cloudPrefs, "synced"));
        await pendingSync;
      });

      await waitFor(() => {
        expect(result.current.syncStatus).toBe("synced");
      });
      expect(result.current.preferences).toEqual(localPrefs);
      expect(mockPushPreferencesToCloud).toHaveBeenCalledWith("user-123", localPrefs);
    });
  });

  // ── handleSaveProblem — add ────────────────────────────────────────────────

  describe("handleSaveProblem — add", () => {
    it("appends new problem to list", () => {
      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      const newProblem = makeProblem({ id: "new-1", leetcodeNumber: 99 });

      act(() => {
        result.current.handleSaveProblem(newProblem);
      });

      expect(result.current.problems).toHaveLength(1);
      expect(result.current.problems[0].id).toBe("new-1");
    });

    it("shows 'Problem added' toast", () => {
      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleSaveProblem(makeProblem({ id: "new-1", leetcodeNumber: 99 }));
      });

      expect(mockShowToast).toHaveBeenCalledWith("Problem added");
    });

    it("rejects duplicate leetcodeNumber with toast", () => {
      const existing = makeProblem({ id: "existing-1", leetcodeNumber: 1 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      const duplicate = makeProblem({ id: "new-dup", leetcodeNumber: 1 });

      act(() => {
        result.current.handleSaveProblem(duplicate);
      });

      // Should still have only the original problem
      expect(result.current.problems).toHaveLength(1);
      expect(result.current.problems[0].id).toBe("existing-1");
      expect(mockShowToast).toHaveBeenCalledWith("Problem #1 already in your library");
    });

    it("pushes to cloud when authenticated", () => {
      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      const newProblem = makeProblem({ id: "cloud-1", leetcodeNumber: 99 });

      act(() => {
        result.current.handleSaveProblem(newProblem);
      });

      expect(pushProblemToCloud).toHaveBeenCalledWith("user-123", newProblem);
    });

    it("creates a local-first problem from a LeetCode import without logging a review", () => {
      const imported = makeProblem({
        id: "lc-import",
        title: "Imported From LC",
        leetcodeNumber: 200,
        confidence: 5,
        lastReviewed: null,
        fiveStarStreak: 0,
      });
      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      let response!: ReturnType<typeof result.current.handleCreateProblemFromLeetCodeImport>;
      act(() => {
        response = result.current.handleCreateProblemFromLeetCodeImport(imported);
      });

      expect(response.status).toBe("created");
      expect(result.current.problems).toContainEqual(imported);
      expect(pushProblemToCloud).toHaveBeenCalledWith("user-123", imported);
      expect(logReviewToday).not.toHaveBeenCalled();
    });

    it("rejects a LeetCode import duplicate and returns the existing problem", () => {
      const existing = makeProblem({ id: "existing", leetcodeNumber: 200 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);
      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      let response!: ReturnType<typeof result.current.handleCreateProblemFromLeetCodeImport>;
      act(() => {
        response = result.current.handleCreateProblemFromLeetCodeImport(
          makeProblem({ id: "new-import", leetcodeNumber: 200 }),
        );
      });

      expect(response.status).toBe("duplicate");
      expect(response.problem.id).toBe("existing");
      expect(result.current.problems).toHaveLength(1);
    });
  });

  // ── handleSaveProblem — edit ───────────────────────────────────────────────

  describe("handleSaveProblem — edit", () => {
    it("updates existing problem in place", () => {
      const existing = makeProblem({ id: "edit-1", title: "Old Title" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      const updated = makeProblem({ id: "edit-1", title: "New Title" });

      act(() => {
        result.current.handleSaveProblem(updated);
      });

      expect(result.current.problems).toHaveLength(1);
      expect(result.current.problems[0].title).toBe("New Title");
    });

    it("shows 'Problem updated' toast", () => {
      const existing = makeProblem({ id: "edit-1" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleSaveProblem(makeProblem({ id: "edit-1", title: "Updated" }));
      });

      expect(mockShowToast).toHaveBeenCalledWith("Problem updated");
    });

    it("logs a same-day-replacing review event when confidence changed", () => {
      const existing = makeProblem({ id: "edit-conf-1", confidence: 2 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleSaveProblem(
          makeProblem({ id: "edit-conf-1", confidence: 4, patterns: ["Hash Table", "Two Pointers"] }),
          true
        );
      });

      expect(logOrReplaceReviewEvent).toHaveBeenCalledWith(
        "edit-conf-1",
        4,
        ["Hash Table", "Two Pointers"],
        expect.any(String),
      );
      expect(logReviewEvent).not.toHaveBeenCalled();
      expect(logReviewToday).toHaveBeenCalled();
    });

    it("replaces the cloud review with old and new confidence when authenticated", () => {
      const existing = makeProblem({ id: "edit-conf-2", confidence: 2 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleSaveProblem(
          makeProblem({ id: "edit-conf-2", confidence: 4 }),
          true
        );
      });

      expect(mockReplaceReviewInCloud).toHaveBeenCalledWith(
        "user-123",
        "edit-conf-2",
        2,
        4,
        ["Hash Table"],
        expect.any(String),
      );
      const localTimestamp = (logOrReplaceReviewEvent as ReturnType<typeof vi.fn>).mock.calls[0][3];
      const cloudTimestamp = mockReplaceReviewInCloud.mock.calls[0][5];
      expect(cloudTimestamp).toBe(localTimestamp);
    });

    it("does not push review to cloud when signed out", () => {
      const existing = makeProblem({ id: "edit-conf-3", confidence: 2 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleSaveProblem(makeProblem({ id: "edit-conf-3", confidence: 5 }), true);
      });

      expect(logOrReplaceReviewEvent).toHaveBeenCalled();
      expect(mockReplaceReviewInCloud).not.toHaveBeenCalled();
      expect(mockPushReviewToCloud).not.toHaveBeenCalled();
    });

    it("does not log any review event when confidence unchanged", () => {
      const existing = makeProblem({ id: "edit-conf-4" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleSaveProblem(makeProblem({ id: "edit-conf-4", title: "Renamed" }));
      });

      expect(logOrReplaceReviewEvent).not.toHaveBeenCalled();
      expect(logReviewEvent).not.toHaveBeenCalled();
      expect(mockReplaceReviewInCloud).not.toHaveBeenCalled();
    });

    it("does not log a review event on the duplicate-add early return", () => {
      const existing = makeProblem({ id: "dup-1", leetcodeNumber: 42 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleSaveProblem(
          makeProblem({ id: "dup-new", leetcodeNumber: 42, confidence: 5 }),
          true
        );
      });

      expect(logOrReplaceReviewEvent).not.toHaveBeenCalled();
      expect(logReviewToday).not.toHaveBeenCalled();
    });
  });

  // ── handleDeleteConfirm ────────────────────────────────────────────────────

  describe("handleDeleteConfirm", () => {
    it("removes problem from list", () => {
      const p1 = makeProblem({ id: "del-1", title: "Delete Me" });
      const p2 = makeProblem({ id: "keep-1", title: "Keep Me", leetcodeNumber: 2 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p1, p2]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleDeleteConfirm(p1);
      });

      expect(result.current.problems).toHaveLength(1);
      expect(result.current.problems[0].id).toBe("keep-1");
    });

    it("shows deletion toast", () => {
      const p = makeProblem({ id: "del-1", title: "Delete Me" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleDeleteConfirm(p);
      });

      expect(mockShowToast).toHaveBeenCalledWith("Deleted Delete Me");
    });

    it("deletes from cloud when authenticated", () => {
      const p = makeProblem({ id: "del-cloud-1" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleDeleteConfirm(p);
      });

      expect(recordProblemTombstone).toHaveBeenCalledWith("del-cloud-1", expect.any(String));
      expect(deleteProblemFromCloud).toHaveBeenCalledWith("user-123", "del-cloud-1", expect.any(String));
    });

    it("records a local tombstone even when signed out", () => {
      const p = makeProblem({ id: "del-local-1" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleDeleteConfirm(p);
      });

      expect(recordProblemTombstone).toHaveBeenCalledWith("del-local-1", expect.any(String));
      expect(deleteProblemFromCloud).not.toHaveBeenCalled();
    });
  });

  // ── handleReview ──────────────────────────────────────────────────────────

  describe("handleReview", () => {
    it("updates confidence and review date", () => {
      const p = makeProblem({
        id: "review-1",
        confidence: 2,
        nextReviewDate: "2025-01-01",
        lastReviewed: null,
      });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleReview("review-1", 4 as Confidence);
      });

      const updated = result.current.problems[0];
      expect(updated.confidence).toBe(4);
      expect(updated.lastReviewed).not.toBeNull();
      // confidence 4 → 7 day interval
      expect(updated.nextReviewDate).not.toBe("2025-01-01");
    });

    it("counts a same-confidence re-rate as a review (All Problems re-confirm)", () => {
      const p = makeProblem({
        id: "review-same",
        confidence: 3,
        nextReviewDate: "2025-01-01",
        lastReviewed: null,
      });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleReview("review-same", 3 as Confidence);
      });

      const updated = result.current.problems[0];
      expect(updated.confidence).toBe(3);
      expect(updated.lastReviewed).not.toBeNull();
      expect(updated.nextReviewDate).not.toBe("2025-01-01");
      expect(logReviewToday).toHaveBeenCalled();
      expect(logReviewEvent).toHaveBeenCalledWith("review-same", 3, p.patterns, expect.any(String));
    });

    it("logs review to localStorage", () => {
      const p = makeProblem({ id: "review-log-1" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleReview("review-log-1", 3 as Confidence);
      });

      expect(logReviewToday).toHaveBeenCalled();
      expect(logReviewEvent).toHaveBeenCalledWith(
        "review-log-1",
        3,
        ["Hash Table"],
        expect.any(String),
      );
      expect(logOrReplaceReviewEvent).not.toHaveBeenCalled();
    });

    it("replaces same-day review event when requested by LeetCode rating surfaces", () => {
      const p = makeProblem({ id: "review-replace-1" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleReview("review-replace-1", 4 as Confidence, { replaceSameDayReviewEvent: true });
      });

      expect(logReviewToday).toHaveBeenCalled();
      expect(logOrReplaceReviewEvent).toHaveBeenCalledWith(
        "review-replace-1",
        4,
        ["Hash Table"],
        expect.any(String),
      );
      expect(logReviewEvent).not.toHaveBeenCalled();
    });

    it("pushes to cloud when authenticated", () => {
      const p = makeProblem({ id: "review-cloud-1" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleReview("review-cloud-1", 5 as Confidence);
      });

      expect(pushProblemToCloud).toHaveBeenCalled();
      expect(mockPushReviewToCloud).toHaveBeenCalled();
      expect(mockReplaceReviewInCloud).not.toHaveBeenCalled();
    });

    it("replaces cloud review log when requested by LeetCode rating surfaces", () => {
      const p = makeProblem({ id: "review-cloud-replace-1" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleReview("review-cloud-replace-1", 4 as Confidence, { replaceSameDayReviewEvent: true });
      });

      expect(pushProblemToCloud).toHaveBeenCalled();
      expect(mockReplaceReviewInCloud).toHaveBeenCalledWith(
        mockUser.id,
        "review-cloud-replace-1",
        3,
        4,
        ["Hash Table"],
        expect.any(String),
      );
      expect(mockPushReviewToCloud).not.toHaveBeenCalled();
    });

    it("shows progress toast with interval", () => {
      const p = makeProblem({ id: "review-toast-1" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleReview("review-toast-1", 3 as Confidence);
      });

      // confidence 3 → 5 day interval
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/Next review in 5 days/)
      );
    });

    it("shows graduated interval in review toast for second consecutive 5-star review", () => {
      const p = makeProblem({ id: "review-toast-5", confidence: 5 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleReview("review-toast-5", 5 as Confidence);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/Next review in 60 days/)
      );
    });

    it("resets fiveStarStreak when reviewing below 5 stars", () => {
      const p = makeProblem({ id: "review-reset-streak", confidence: 5, fiveStarStreak: 3 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleReview("review-reset-streak", 4 as Confidence);
      });

      expect(result.current.problems[0].fiveStarStreak).toBe(0);
    });
  });

  // ── handleDismiss ─────────────────────────────────────────────────────────

  describe("handleDismiss", () => {
    it("sets nextReviewDate to tomorrow", () => {
      const today = todayStr();
      const p = makeProblem({ id: "dismiss-1", nextReviewDate: "2020-01-01" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleDismiss("dismiss-1");
      });

      const updated = result.current.problems[0];
      // Tomorrow should be strictly after today
      expect(updated.nextReviewDate > today).toBe(true);
      // And it should be exactly 1 day after today
      const tomorrow = addDays(today, 1);
      expect(updated.nextReviewDate).toBe(tomorrow);
    });
  });

  // ── handleBulkAdd ─────────────────────────────────────────────────────────

  describe("handleBulkAdd", () => {
    it("adds filtered and interleaved problems", () => {
      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      const lcProblems = [
        { n: 1, t: "Two Sum", d: "Easy" as const, s: "two-sum" },
        { n: 2, t: "Add Two Numbers", d: "Medium" as const, s: "add-two-numbers" },
      ];

      act(() => {
        result.current.handleBulkAdd(lcProblems);
      });

      expect(result.current.problems).toHaveLength(2);
    });

    it("shows toast with count", () => {
      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      const lcProblems = [
        { n: 10, t: "Regular Expression Matching", d: "Hard" as const, s: "regular-expression-matching" },
        { n: 11, t: "Container With Most Water", d: "Medium" as const, s: "container-with-most-water" },
        { n: 12, t: "Integer to Roman", d: "Medium" as const, s: "integer-to-roman" },
      ];

      act(() => {
        result.current.handleBulkAdd(lcProblems);
      });

      expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/Added 3 problems/));
    });

    it("shows 'all already exist' toast when none new", () => {
      const existing = makeProblem({ id: "ex-1", leetcodeNumber: 1 });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([existing]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleBulkAdd([
          { n: 1, t: "Two Sum", d: "Easy" as const, s: "two-sum" },
        ]);
      });

      expect(mockShowToast).toHaveBeenCalledWith("All problems already in your library");
      // No new problems should be added
      expect(result.current.problems).toHaveLength(1);
    });

    it("pushes to cloud when authenticated", () => {
      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleBulkAdd([
          { n: 50, t: "Pow(x, n)", d: "Medium" as const, s: "powx-n" },
        ]);
      });

      expect(pushProblemsToCloud).toHaveBeenCalledWith(
        "user-123",
        expect.arrayContaining([expect.objectContaining({ leetcodeNumber: 50 })])
      );
    });

    it("tells the user the pacing plan when an import spans multiple days", () => {
      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      // 12 problems at the default goal of 5 → spread across 3 days
      const lcProblems = Array.from({ length: 12 }, (_, i) => ({
        n: 500 + i,
        t: `P${i}`,
        d: "Easy" as const,
        s: `p-${i}`,
      }));

      act(() => {
        result.current.handleBulkAdd(lcProblems);
      });

      const endDate = addDays(todayStr(), Math.floor((12 - 1) / 5));
      const { year, month, day } = parseDateOnly(endDate);
      const endLabel = new Date(year, month - 1, day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        `Added 12 problems — 5/day through ${endLabel}`
      );
    });

    it("keeps the plain toast when everything fits today", () => {
      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      // 4 problems at the default goal of 5 → all due today, no pacing note
      const lcProblems = Array.from({ length: 4 }, (_, i) => ({
        n: 600 + i,
        t: `Q${i}`,
        d: "Easy" as const,
        s: `q-${i}`,
      }));

      act(() => {
        result.current.handleBulkAdd(lcProblems);
      });

      expect(mockShowToast).toHaveBeenCalledWith("Added 4 problems");
    });
  });

  // ── handleRespreadUpcoming ────────────────────────────────────────────────

  describe("handleRespreadUpcoming", () => {
    it("re-paces upcoming unreviewed problems at the current daily goal", () => {
      const today = todayStr();
      // 10 upcoming problems paced 2/day starting tomorrow
      const upcoming = Array.from({ length: 10 }, (_, i) =>
        makeProblem({
          id: `up-${i}`,
          leetcodeNumber: 100 + i,
          nextReviewDate: addDays(today, Math.floor(i / 2) + 1),
        })
      );
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue(upcoming);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleRespreadUpcoming();
      });

      // goal 5 → first 5 pulled to today, remaining 5 to tomorrow
      const dates = result.current.problems.map((p) => p.nextReviewDate);
      expect(dates.filter((d) => d === today)).toHaveLength(5);
      expect(dates.filter((d) => d === addDays(today, 1))).toHaveLength(5);
      // no review-log mutation — reviewCount stays untouched
      expect(result.current.reviewCount).toBe(0);
      expect(mockShowToast).toHaveBeenCalledWith("Rescheduled 10 upcoming problems at 5/day");
    });

    it("leaves due and reviewed problems untouched", () => {
      const today = todayStr();
      const due = makeProblem({ id: "due", leetcodeNumber: 1, nextReviewDate: "2020-01-01" });
      const reviewed = makeProblem({
        id: "rev",
        leetcodeNumber: 2,
        lastReviewed: today,
        nextReviewDate: addDays(today, 9),
      });
      const candidate = makeProblem({ id: "cand", leetcodeNumber: 3, nextReviewDate: addDays(today, 4) });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([due, reviewed, candidate]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleRespreadUpcoming();
      });

      const byId = new Map(result.current.problems.map((p) => [p.id, p]));
      expect(byId.get("due")!.nextReviewDate).toBe("2020-01-01");
      expect(byId.get("rev")!.nextReviewDate).toBe(addDays(today, 9));
      expect(byId.get("cand")!.nextReviewDate).toBe(today);
      expect(mockShowToast).toHaveBeenCalledWith("Rescheduled 1 upcoming problem at 5/day");
    });

    it("pushes only the rescheduled problems to the cloud when signed in", () => {
      const today = todayStr();
      const due = makeProblem({ id: "due", leetcodeNumber: 1, nextReviewDate: "2020-01-01" });
      const candidate = makeProblem({ id: "cand", leetcodeNumber: 3, nextReviewDate: addDays(today, 6) });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([due, candidate]);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleRespreadUpcoming();
      });

      expect(pushProblemsToCloud).toHaveBeenCalledWith("user-123", [
        expect.objectContaining({ id: "cand", nextReviewDate: today, updatedAt: expect.any(String) }),
      ]);
    });

    it("is a no-op when there is nothing upcoming to reschedule", () => {
      const due = makeProblem({ id: "due", leetcodeNumber: 1, nextReviewDate: "2020-01-01" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([due]);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleRespreadUpcoming();
      });

      expect(pushProblemsToCloud).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalledWith(expect.stringMatching(/Rescheduled/));
    });

    it("re-paces at a freshly raised goal", () => {
      const today = todayStr();
      // 12 upcoming problems paced 2/day starting tomorrow
      const upcoming = Array.from({ length: 12 }, (_, i) =>
        makeProblem({
          id: `up-${i}`,
          leetcodeNumber: 100 + i,
          nextReviewDate: addDays(today, Math.floor(i / 2) + 1),
        })
      );
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue(upcoming);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      act(() => {
        result.current.handleUpdatePreferences({ dailyReviewGoal: 8 });
      });
      act(() => {
        result.current.handleRespreadUpcoming();
      });

      const dates = result.current.problems.map((p) => p.nextReviewDate);
      expect(dates.filter((d) => d === today)).toHaveLength(8);
      expect(dates.filter((d) => d === addDays(today, 1))).toHaveLength(4);
      expect(mockShowToast).toHaveBeenCalledWith("Rescheduled 12 upcoming problems at 8/day");
    });
  });

  // ── handleToggleExclude ───────────────────────────────────────────────────

  describe("handleToggleExclude", () => {
    it("toggles excludeFromReview flag", () => {
      const p = makeProblem({ id: "excl-1", excludeFromReview: false });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      // Toggle on
      act(() => {
        result.current.handleToggleExclude("excl-1");
      });
      expect(result.current.problems[0].excludeFromReview).toBe(true);

      // Toggle off
      act(() => {
        result.current.handleToggleExclude("excl-1");
      });
      expect(result.current.problems[0].excludeFromReview).toBe(false);
    });
  });

  // ── handleClearAllData ────────────────────────────────────────────────────

  describe("handleClearAllData", () => {
    it("clears problems and review log", () => {
      const p = makeProblem({ id: "clear-1" });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([p]);

      const { result } = renderHook(() =>
        useProblems({ user: null, showToast: mockShowToast })
      );

      expect(result.current.problems).toHaveLength(1);

      act(() => {
        result.current.handleClearAllData();
      });

      expect(result.current.problems).toHaveLength(0);
      expect(saveReviewLog).toHaveBeenCalledWith([]);
      expect(saveDataReset).toHaveBeenCalledWith({ resetAt: expect.any(String) });
      expect(saveProblemTombstones).toHaveBeenCalledWith([]);
    });

    it("discards an in-flight sign-in sync that resolves after clear-all (F-20)", async () => {
      let resolveSync!: (value: SyncResult) => void;
      const pendingSync = new Promise<SyncResult>((resolve) => {
        resolveSync = resolve;
      });
      mockSyncOnSignIn.mockReturnValue(pendingSync);
      // Simulate persistence: the reset marker saved by clear-all must be
      // visible to later loadDataReset() calls.
      (saveDataReset as ReturnType<typeof vi.fn>).mockImplementation((reset) => {
        (loadDataReset as ReturnType<typeof vi.fn>).mockReturnValue(reset);
      });
      (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([makeProblem({ id: "pre-clear-1" })]);

      const { result } = renderHook(() =>
        useProblems({ user: mockUser, showToast: mockShowToast })
      );

      await waitFor(() => {
        expect(mockSyncOnSignIn).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await result.current.handleClearAllData();
      });
      expect(result.current.problems).toEqual([]);
      (saveReviewLog as ReturnType<typeof vi.fn>).mockClear();
      (saveReviewEvents as ReturnType<typeof vi.fn>).mockClear();

      // The pre-clear sync snapshot resolves AFTER the clear with the old data.
      const resurrection: SyncResult = {
        ...makeSyncResult(defaultPrefs, "synced"),
        problems: [makeProblem({ id: "pre-clear-1" })],
        reviewLog: [{ date: "2025-01-01" }],
        reviewEvents: [
          { date: "2025-01-01", problemId: "pre-clear-1", confidence: 3 as Confidence, patterns: [], timestamp: "2025-01-01T12:00:00.000Z" },
        ],
      };
      await act(async () => {
        resolveSync(resurrection);
        await pendingSync;
      });

      expect(result.current.problems).toEqual([]);
      expect(saveReviewLog).not.toHaveBeenCalled();
      expect(saveReviewEvents).not.toHaveBeenCalled();
      expect(pushProblemsToCloud).not.toHaveBeenCalled();
      expect(pushProblemToCloud).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalledWith("Data synced");
    });
  });

});
