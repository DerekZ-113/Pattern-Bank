// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import useAuth from "../src/hooks/useAuth";
import useLeetCodeActivity from "../src/hooks/useLeetCodeActivity";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import useProblems from "../src/hooks/useProblems";
import useUI from "../src/hooks/useUI";
import { addDays, todayStr } from "@patternbank/core";
import type { Problem } from "../src/types";

vi.mock("../src/hooks/useAuth");
vi.mock("../src/hooks/useUI");
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
vi.mock("../src/components/ProblemModal", () => ({ default: () => null }));
vi.mock("../src/components/TodayView", () => ({ default: () => <div data-testid="today-view" /> }));
vi.mock("../src/components/ProgressView", () => ({ default: () => <div data-testid="progress-view" /> }));
vi.mock("../src/components/AllProblemsView", () => ({ default: () => <div data-testid="all-problems-view" /> }));
// Prop-capturing stand-in: exposes the respread plumbing App threads through.
vi.mock("../src/components/SettingsModal", () => ({
  default: (props: {
    upcomingScheduleInfo: { count: number; currentPace: number } | null;
    onClose: () => void;
    onRequestRespread: () => void;
  }) => (
    <div data-testid="settings-modal">
      <div data-testid="upcoming-info">{JSON.stringify(props.upcomingScheduleInfo)}</div>
      <button onClick={props.onClose}>close-settings</button>
      <button onClick={props.onRequestRespread}>request-respread</button>
    </div>
  ),
}));

const showToast = vi.fn();
const setSettingsOpen = vi.fn();
const setRespreadConfirm = vi.fn();
const handleRespreadUpcoming = vi.fn();

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum",
    difficulty: "Easy",
    patterns: [],
    confidence: 1,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2025-01-01",
    lastReviewed: null,
    nextReviewDate: "2025-01-02",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function mockHooks({
  problems = [] as Problem[],
  dailyReviewGoal = 15,
  respreadConfirm = false,
}: { problems?: Problem[]; dailyReviewGoal?: number; respreadConfirm?: boolean } = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
    isAuthenticated: false,
    signInWithGoogle: vi.fn(),
    signInWithGitHub: vi.fn(),
    signInWithApple: vi.fn(),
    signOut: vi.fn(),
  });
  vi.mocked(useUI).mockReturnValue({
    activeTab: "dashboard",
    modalOpen: false,
    editingProblem: null,
    toast: { visible: false, message: "" },
    deleteTarget: null,
    settingsOpen: true,
    helpOpen: false,
    problemsInitialSort: "dateAdded",
    problemsInitialPatternFilter: "all",
    clearDataConfirm: false,
    respreadConfirm,
    whatsNewDismissed: true,
    setSettingsOpen,
    setHelpOpen: vi.fn(),
    setDeleteTarget: vi.fn(),
    setClearDataConfirm: vi.fn(),
    setRespreadConfirm,
    showToast,
    hideToast: vi.fn(),
    handleEdit: vi.fn(),
    handleDeleteRequest: vi.fn(),
    handleViewAllDue: vi.fn(),
    handlePatternClick: vi.fn(),
    handleProblemsSortChange: vi.fn(),
    handleTabChange: vi.fn(),
    openAddModal: vi.fn(),
    closeModal: vi.fn(),
    requestClearData: vi.fn(),
    dismissWhatsNew: vi.fn(),
  });
  vi.mocked(useProblems).mockReturnValue({
    problems,
    preferences: { dailyReviewGoal, hidePatternsDuringReview: false, enabledExtraPatterns: [] },
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
    handleRespreadUpcoming,
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

describe("App respread glue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes upcomingScheduleInfo from problems, excluding due, reviewed, and excluded ones", () => {
    const today = todayStr();
    const upcoming = [
      ...Array.from({ length: 3 }, (_, i) =>
        makeProblem({ id: `t1-${i}`, leetcodeNumber: 10 + i, nextReviewDate: addDays(today, 1) })),
      ...Array.from({ length: 3 }, (_, i) =>
        makeProblem({ id: `t2-${i}`, leetcodeNumber: 20 + i, nextReviewDate: addDays(today, 2) })),
    ];
    const due = makeProblem({ id: "due", leetcodeNumber: 30, nextReviewDate: "2020-01-01" });
    const reviewed = makeProblem({
      id: "rev", leetcodeNumber: 31, lastReviewed: today, nextReviewDate: addDays(today, 5),
    });
    const excluded = makeProblem({
      id: "excl", leetcodeNumber: 32, excludeFromReview: true, nextReviewDate: addDays(today, 5),
    });
    mockHooks({ problems: [...upcoming, due, reviewed, excluded], dailyReviewGoal: 15 });

    render(<App />);

    expect(JSON.parse(screen.getByTestId("upcoming-info").textContent!)).toEqual({
      count: 6,
      currentPace: 3, // ceil(6 / 2 distinct days)
    });
  });

  it("passes null when a re-spread would change nothing", () => {
    const today = todayStr();
    // 3 due today + 3 upcoming tomorrow at goal 3 — already exactly on pace
    const problems = [
      ...Array.from({ length: 3 }, (_, i) =>
        makeProblem({ id: `d${i}`, leetcodeNumber: 10 + i, nextReviewDate: today })),
      ...Array.from({ length: 3 }, (_, i) =>
        makeProblem({ id: `u${i}`, leetcodeNumber: 20 + i, nextReviewDate: addDays(today, 1) })),
    ];
    mockHooks({ problems, dailyReviewGoal: 3 });

    render(<App />);

    expect(screen.getByTestId("upcoming-info").textContent).toBe("null");
  });

  it("renders the respread dialog with the computed count and wires confirm", () => {
    const today = todayStr();
    const problems = Array.from({ length: 6 }, (_, i) =>
      makeProblem({ id: `u${i}`, leetcodeNumber: 10 + i, nextReviewDate: addDays(today, i + 1) }));
    mockHooks({ problems, dailyReviewGoal: 15, respreadConfirm: true });

    render(<App />);

    expect(
      screen.getByText("This will re-pace 6 upcoming problems at 15 per day, starting today.")
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    expect(handleRespreadUpcoming).toHaveBeenCalledTimes(1);
    expect(setRespreadConfirm).toHaveBeenCalledWith(false);
  });

  it("ignores Settings close requests while the respread dialog is stacked on top", () => {
    const today = todayStr();
    const problems = [makeProblem({ id: "u", nextReviewDate: addDays(today, 3) })];
    mockHooks({ problems, dailyReviewGoal: 15, respreadConfirm: true });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "close-settings" }));
    expect(setSettingsOpen).not.toHaveBeenCalled();

    // Escape cancels only the dialog
    fireEvent.keyDown(document, { key: "Escape" });
    expect(setRespreadConfirm).toHaveBeenCalledWith(false);
    expect(setSettingsOpen).not.toHaveBeenCalled();
  });

  it("closes Settings normally when no dialog is stacked", () => {
    mockHooks({ respreadConfirm: false });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "close-settings" }));
    expect(setSettingsOpen).toHaveBeenCalledWith(false);
  });
});
