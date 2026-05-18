// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import useUI from "../src/hooks/useUI";
import type { Problem } from "../src/types";

const mockProblem: Problem = {
  id: "test-id",
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

describe("useUI", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("initial state", () => {
    it("starts on dashboard tab", () => {
      const { result } = renderHook(() => useUI());
      expect(result.current.activeTab).toBe("dashboard");
    });

    it("starts with modal closed", () => {
      const { result } = renderHook(() => useUI());
      expect(result.current.modalOpen).toBe(false);
    });

    it("starts with no editing problem", () => {
      const { result } = renderHook(() => useUI());
      expect(result.current.editingProblem).toBeNull();
    });

    it("starts with toast hidden", () => {
      const { result } = renderHook(() => useUI());
      expect(result.current.toast.visible).toBe(false);
      expect(result.current.toast.message).toBe("");
    });

    it("starts with problem index sort and default filter", () => {
      const { result } = renderHook(() => useUI());
      expect(result.current.problemsInitialSort).toBe("leetcodeNumber");
      expect(result.current.problemsInitialPatternFilter).toBe("all");
    });

    it("starts with the V2 LeetCode intro visible when not dismissed", () => {
      const { result } = renderHook(() => useUI());
      expect(result.current.v2LeetCodeIntroDismissed).toBe(false);
    });

    it("loads a persisted problem sort", () => {
      localStorage.setItem("patternbank-all-problems-sort", "confidence");

      const { result } = renderHook(() => useUI());

      expect(result.current.problemsInitialSort).toBe("confidence");
    });

    it("falls back to problem index for an invalid persisted problem sort", () => {
      localStorage.setItem("patternbank-all-problems-sort", "unknown-sort");

      const { result } = renderHook(() => useUI());

      expect(result.current.problemsInitialSort).toBe("leetcodeNumber");
    });

    it("loads a dismissed V2 LeetCode intro flag", () => {
      localStorage.setItem("patternbank-v2-leetcode-intro-dismissed", "true");

      const { result } = renderHook(() => useUI());

      expect(result.current.v2LeetCodeIntroDismissed).toBe(true);
    });

    it("treats invalid V2 LeetCode intro dismissal values as not dismissed", () => {
      localStorage.setItem("patternbank-v2-leetcode-intro-dismissed", "yes");

      const { result } = renderHook(() => useUI());

      expect(result.current.v2LeetCodeIntroDismissed).toBe(false);
    });
  });

  describe("toast", () => {
    it("showToast sets visible and message", () => {
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.showToast("Problem added!");
      });
      expect(result.current.toast.visible).toBe(true);
      expect(result.current.toast.message).toBe("Problem added!");
    });

    it("showToast can attach a minimal action", () => {
      const action = { label: "Undo", onClick: vi.fn() };
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.showToast("Ignored Two Sum.", action);
      });
      expect(result.current.toast.action).toBe(action);
    });

    it("hideToast clears toast", () => {
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.showToast("Hello", { label: "Undo", onClick: vi.fn() });
      });
      act(() => {
        result.current.hideToast();
      });
      expect(result.current.toast.visible).toBe(false);
      expect(result.current.toast.message).toBe("");
      expect(result.current.toast.action).toBeUndefined();
    });
  });

  describe("modal", () => {
    it("handleEdit sets editingProblem and opens modal", () => {
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.handleEdit(mockProblem);
      });
      expect(result.current.editingProblem).toBe(mockProblem);
      expect(result.current.modalOpen).toBe(true);
    });

    it("openAddModal clears editingProblem and opens modal", () => {
      const { result } = renderHook(() => useUI());
      // First set an editing problem
      act(() => {
        result.current.handleEdit(mockProblem);
      });
      // Then open the add modal
      act(() => {
        result.current.openAddModal();
      });
      expect(result.current.editingProblem).toBeNull();
      expect(result.current.modalOpen).toBe(true);
    });

    it("closeModal closes modal and retains editingProblem", () => {
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.handleEdit(mockProblem);
      });
      act(() => {
        result.current.closeModal();
      });
      expect(result.current.modalOpen).toBe(false);
      expect(result.current.editingProblem).toEqual(mockProblem);
    });
  });

  describe("navigation", () => {
    it("persists user-selected problem sort changes", () => {
      const { result } = renderHook(() => useUI());

      act(() => {
        result.current.handleProblemsSortChange("confidence");
      });

      expect(result.current.problemsInitialSort).toBe("confidence");
      expect(localStorage.getItem("patternbank-all-problems-sort")).toBe("confidence");
    });

    it("handleViewAllDue switches to problems tab with nextReview sort", () => {
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.handleViewAllDue();
      });
      expect(result.current.activeTab).toBe("problems");
      expect(result.current.problemsInitialSort).toBe("nextReview");
      expect(result.current.problemsInitialPatternFilter).toBe("all");
      expect(localStorage.getItem("patternbank-all-problems-sort")).toBe("nextReview");
    });

    it("handlePatternClick switches to problems tab with pattern filter", () => {
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.handlePatternClick("Binary Search");
      });
      expect(result.current.activeTab).toBe("problems");
      expect(result.current.problemsInitialPatternFilter).toBe("Binary Search");
      expect(result.current.problemsInitialSort).toBe("leetcodeNumber");
      expect(localStorage.getItem("patternbank-all-problems-sort")).toBe("leetcodeNumber");
    });

    it("handleTabChange preserves the selected sort while resetting filters", () => {
      const { result } = renderHook(() => useUI());
      // Set non-default values first
      act(() => {
        result.current.handleProblemsSortChange("confidence");
      });
      expect(result.current.problemsInitialSort).toBe("confidence");
      // Now change tab
      act(() => {
        result.current.handleTabChange("dashboard");
      });
      expect(result.current.activeTab).toBe("dashboard");
      expect(result.current.problemsInitialSort).toBe("confidence");
      expect(result.current.problemsInitialPatternFilter).toBe("all");
      expect(localStorage.getItem("patternbank-all-problems-sort")).toBe("confidence");
    });
  });

  describe("data clear", () => {
    it("requestClearData closes settings and opens confirm dialog", () => {
      const { result } = renderHook(() => useUI());
      // Open settings first
      act(() => {
        result.current.setSettingsOpen(true);
      });
      expect(result.current.settingsOpen).toBe(true);
      expect(result.current.clearDataConfirm).toBe(false);
      // Request clear data
      act(() => {
        result.current.requestClearData();
      });
      expect(result.current.settingsOpen).toBe(false);
      expect(result.current.clearDataConfirm).toBe(true);
    });
  });

  describe("V2 LeetCode intro", () => {
    it("dismissV2LeetCodeIntro persists dismissal", () => {
      const { result } = renderHook(() => useUI());

      act(() => {
        result.current.dismissV2LeetCodeIntro();
      });

      expect(result.current.v2LeetCodeIntroDismissed).toBe(true);
      expect(localStorage.getItem("patternbank-v2-leetcode-intro-dismissed")).toBe("true");
    });
  });
});
