// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";
import useAuth from "../src/hooks/useAuth";
import useLeetCodeActivity from "../src/hooks/useLeetCodeActivity";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import useProblems from "../src/hooks/useProblems";
import useUI from "../src/hooks/useUI";
import type { User } from "@supabase/supabase-js";
import type { LeetCodeConnection } from "../src/types";

// Real Header under test; everything else stubbed like appRespread.
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
vi.mock("../src/components/HelpModal", () => ({ default: () => null }));
vi.mock("../src/components/NavBar", () => ({ default: () => <div data-testid="nav" /> }));
vi.mock("../src/components/ProblemModal", () => ({ default: () => null }));
vi.mock("../src/components/SettingsModal", () => ({ default: () => null }));
vi.mock("../src/components/TodayView", () => ({ default: () => <div data-testid="today-view" /> }));
vi.mock("../src/components/ProgressView", () => ({ default: () => null }));
vi.mock("../src/components/AllProblemsView", () => ({ default: () => null }));

const showToast = vi.fn();
const syncNow = vi.fn();
const mockUser = { id: "user-123" } as User;

function makeConnection(overrides: Partial<LeetCodeConnection> = {}): LeetCodeConnection {
  return {
    userId: "user-123",
    leetcodeUsername: "derek",
    lastSyncedAt: "2026-07-20T00:00:00.000Z",
    syncStatus: "synced",
    ...overrides,
  };
}

function mockHooks({
  user = null as User | null,
  connection = null as LeetCodeConnection | null,
} = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    loading: false,
    isAuthenticated: !!user,
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
    settingsOpen: false,
    helpOpen: false,
    problemsInitialSort: "dateAdded",
    problemsInitialPatternFilter: "all",
    clearDataConfirm: false,
    respreadConfirm: false,
    v2LeetCodeIntroDismissed: true,
    setSettingsOpen: vi.fn(),
    setHelpOpen: vi.fn(),
    setDeleteTarget: vi.fn(),
    setClearDataConfirm: vi.fn(),
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
    connection,
    submissions: [],
    ignoredImports: [],
    loading: false,
    actionLoading: false,
    error: null,
    connect: vi.fn(),
    syncNow,
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

describe("App header LeetCode sync glue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides the button when signed out", () => {
    mockHooks();

    render(<App />);

    expect(screen.queryByRole("button", { name: "Sync LeetCode activity" })).toBeNull();
  });

  it("hides the button when signed in without a connection", () => {
    mockHooks({ user: mockUser, connection: null });

    render(<App />);

    expect(screen.queryByRole("button", { name: "Sync LeetCode activity" })).toBeNull();
  });

  it("syncs on click when connected", async () => {
    mockHooks({ user: mockUser, connection: makeConnection() });
    syncNow.mockResolvedValue({ data: { connection: makeConnection() }, error: null });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Sync LeetCode activity" }));
    await waitFor(() => expect(syncNow).toHaveBeenCalledTimes(1));
    expect(showToast).not.toHaveBeenCalled();
  });

  it("toasts the sanitized error when the sync fails", async () => {
    mockHooks({ user: mockUser, connection: makeConnection() });
    syncNow.mockResolvedValue({
      data: null,
      error: "LeetCode rate limited the request. Try again later.",
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Sync LeetCode activity" }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "LeetCode rate limited the request. Try again later.",
        undefined,
        "error"
      )
    );
  });
});
