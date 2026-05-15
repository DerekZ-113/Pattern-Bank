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
  fetchRecentLeetCodeSubmissions,
  syncLeetCodeActivity,
} from "../src/utils/leetcodeActivityData";

vi.mock("../src/utils/leetcodeActivityData", () => ({
  connectLeetCodeActivity: vi.fn(),
  disconnectLeetCodeActivity: vi.fn(),
  fetchLeetCodeConnection: vi.fn(),
  fetchRecentLeetCodeSubmissions: vi.fn(),
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
    vi.mocked(fetchRecentLeetCodeSubmissions).mockResolvedValue({ data: [], error: null });
    vi.mocked(syncLeetCodeActivity).mockResolvedValue({
      data: { connection: oldConnection, submissions: [], summary: { insertedCount: 3 } },
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
    expect(fetchRecentLeetCodeSubmissions).toHaveBeenCalledWith("user-1", 20);
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
      data: { connection: oldConnection, submissions: [], summary: { insertedCount: 0 } },
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
      data: { connection: null, submissions: [], summary: { insertedCount: 0 } },
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
});
