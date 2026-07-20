// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import App from "../src/App";
import useAuth from "../src/hooks/useAuth";
import useLeetCodeActivity from "../src/hooks/useLeetCodeActivity";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import useProblems from "../src/hooks/useProblems";
import useUI from "../src/hooks/useUI";
import type { UseLeetCodeActivityState } from "../src/hooks/useLeetCodeActivity";

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
vi.mock("../src/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));
vi.mock("../src/components/HelpModal", () => ({
  default: () => null,
}));
vi.mock("../src/components/NavBar", () => ({
  default: () => <div data-testid="nav" />,
}));
vi.mock("../src/components/ProblemModal", () => ({
  default: () => null,
}));
vi.mock("../src/components/SettingsModal", () => ({
  default: () => <div data-testid="settings-modal" />,
}));
vi.mock("../src/components/TodayView", () => ({
  default: () => <div data-testid="today-view" />,
}));
vi.mock("../src/components/ProgressView", () => ({
  default: () => <div data-testid="progress-view" />,
}));
vi.mock("../src/components/AllProblemsView", () => ({
  default: () => <div data-testid="all-problems-view" />,
}));

const mockUser = { id: "user-1" } as User;

const signOut = vi.fn();
const showToast = vi.fn();
const setClearDataConfirm = vi.fn();
const handleClearAllData = vi.fn();
const disconnect = vi.fn();

function mockBaseHooks({
  user = mockUser,
  leetcodeActivity = {},
}: {
  user?: User | null;
  leetcodeActivity?: Partial<UseLeetCodeActivityState>;
} = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    loading: false,
    isAuthenticated: Boolean(user),
    signInWithGoogle: vi.fn(),
    signInWithGitHub: vi.fn(),
    signInWithApple: vi.fn(),
    signOut,
  });

  vi.mocked(useUI).mockReturnValue({
    activeTab: "dashboard",
    modalOpen: false,
    editingProblem: null,
    toast: { visible: false, message: "" },
    deleteTarget: null,
    settingsOpen: false,
    helpOpen: false,
    problemsInitialSort: "dateAdded",
    problemsInitialPatternFilter: "all",
    clearDataConfirm: true,
    respreadConfirm: false,
    v2LeetCodeIntroDismissed: true,
    setSettingsOpen: vi.fn(),
    setHelpOpen: vi.fn(),
    setDeleteTarget: vi.fn(),
    setClearDataConfirm,
    setRespreadConfirm: vi.fn(),
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
    dismissV2LeetCodeIntro: vi.fn(),
  });

  vi.mocked(useProblems).mockReturnValue({
    problems: [],
    preferences: {
      dailyReviewGoal: 5,
      hidePatternsDuringReview: false,
      enabledExtraPatterns: [],
    },
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
    handleClearAllData,
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
    disconnect,
    markRated: vi.fn(),
    refresh: vi.fn(),
    ...leetcodeActivity,
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

async function confirmClearAll() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Clear Everything" }));
  await waitFor(() => {
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
}

describe("App clear-all confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleClearAllData.mockResolvedValue(undefined);
    disconnect.mockResolvedValue({ data: null, error: null });
  });

  it("disconnects visible LeetCode connection before clearing PatternBank data and signing out", async () => {
    mockBaseHooks({
      leetcodeActivity: {
        connection: {
          userId: "user-1",
          leetcodeUsername: "derek113",
          syncStatus: "synced",
        },
      },
    });

    await confirmClearAll();

    await waitFor(() => {
      expect(disconnect).toHaveBeenCalledTimes(1);
      expect(handleClearAllData).toHaveBeenCalledTimes(1);
      expect(signOut).toHaveBeenCalledTimes(1);
    });
    expect(disconnect.mock.invocationCallOrder[0]).toBeLessThan(handleClearAllData.mock.invocationCallOrder[0]);
    expect(handleClearAllData.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0]);
  });

  it("disconnects when only visible LeetCode submissions are loaded", async () => {
    mockBaseHooks({
      leetcodeActivity: {
        submissions: [{
          id: "sub-db-1",
          userId: "user-1",
          leetcodeUsername: "derek113",
          leetcodeSubmissionId: "lc-sub-1",
          titleSlug: "two-sum",
          title: "Two Sum",
          leetcodeNumber: 1,
          difficulty: "Easy",
          submittedAt: "2026-05-17T18:30:00.000Z",
          problemId: null,
          status: "detected",
        }],
      },
    });

    await confirmClearAll();

    await waitFor(() => {
      expect(disconnect).toHaveBeenCalledTimes(1);
      expect(handleClearAllData).toHaveBeenCalledTimes(1);
    });
  });

  it("blocks PatternBank clear and sign-out when LeetCode disconnect fails", async () => {
    disconnect.mockResolvedValue({
      data: null,
      error: "LeetCode activity sync failed. Try again later.",
    });
    mockBaseHooks({
      leetcodeActivity: {
        ignoredImports: [{
          userId: "user-1",
          titleSlug: "two-sum",
          leetcodeNumber: 1,
          ignoredAt: "2026-05-17T18:30:00.000Z",
        }],
      },
    });

    await confirmClearAll();

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith("LeetCode activity sync failed. Try again later.", undefined, "error");
    });
    expect(handleClearAllData).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("keeps current clear-all behavior when no visible LeetCode activity exists", async () => {
    mockBaseHooks();

    await confirmClearAll();

    await waitFor(() => {
      expect(handleClearAllData).toHaveBeenCalledTimes(1);
      expect(signOut).toHaveBeenCalledTimes(1);
    });
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("waits for sign-out to finish before closing the confirmation dialog", async () => {
    let resolveSignOut!: () => void;
    signOut.mockReturnValue(new Promise<void>((resolve) => { resolveSignOut = resolve; }));
    mockBaseHooks();

    await confirmClearAll();

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });
    // A reload before the session is actually cleared must not be possible to
    // mistake for success — the dialog stays open until sign-out completes.
    expect(setClearDataConfirm).not.toHaveBeenCalled();

    resolveSignOut();
    await waitFor(() => {
      expect(setClearDataConfirm).toHaveBeenCalledWith(false);
    });
  });

  it("closes the confirmation dialog even when sign-out fails", async () => {
    signOut.mockRejectedValue(new Error("network down"));
    mockBaseHooks();

    await confirmClearAll();

    await waitFor(() => {
      expect(setClearDataConfirm).toHaveBeenCalledWith(false);
    });
  });

  it("clears local data without sign-out when signed out", async () => {
    mockBaseHooks({ user: null });

    await confirmClearAll();

    await waitFor(() => {
      expect(handleClearAllData).toHaveBeenCalledTimes(1);
    });
    expect(disconnect).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("mentions LeetCode Activity in the destructive confirmation copy", () => {
    mockBaseHooks();

    render(<App />);

    expect(screen.getByText(/LeetCode Activity connection, submissions, and ignored imports/)).toBeTruthy();
  });
});
