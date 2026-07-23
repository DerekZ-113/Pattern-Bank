// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import useAuth from "../src/hooks/useAuth";
import useLeetCodeActivity from "../src/hooks/useLeetCodeActivity";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import useProblems from "../src/hooks/useProblems";
import { todayStr } from "@patternbank/core";
import type { Problem } from "../src/types";

// Real useUI and real TodayView drive the flow; ProblemModal is a
// prop-capturing stub so we can assert the edit-mode open without paying
// for the full modal (problemModal.test.tsx pins the "Problem Details"
// heading for edit mode).
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
vi.mock("../src/components/NavBar", () => ({ default: () => <div data-testid="nav" /> }));
vi.mock("../src/components/SettingsModal", () => ({ default: () => null }));
vi.mock("../src/components/ProgressView", () => ({ default: () => null }));
vi.mock("../src/components/AllProblemsView", () => ({ default: () => null }));
vi.mock("../src/components/ProblemModal", () => ({
  default: (props: { isOpen: boolean; initialData: Problem | null }) => (
    <div data-testid="problem-modal">
      {props.isOpen ? `open:${props.initialData?.title ?? "new"}` : "closed"}
    </div>
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
    handleReview: vi.fn(),
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
}

describe("App opens Problem Details from Today", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("clicking a Today review title opens the edit modal with that problem", () => {
    mockHooks([makeProblem()]);

    render(<App />);

    expect(screen.getByTestId("problem-modal").textContent).toBe("closed");
    fireEvent.click(screen.getByRole("button", { name: "Two Sum" }));
    expect(screen.getByTestId("problem-modal").textContent).toBe("open:Two Sum");
  });
});
