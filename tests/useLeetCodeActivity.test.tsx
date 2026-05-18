// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import type { User } from "@supabase/supabase-js";
import useLeetCodeActivity from "../src/hooks/useLeetCodeActivity";
import type { LeetCodeConnection } from "../src/types";
import {
  connectLeetCodeActivity,
  disconnectLeetCodeActivity,
  fetchLeetCodeConnection,
  fetchLeetCodeIgnoredImports,
  fetchRecentLeetCodeSubmissions,
  markLeetCodeSubmissionRated,
  syncLeetCodeActivity,
  LEETCODE_RECENT_ACTIVITY_LIMIT,
} from "../src/utils/leetcodeActivityData";

vi.mock("../src/utils/leetcodeActivityData", () => ({
  connectLeetCodeActivity: vi.fn(),
  disconnectLeetCodeActivity: vi.fn(),
  fetchLeetCodeConnection: vi.fn(),
  fetchLeetCodeIgnoredImports: vi.fn(),
  fetchRecentLeetCodeSubmissions: vi.fn(),
  LEETCODE_RECENT_ACTIVITY_LIMIT: 100,
  markLeetCodeSubmissionRated: vi.fn(),
  syncLeetCodeActivity: vi.fn(),
}));

const mockUser = { id: "user-1" } as User;
const oldConnection: LeetCodeConnection = {
  userId: "user-1",
  leetcodeUsername: "derek113",
  syncStatus: "synced",
  lastSyncedAt: "2026-05-15T08:00:00.000Z",
};

describe("useLeetCodeActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchLeetCodeConnection).mockResolvedValue({ data: null, error: null });
    vi.mocked(fetchLeetCodeIgnoredImports).mockResolvedValue({ data: [], error: null });
    vi.mocked(fetchRecentLeetCodeSubmissions).mockResolvedValue({ data: [], error: null });
    vi.mocked(syncLeetCodeActivity).mockResolvedValue({
      data: { connection: oldConnection, submissions: [], ignoredImports: [], summary: { insertedCount: 3 } },
      error: null,
    });
    vi.mocked(markLeetCodeSubmissionRated).mockResolvedValue({
      data: { connection: oldConnection, submissions: [], ignoredImports: [], summary: { insertedCount: 0 } },
      error: null,
    });
  });

  it("stays idle and does not fetch when signed out", () => {
    const { result } = renderHook(() => useLeetCodeActivity({ user: null }));

    expect(result.current.connection).toBeNull();
    expect(fetchLeetCodeConnection).not.toHaveBeenCalled();
  });

  it("loads connection and submissions for a signed-in user", async () => {
    vi.mocked(fetchLeetCodeConnection).mockResolvedValue({ data: oldConnection, error: null });

    const { result } = renderHook(() => useLeetCodeActivity({ user: mockUser }));

    await waitFor(() => {
      expect(result.current.connection?.leetcodeUsername).toBe("derek113");
    });
    expect(fetchRecentLeetCodeSubmissions).toHaveBeenCalledWith("user-1", LEETCODE_RECENT_ACTIVITY_LIMIT);
    expect(fetchLeetCodeIgnoredImports).toHaveBeenCalledWith("user-1");
  });

  it("runs stale app-open sync once under StrictMode double effects", async () => {
    vi.mocked(fetchLeetCodeConnection).mockResolvedValue({ data: oldConnection, error: null });

    renderHook(() => useLeetCodeActivity({ user: mockUser }), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });

    await waitFor(() => {
      expect(syncLeetCodeActivity).toHaveBeenCalledTimes(1);
    });
    expect(syncLeetCodeActivity).toHaveBeenCalledWith(false);
  });

  it("keeps background sync quiet even when new submissions are found", async () => {
    const showToast = vi.fn();
    vi.mocked(fetchLeetCodeConnection).mockResolvedValue({ data: oldConnection, error: null });

    renderHook(() => useLeetCodeActivity({ user: mockUser, showToast }));

    await waitFor(() => {
      expect(syncLeetCodeActivity).toHaveBeenCalledTimes(1);
    });
    expect(showToast).not.toHaveBeenCalled();
  });

  it("ignores stale background sync results after the user changes", async () => {
    const nextUser = { id: "user-2" } as User;
    const staleConnection = {
      ...oldConnection,
      leetcodeUsername: "stale-user",
      lastSyncedAt: "2026-05-15T10:00:00.000Z",
    };
    let resolveBackgroundSync!: (result: Awaited<ReturnType<typeof syncLeetCodeActivity>>) => void;

    vi.mocked(fetchLeetCodeConnection).mockImplementation(async (requestedUserId: string) => ({
      data: requestedUserId === "user-1" ? oldConnection : null,
      error: null,
    }));
    vi.mocked(syncLeetCodeActivity).mockReturnValue(
      new Promise((resolve) => {
        resolveBackgroundSync = resolve;
      }),
    );

    const { result, rerender } = renderHook(
      ({ user }) => useLeetCodeActivity({ user }),
      { initialProps: { user: mockUser as User | null } },
    );

    await waitFor(() => {
      expect(syncLeetCodeActivity).toHaveBeenCalledWith(false);
    });

    rerender({ user: nextUser });

    await waitFor(() => {
      expect(fetchLeetCodeConnection).toHaveBeenCalledWith("user-2");
    });

    await act(async () => {
      resolveBackgroundSync({
        data: { connection: staleConnection, submissions: [], ignoredImports: [], summary: { insertedCount: 1 } },
        error: null,
      });
    });

    expect(result.current.connection).toBeNull();
  });

  it("manual sync passes force true", async () => {
    vi.mocked(fetchLeetCodeConnection).mockResolvedValue({ data: oldConnection, error: null });
    const { result } = renderHook(() => useLeetCodeActivity({ user: mockUser }));

    await act(async () => {
      await result.current.syncNow();
    });

    expect(syncLeetCodeActivity).toHaveBeenCalledWith(true);
  });

  it("connect validates through the connect action and refreshes state", async () => {
    vi.mocked(connectLeetCodeActivity).mockResolvedValue({
      data: { connection: oldConnection, submissions: [], ignoredImports: [], summary: { insertedCount: 0 } },
      error: null,
    });
    const { result } = renderHook(() => useLeetCodeActivity({ user: mockUser }));

    let response!: Awaited<ReturnType<typeof result.current.connect>>;
    await act(async () => {
      response = await result.current.connect("derek113");
    });

    expect(connectLeetCodeActivity).toHaveBeenCalledWith("derek113");
    expect(response.error).toBeNull();
    expect(result.current.connection?.leetcodeUsername).toBe("derek113");
  });

  it("disconnect clears local LeetCode activity state", async () => {
    vi.mocked(fetchLeetCodeConnection).mockResolvedValue({ data: oldConnection, error: null });
    vi.mocked(disconnectLeetCodeActivity).mockResolvedValue({
      data: { connection: null, submissions: [], ignoredImports: [], summary: { insertedCount: 0 } },
      error: null,
    });
    const { result } = renderHook(() => useLeetCodeActivity({ user: mockUser }));

    await waitFor(() => {
      expect(result.current.connection).not.toBeNull();
    });

    await act(async () => {
      await result.current.disconnect();
    });

    expect(disconnectLeetCodeActivity).toHaveBeenCalledTimes(1);
    expect(result.current.connection).toBeNull();
  });

  it("marks a LeetCode submission rated and refreshes local activity state from the response", async () => {
    const ratedSubmission = {
      id: "sub-db-1",
      userId: "user-1",
      leetcodeUsername: "derek113",
      leetcodeSubmissionId: "lc-sub-1",
      titleSlug: "two-sum",
      title: "Two Sum",
      leetcodeNumber: 1,
      difficulty: "Easy" as const,
      submittedAt: "2026-05-15T09:00:00.000Z",
      problemId: "problem-1",
      status: "rated" as const,
    };
    vi.mocked(markLeetCodeSubmissionRated).mockResolvedValue({
      data: { connection: oldConnection, submissions: [ratedSubmission], ignoredImports: [], summary: { insertedCount: 0 } },
      error: null,
    });
    const { result } = renderHook(() => useLeetCodeActivity({ user: mockUser }));

    await act(async () => {
      const response = await result.current.markRated("sub-db-1", "problem-1");
      expect(response.error).toBeNull();
    });

    expect(markLeetCodeSubmissionRated).toHaveBeenCalledWith("sub-db-1", "problem-1");
    expect(result.current.submissions).toEqual([ratedSubmission]);
  });
});
