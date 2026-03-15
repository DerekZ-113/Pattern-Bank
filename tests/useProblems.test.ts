// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import useProblems from "../src/hooks/useProblems";
import {
  loadProblems,
  saveProblems,
  logReviewToday,
  saveReviewLog,
} from "../src/utils/storage";
import {
  pushProblemToCloud,
  deleteProblemFromCloud,
  pushProblemsToCloud,
  deduplicateProblems,
} from "../src/utils/sync";
import type { User } from "@supabase/supabase-js";
import type { Problem, Confidence } from "../src/types";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("../src/utils/storage", () => ({
  loadProblems: vi.fn(() => []),
  saveProblems: vi.fn(),
  loadPreferences: vi.fn(() => ({ dailyReviewGoal: 5 })),
  savePreferences: vi.fn(),
  loadReviewLog: vi.fn(() => []),
  saveReviewLog: vi.fn(),
  logReviewToday: vi.fn(),
  importData: vi.fn(),
  exportData: vi.fn(),
  calculateStreak: vi.fn(() => 0),
  countReviewedToday: vi.fn(() => 0),
}));

vi.mock("../src/utils/sync", () => ({
  syncOnSignIn: vi.fn().mockResolvedValue({
    problems: [],
    reviewLog: [],
    preferences: { dailyReviewGoal: 5 },
    error: null,
  }),
  pushProblemToCloud: vi.fn(),
  pushProblemsToCloud: vi.fn(),
  deleteProblemFromCloud: vi.fn(),
  pushReviewToCloud: vi.fn(),
  pushPreferencesToCloud: vi.fn(),
  deduplicateProblems: vi.fn((problems: Problem[]) => ({ problems, removedIds: [] })),
  mergeProblems: vi.fn(),
  mergeReviewLog: vi.fn(),
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useProblems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to safe defaults
    (loadProblems as ReturnType<typeof vi.fn>).mockReturnValue([]);
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

      expect(deleteProblemFromCloud).toHaveBeenCalledWith("del-cloud-1");
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

      // confidence 3 → 3 day interval
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/Next review in 3 days/)
      );
    });
  });

  // ── handleDismiss ─────────────────────────────────────────────────────────

  describe("handleDismiss", () => {
    it("sets nextReviewDate to tomorrow", () => {
      const today = new Date().toISOString().slice(0, 10);
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
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
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
    });
  });

});
