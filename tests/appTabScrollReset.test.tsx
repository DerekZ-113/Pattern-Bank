// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import useAuth from "../src/hooks/useAuth";
import useLeetCodeActivity from "../src/hooks/useLeetCodeActivity";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import useProblems from "../src/hooks/useProblems";
import type { ActiveTab } from "../src/types";

// useUI stays REAL so its activeTab state drives the view swap under test.
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
vi.mock("../src/components/ProblemModal", () => ({ default: () => null }));
vi.mock("../src/components/SettingsModal", () => ({ default: () => null }));
vi.mock("../src/components/TodayView", () => ({ default: () => <div data-testid="today-view" /> }));
vi.mock("../src/components/ProgressView", () => ({ default: () => <div data-testid="progress-view" /> }));
vi.mock("../src/components/AllProblemsView", () => ({ default: () => <div data-testid="all-problems-view" /> }));
vi.mock("../src/components/NavBar", () => ({
  default: (props: { onTabChange: (tab: ActiveTab) => void }) => (
    <button onClick={() => props.onTabChange("progress")}>go-progress</button>
  ),
}));

function mockHooks() {
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
    problems: [],
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

describe("App tab scroll reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("scrolls the window back to the top when the active tab changes", () => {
    mockHooks();
    const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(<App />);
    expect(screen.getByTestId("today-view")).toBeTruthy();
    scrollSpy.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "go-progress" }));

    expect(screen.getByTestId("progress-view")).toBeTruthy();
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });

    scrollSpy.mockRestore();
  });
});
