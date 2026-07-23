// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import useAuth from "../src/hooks/useAuth";
import useLeetCodeActivity from "../src/hooks/useLeetCodeActivity";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import useProblems from "../src/hooks/useProblems";
import type { ActiveTab } from "../src/types";

// useUI stays REAL so activeTab state drives the view swap under test.
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
vi.mock("../src/components/TodayView", () => ({
  default: (props: { onViewAllDue: () => void }) => (
    <div data-testid="today-view">
      <button onClick={props.onViewAllDue}>go-view-all-due</button>
    </div>
  ),
}));
vi.mock("../src/components/ProgressView", () => ({
  default: (props: { onPatternClick: (pattern: string) => void }) => (
    <div data-testid="progress-view">
      <button onClick={() => props.onPatternClick("Binary Search")}>go-pattern</button>
    </div>
  ),
}));
vi.mock("../src/components/AllProblemsView", () => ({ default: () => <div data-testid="all-problems-view" /> }));
vi.mock("../src/components/NavBar", () => ({
  default: (props: { onTabChange: (tab: ActiveTab) => void }) => (
    <div>
      <button onClick={() => props.onTabChange("dashboard")}>nav-dashboard</button>
      <button onClick={() => props.onTabChange("progress")}>nav-progress</button>
      <button onClick={() => props.onTabChange("problems")}>nav-problems</button>
    </div>
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

function lastScrollTop(spy: ReturnType<typeof vi.spyOn>): number | undefined {
  const call = spy.mock.calls.at(-1)?.[0] as { top?: number } | undefined;
  return call?.top;
}

describe("App per-tab scroll memory", () => {
  let scrollSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.scrollY = 0;
    // Simulate the browser: programmatic scrolls move scrollY, so later
    // save-on-leave reads observe restored positions.
    scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation((options) => {
      window.scrollY = (options as { top?: number }).top ?? 0;
    });
  });

  afterEach(() => {
    scrollSpy.mockRestore();
  });

  it("opens a never-visited tab at the top and restores the position on return", () => {
    mockHooks();
    render(<App />);
    scrollSpy.mockClear();

    window.scrollY = 480;
    fireEvent.click(screen.getByRole("button", { name: "nav-progress" }));
    expect(screen.getByTestId("progress-view")).toBeTruthy();
    expect(lastScrollTop(scrollSpy)).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "nav-dashboard" }));
    expect(screen.getByTestId("today-view")).toBeTruthy();
    expect(lastScrollTop(scrollSpy)).toBe(480);
  });

  it("scrolls to the top when tapping the tab that is already active", () => {
    mockHooks();
    render(<App />);
    scrollSpy.mockClear();

    window.scrollY = 300;
    fireEvent.click(screen.getByRole("button", { name: "nav-dashboard" }));

    expect(screen.getByTestId("today-view")).toBeTruthy();
    expect(lastScrollTop(scrollSpy)).toBe(0);
  });

  it("lands Problems at the top via View-all-due and still restores Today later", () => {
    mockHooks();
    render(<App />);
    scrollSpy.mockClear();

    // Scroll Problems once so it has a saved position to override.
    fireEvent.click(screen.getByRole("button", { name: "nav-problems" }));
    window.scrollY = 800;
    fireEvent.click(screen.getByRole("button", { name: "nav-dashboard" }));

    window.scrollY = 250;
    fireEvent.click(screen.getByRole("button", { name: "go-view-all-due" }));
    expect(screen.getByTestId("all-problems-view")).toBeTruthy();
    expect(lastScrollTop(scrollSpy)).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "nav-dashboard" }));
    expect(lastScrollTop(scrollSpy)).toBe(250);
  });

  it("lands Problems at the top via a Progress pattern click", () => {
    mockHooks();
    render(<App />);
    scrollSpy.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "nav-problems" }));
    window.scrollY = 640;
    fireEvent.click(screen.getByRole("button", { name: "nav-progress" }));

    window.scrollY = 120;
    fireEvent.click(screen.getByRole("button", { name: "go-pattern" }));
    expect(screen.getByTestId("all-problems-view")).toBeTruthy();
    expect(lastScrollTop(scrollSpy)).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "nav-progress" }));
    expect(lastScrollTop(scrollSpy)).toBe(120);
  });
});
