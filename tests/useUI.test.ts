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

    it("starts with default sort and filter", () => {
      const { result } = renderHook(() => useUI());
      expect(result.current.problemsInitialSort).toBe("dateAdded");
      expect(result.current.problemsInitialPatternFilter).toBe("all");
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

    it("hideToast clears toast", () => {
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.showToast("Hello");
      });
      act(() => {
        result.current.hideToast();
      });
      expect(result.current.toast.visible).toBe(false);
      expect(result.current.toast.message).toBe("");
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
    it("handleViewAllDue switches to problems tab with nextReview sort", () => {
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.handleViewAllDue();
      });
      expect(result.current.activeTab).toBe("problems");
      expect(result.current.problemsInitialSort).toBe("nextReview");
      expect(result.current.problemsInitialPatternFilter).toBe("all");
    });

    it("handlePatternClick switches to problems tab with pattern filter", () => {
      const { result } = renderHook(() => useUI());
      act(() => {
        result.current.handlePatternClick("Binary Search");
      });
      expect(result.current.activeTab).toBe("problems");
      expect(result.current.problemsInitialPatternFilter).toBe("Binary Search");
      expect(result.current.problemsInitialSort).toBe("dateAdded");
    });

    it("handleTabChange resets sort/filter to defaults", () => {
      const { result } = renderHook(() => useUI());
      // Set non-default values first
      act(() => {
        result.current.handleViewAllDue();
      });
      expect(result.current.problemsInitialSort).toBe("nextReview");
      // Now change tab
      act(() => {
        result.current.handleTabChange("dashboard");
      });
      expect(result.current.activeTab).toBe("dashboard");
      expect(result.current.problemsInitialSort).toBe("dateAdded");
      expect(result.current.problemsInitialPatternFilter).toBe("all");
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
});
