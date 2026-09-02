// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import useAuth from "../src/hooks/useAuth";
import useLeetCodeActivity from "../src/hooks/useLeetCodeActivity";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import useProblems from "../src/hooks/useProblems";
import { todayStr } from "@patternbank/core";
import type { Problem } from "../src/types";

// Real useUI and real NavBar drive the tab switch; AllProblemsView is a
// stub that exercises the onReview prop App must wire to handleReview
// (allProblemsView.test.tsx pins the card-level interaction).
vi.mock("../src/hooks/useAuth");
vi.mock("../src/hooks/useProblems");
vi.mock("../src/hooks/useLeetCodeActivity");
vi.mock("../src/hooks/useLeetCodePendingImports");
vi.mock("../src/utils/storage", () => ({
  exportData: vi.fn(),
  loadReviewEvents: vi.fn(() => []),
  loadReviewLog: vi.fn(() => []),
}));
vi.mock("../src/components/Header", () => ({ default: () => <div data-testid="header" /> }));
vi.mock("../src/components/HelpModal", () => ({ default: () => null }));
vi.mock("../src/components/SettingsModal", () => ({ default: () => null }));
vi.mock("../src/components/ProgressView", () => ({ default: () => null }));
vi.mock("../src/components/ProblemModal", () => ({ default: () => null }));
vi.mock("../src/components/AllProblemsView", () => ({
  default: (props: { onReview?: (id: string, confidence: number) => void }) => (
    <button type="button" onClick={() => props.onReview?.("p1", 4)}>
      stub-review
    </button>
  ),
}));

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-05-01",
    lastReviewed: null,
    nextReviewDate: todayStr(),
    updatedAt: "2026-05-01T12:00:00.000Z",
    ...overrides,
  };
}

function mockHooks(problems: Problem[]) {
  const handleReview = vi.fn();
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
    isAuthenticated: false,
    signInWithGoogle: vi.fn(),
    signInWithGitHub: vi.fn(),
    signInWithApple: vi.fn(),
    signOut: vi.fn(),
  });
  vi.mocked(useProblems).mockReturnValue({
    problems,
    preferences: { dailyReviewGoal: 5, hidePatternsDuringReview: false, enabledExtraPatterns: [] },
    syncStatus: "idle",
    reviewCount: 0,
    handleSaveProblem: vi.fn(),
    handleDeleteConfirm: vi.fn(),
    handleCreateProblemFromLeetCodeImport: vi.fn(),
    handleReview,
    handleUpdateNotes: vi.fn(),
    handleDismiss: vi.fn(),
    handleImport: vi.fn(),
    handleUpdatePreferences: vi.fn(),
    handleBulkAdd: vi.fn(),
    handleToggleExclude: vi.fn(),
    handleRespreadUpcoming: vi.fn(),
    handleSetAllDue: vi.fn(),
    handleClearAllData: vi.fn(),
  });
  vi.mocked(useLeetCodeActivity).mockReturnValue({
    connection: null,
    submissions: [],
    ignoredImports: [],
    loading: false,
    actionLoading: false,
    error: null,
    connect: vi.fn(),
    syncNow: vi.fn(),
    disconnect: vi.fn(),
    markRated: vi.fn(),
    refresh: vi.fn(),
  });
  vi.mocked(useLeetCodePendingImports).mockReturnValue({
    pendingImports: [],
    todayLeetCodeItems: [],
    leetcodeSubmissionsForTodayFeed: [],
    confirmImport: vi.fn(),
    ignoreImport: vi.fn(),
    recordRatedCompletion: vi.fn(),
  });
  return { handleReview };
}

describe("App wires All Problems reviews to handleReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("routes a card review through handleReview tagged with its source", () => {
    const { handleReview } = mockHooks([makeProblem()]);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Problems/i }));
    fireEvent.click(screen.getByRole("button", { name: "stub-review" }));

    expect(handleReview).toHaveBeenCalledWith("p1", 4, { source: "all_problems" });
  });
});
