// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import App from "../src/App";
import useAuth from "../src/hooks/useAuth";
import useLeetCodeActivity from "../src/hooks/useLeetCodeActivity";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import useProblems from "../src/hooks/useProblems";
import { WHATS_NEW } from "../src/utils/whatsNew";
import type { User } from "@supabase/supabase-js";
import type { LeetCodeConnection } from "../src/types";

// Real useUI drives the dismissed state; TodayView is a prop-capturing stub.
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
vi.mock("../src/components/ProblemModal", () => ({ default: () => null }));
vi.mock("../src/components/SettingsModal", () => ({ default: () => null }));
vi.mock("../src/components/ProgressView", () => ({ default: () => null }));
vi.mock("../src/components/AllProblemsView", () => ({ default: () => null }));
vi.mock("../src/components/TodayView", () => ({
  default: (props: { showWhatsNew?: boolean; showWhatsNewLeetCodeCta?: boolean; signedIn?: boolean }) => (
    <div data-testid="today-props">
      {JSON.stringify({
        showWhatsNew: props.showWhatsNew,
        cta: props.showWhatsNewLeetCodeCta,
        signedIn: props.signedIn,
      })}
    </div>
  ),
}));

const mockUser = { id: "user-123" } as User;

function makeConnection(): LeetCodeConnection {
  return {
    userId: "user-123",
    leetcodeUsername: "derek",
    lastSyncedAt: "2026-07-20T00:00:00.000Z",
    syncStatus: "synced",
  };
}

function mockHooks({
  user = null as User | null,
  connection = null as LeetCodeConnection | null,
  loading = false,
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
    loading,
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

function todayProps() {
  return JSON.parse(screen.getByTestId("today-props").textContent!);
}

describe("App What's New gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("hides the banner while the LeetCode connection is loading", () => {
    mockHooks({ user: mockUser, loading: true });

    render(<App />);

    expect(todayProps().showWhatsNew).toBe(false);
  });

  it("shows the banner with the LeetCode CTA for unconnected signed-out users", () => {
    mockHooks();

    render(<App />);

    expect(todayProps()).toEqual({ showWhatsNew: true, cta: true, signedIn: false });
  });

  it("shows the banner without the CTA for connected users", () => {
    mockHooks({ user: mockUser, connection: makeConnection() });

    render(<App />);

    expect(todayProps()).toEqual({ showWhatsNew: true, cta: false, signedIn: true });
  });

  it("hides the banner once the current release is dismissed", () => {
    localStorage.setItem("patternbank-whatsnew-dismissed", WHATS_NEW.id);
    mockHooks();

    render(<App />);

    expect(todayProps().showWhatsNew).toBe(false);
  });
});
