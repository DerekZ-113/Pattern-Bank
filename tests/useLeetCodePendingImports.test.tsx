// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import type { LeetCodeIgnoredImport, LeetCodeSubmission, Problem, ReviewEvent } from "../src/types";
import {
  ignoreLeetCodeImport,
  markLeetCodeImportImported,
  markLeetCodeImportLinkedExisting,
  restoreIgnoredLeetCodeImport,
} from "../src/utils/leetcodeActivityData";

vi.mock("../src/utils/leetcodeActivityData", () => ({
  ignoreLeetCodeImport: vi.fn(),
  markLeetCodeImportImported: vi.fn(),
  markLeetCodeImportLinkedExisting: vi.fn(),
  restoreIgnoredLeetCodeImport: vi.fn(),
}));

// Mock core's dateHelpers module directly (not the "@patternbank/core" barrel):
// core-internal modules import "../dateHelpers" relatively, and the barrel
// re-exports it, so mocking the file intercepts both import paths.
vi.mock("../packages/core/src/dateHelpers", async () => {
  const actual = await vi.importActual<typeof import("../packages/core/src/dateHelpers")>(
    "../packages/core/src/dateHelpers",
  );
  return {
    ...actual,
    generateId: () => "generated-problem-id",
    todayStr: () => "2026-05-15",
  };
});

const user = { id: "user-1" };

function makeSubmission(overrides: Partial<LeetCodeSubmission> = {}): LeetCodeSubmission {
  return {
    id: "sub-db-1",
    userId: "user-1",
    leetcodeUsername: "derek113",
    leetcodeSubmissionId: "lc-sub-1",
    titleSlug: "two-sum",
    title: "Two Sum",
    leetcodeNumber: 1,
    difficulty: "Easy",
    submittedAt: "2026-05-15T18:00:00.000Z",
    problemId: null,
    status: "detected",
    createdAt: "2026-05-15T18:01:00.000Z",
    updatedAt: "2026-05-15T18:01:00.000Z",
    ...overrides,
  };
}

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p-existing",
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
    nextReviewDate: "2026-05-20",
    fiveStarStreak: 0,
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeReviewEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    date: "2026-05-15",
    problemId: "p-existing",
    confidence: 4,
    patterns: ["Hash Table"],
    timestamp: "2026-05-15T18:10:00.000Z",
    ...overrides,
  };
}

function renderPendingHook(overrides: {
  problems?: Problem[];
  reviewEvents?: ReviewEvent[];
  submissions?: LeetCodeSubmission[];
  ignoredImports?: LeetCodeIgnoredImport[];
  loading?: boolean;
  createProblem?: (problem: Problem) => { status: "created" | "duplicate"; problem: Problem };
  showToast?: (message: string, action?: { label: string; onClick: () => void }) => void;
  refresh?: () => Promise<void>;
} = {}) {
  const createProblem = overrides.createProblem ?? vi.fn((problem: Problem) => ({ status: "created" as const, problem }));
  const showToast = overrides.showToast ?? vi.fn();
  const refresh = overrides.refresh ?? vi.fn().mockResolvedValue(undefined);
  const result = renderHook(() => useLeetCodePendingImports({
    user,
    problems: overrides.problems ?? [],
    reviewEvents: overrides.reviewEvents ?? [],
    submissions: overrides.submissions ?? [makeSubmission()],
    ignoredImports: overrides.ignoredImports ?? [],
    loading: overrides.loading ?? false,
    onCreateProblem: createProblem,
    showToast,
    refreshLeetCodeActivity: refresh,
  }));
  return { ...result, createProblem, showToast, refresh };
}

describe("useLeetCodePendingImports", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(markLeetCodeImportImported).mockResolvedValue({ data: null, error: null });
    vi.mocked(markLeetCodeImportLinkedExisting).mockResolvedValue({ data: null, error: null });
    vi.mocked(ignoreLeetCodeImport).mockResolvedValue({ data: null, error: null });
    vi.mocked(restoreIgnoredLeetCodeImport).mockResolvedValue({ data: null, error: null });
  });

  it("confirms an import by creating a local problem before marking imported", async () => {
    const calls: string[] = [];
    vi.mocked(markLeetCodeImportImported).mockImplementation(async () => {
      calls.push("mark-imported");
      return { data: null, error: null };
    });
    const createProblem = vi.fn((problem: Problem) => {
      calls.push("create-problem");
      return { status: "created" as const, problem };
    });
    const { result } = renderPendingHook({ createProblem });

    await act(async () => {
      await result.current.confirmImport(result.current.pendingImports[0], 3);
    });

    expect(calls).toEqual(["create-problem", "mark-imported"]);
    expect(createProblem).toHaveBeenCalledWith(expect.objectContaining({
      title: "Two Sum",
      confidence: 3,
      lastReviewed: null,
      fiveStarStreak: 0,
    }));
    expect(markLeetCodeImportImported).toHaveBeenCalledWith("sub-db-1", "generated-problem-id");
  });

  it("links an existing duplicate instead of creating a duplicate problem", async () => {
    const existing = makeProblem();
    const createProblem = vi.fn();
    const showToast = vi.fn();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ problems }) => useLeetCodePendingImports({
        user,
        problems,
        submissions: [makeSubmission()],
        ignoredImports: [],
        loading: false,
        onCreateProblem: createProblem,
        showToast,
        refreshLeetCodeActivity: refresh,
      }),
      { initialProps: { problems: [] as Problem[] } },
    );
    const pending = result.current.pendingImports[0];

    rerender({ problems: [existing] });

    await act(async () => {
      await result.current.confirmImport(pending, 4);
    });

    expect(createProblem).not.toHaveBeenCalled();
    expect(markLeetCodeImportLinkedExisting).toHaveBeenCalledWith("sub-db-1", "p-existing");
    expect(showToast).toHaveBeenCalledWith("Already in your library — linked LeetCode activity.");
  });

  it("exposes today's linked LeetCode solves without adding them to pending imports", () => {
    const { result } = renderPendingHook({
      problems: [makeProblem()],
      submissions: [makeSubmission({ status: "linked_existing", problemId: "p-existing" })],
    });

    expect(result.current.pendingImports).toEqual([]);
    expect(result.current.todayLeetCodeItems).toHaveLength(1);
    expect(result.current.todayLeetCodeItems[0]).toMatchObject({
      kind: "linked_existing",
      title: "Two Sum",
      matchedProblemId: "p-existing",
    });
  });

  it("ignores an import and offers an undo action that restores it", async () => {
    const { result, showToast, refresh } = renderPendingHook();

    await act(async () => {
      await result.current.ignoreImport(result.current.pendingImports[0]);
    });

    expect(ignoreLeetCodeImport).toHaveBeenCalledWith("sub-db-1");
    const [, action] = vi.mocked(showToast).mock.calls[0];
    expect(action?.label).toBe("Undo");

    await act(async () => {
      action?.onClick();
    });

    expect(restoreIgnoredLeetCodeImport).toHaveBeenCalledWith("two-sum");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("auto-imports expired pending items once under StrictMode", async () => {
    const createProblem = vi.fn((problem: Problem) => ({ status: "created" as const, problem }));

    renderHook(() => useLeetCodePendingImports({
      user,
      problems: [],
      submissions: [makeSubmission({ createdAt: "2026-05-14T18:01:00.000Z" })],
      ignoredImports: [],
      loading: false,
      onCreateProblem: createProblem,
      showToast: vi.fn(),
      refreshLeetCodeActivity: vi.fn().mockResolvedValue(undefined),
    }), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });

    await waitFor(() => {
      expect(createProblem).toHaveBeenCalledTimes(1);
    });
    expect(createProblem).toHaveBeenCalledWith(expect.objectContaining({
      confidence: 1,
      nextReviewDate: "2026-05-15",
    }));
    expect(markLeetCodeImportImported).toHaveBeenCalledTimes(1);
  });

  it("hides a pending import immediately after local creation before remote imported status resolves", async () => {
    let resolveMarkImported: (value: { data: null; error: null }) => void = () => {};
    vi.mocked(markLeetCodeImportImported).mockReturnValue(new Promise((resolve) => {
      resolveMarkImported = resolve;
    }));
    const { result } = renderPendingHook();
    const pending = result.current.pendingImports[0];

    let confirmPromise: Promise<void> | undefined;
    await act(async () => {
      confirmPromise = result.current.confirmImport(pending, 3);
      await Promise.resolve();
    });

    expect(result.current.pendingImports).toEqual([]);
    expect(result.current.todayLeetCodeItems).toEqual([]);
    expect(result.current.leetcodeSubmissionsForTodayFeed[0]).toMatchObject({
      status: "imported",
      problemId: "generated-problem-id",
    });

    await act(async () => {
      resolveMarkImported({ data: null, error: null });
      await confirmPromise;
    });
  });

  it("keeps a pending import hidden when the remote imported status update fails", async () => {
    vi.mocked(markLeetCodeImportImported).mockResolvedValue({ data: null, error: "remote failed" });
    const { result } = renderPendingHook();

    await act(async () => {
      await result.current.confirmImport(result.current.pendingImports[0], 3);
    });

    expect(result.current.pendingImports).toEqual([]);
    expect(result.current.todayLeetCodeItems).toEqual([]);
    expect(result.current.leetcodeSubmissionsForTodayFeed[0]).toMatchObject({
      status: "imported",
      problemId: "generated-problem-id",
    });
  });

  it("keeps an imported completion hidden when stale sync returns a fresh detected row", async () => {
    const { result, rerender } = renderHook(
      ({ submissions }) => useLeetCodePendingImports({
        user,
        problems: [],
        submissions,
        ignoredImports: [],
        loading: false,
        onCreateProblem: vi.fn((problem: Problem) => ({ status: "created" as const, problem })),
        showToast: vi.fn(),
        refreshLeetCodeActivity: vi.fn().mockResolvedValue(undefined),
      }),
      {
        initialProps: {
          submissions: [makeSubmission()],
        },
      },
    );

    await act(async () => {
      await result.current.confirmImport(result.current.pendingImports[0], 3);
    });

    rerender({
      submissions: [
        makeSubmission({
          id: "fresh-detected-sync-row",
          leetcodeSubmissionId: "fresh-lc-submission",
          status: "detected",
          problemId: null,
        }),
      ],
    });

    expect(result.current.pendingImports).toEqual([]);
    expect(result.current.todayLeetCodeItems).toEqual([]);
    expect(result.current.leetcodeSubmissionsForTodayFeed[0]).toMatchObject({
      id: "fresh-detected-sync-row",
      status: "imported",
      problemId: "generated-problem-id",
    });
  });

  it("records duplicate import completions as linked existing without creating a problem", async () => {
    const createProblem = vi.fn();
    const { result } = renderPendingHook({
      problems: [makeProblem()],
      createProblem,
    });
    const pending = {
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      title: "Two Sum",
      leetcodeNumber: 1,
      difficulty: "Easy" as const,
      submittedAt: "2026-05-15T18:00:00.000Z",
      firstSeenAt: "2026-05-15T18:01:00.000Z",
      suggestedPatterns: ["Hash Table"],
      expired: false,
    };

    await act(async () => {
      await result.current.confirmImport(pending, 4);
    });

    expect(createProblem).not.toHaveBeenCalled();
    expect(result.current.todayLeetCodeItems).toEqual([]);
    expect(result.current.leetcodeSubmissionsForTodayFeed[0]).toMatchObject({
      status: "linked_existing",
      problemId: "p-existing",
    });
  });

  it("records known-rating completions and overlays the rated submission", () => {
    const { result } = renderPendingHook({
      problems: [makeProblem()],
      submissions: [makeSubmission({ status: "linked_existing", problemId: "p-existing" })],
    });

    act(() => {
      result.current.recordRatedCompletion({
        submissionDbId: "sub-db-1",
        titleSlug: "two-sum",
        leetcodeNumber: 1,
      }, "p-existing");
    });

    expect(result.current.todayLeetCodeItems).toEqual([]);
    expect(result.current.leetcodeSubmissionsForTodayFeed[0]).toMatchObject({
      status: "rated",
      problemId: "p-existing",
    });
  });

  it("records known-rating completions with the clicked item identity when submissions are stale", () => {
    const { result, rerender } = renderHook(
      ({ submissions }) => useLeetCodePendingImports({
        user,
        problems: [makeProblem()],
        submissions,
        ignoredImports: [],
        loading: false,
        onCreateProblem: vi.fn((problem: Problem) => ({ status: "created" as const, problem })),
        showToast: vi.fn(),
        refreshLeetCodeActivity: vi.fn().mockResolvedValue(undefined),
      }),
      {
        initialProps: {
          submissions: [makeSubmission({ status: "linked_existing", problemId: "p-existing" })],
        },
      },
    );

    act(() => {
      result.current.recordRatedCompletion({
        submissionDbId: "sub-db-1",
        titleSlug: "two-sum",
        leetcodeNumber: 1,
      }, "p-existing");
    });

    rerender({
      submissions: [
        makeSubmission({
          id: "fresh-submission",
          status: "linked_existing",
          problemId: "p-existing",
          leetcodeSubmissionId: "fresh-lc-submission",
        }),
      ],
    });

    expect(result.current.todayLeetCodeItems).toEqual([]);
    expect(result.current.leetcodeSubmissionsForTodayFeed[0]).toMatchObject({
      id: "fresh-submission",
      status: "rated",
      problemId: "p-existing",
    });
  });

  it("keeps known ratings hidden when stale sync changes the slug but keeps the LeetCode number", () => {
    const { result, rerender } = renderHook(
      ({ submissions }) => useLeetCodePendingImports({
        user,
        problems: [makeProblem()],
        submissions,
        ignoredImports: [],
        loading: false,
        onCreateProblem: vi.fn((problem: Problem) => ({ status: "created" as const, problem })),
        showToast: vi.fn(),
        refreshLeetCodeActivity: vi.fn().mockResolvedValue(undefined),
      }),
      {
        initialProps: {
          submissions: [makeSubmission({ status: "linked_existing", problemId: "p-existing" })],
        },
      },
    );

    act(() => {
      result.current.recordRatedCompletion({
        submissionDbId: "sub-db-1",
        titleSlug: "two-sum",
        leetcodeNumber: 1,
      }, "p-existing");
    });

    rerender({
      submissions: [
        makeSubmission({
          id: "fresh-submission",
          leetcodeSubmissionId: "fresh-lc-submission",
          titleSlug: "two-sum-v2",
          leetcodeNumber: 1,
          status: "linked_existing",
          problemId: "p-existing",
        }),
      ],
    });

    expect(result.current.todayLeetCodeItems).toEqual([]);
    expect(result.current.leetcodeSubmissionsForTodayFeed[0]).toMatchObject({
      id: "fresh-submission",
      status: "rated",
      problemId: "p-existing",
    });
  });

  it("keeps completed items hidden after remounting from local storage", async () => {
    const first = renderPendingHook();

    await act(async () => {
      await first.result.current.confirmImport(first.result.current.pendingImports[0], 3);
    });
    first.unmount();

    const second = renderPendingHook();

    expect(second.result.current.pendingImports).toEqual([]);
    expect(second.result.current.todayLeetCodeItems).toEqual([]);
  });

  it("persists reviewed-today completions so stale sync rows cannot re-show the card", () => {
    const { result, rerender } = renderHook(
      ({ problems, reviewEvents, submissions }) => useLeetCodePendingImports({
        user,
        problems,
        reviewEvents,
        submissions,
        ignoredImports: [],
        loading: false,
        onCreateProblem: vi.fn((problem: Problem) => ({ status: "created" as const, problem })),
        showToast: vi.fn(),
        refreshLeetCodeActivity: vi.fn().mockResolvedValue(undefined),
      }),
      {
        initialProps: {
          problems: [makeProblem({ lastReviewed: "2026-05-15" })],
          reviewEvents: [makeReviewEvent()],
          submissions: [makeSubmission({ status: "linked_existing", problemId: "p-existing" })],
        },
      },
    );

    expect(result.current.todayLeetCodeItems).toEqual([]);

    rerender({
      problems: [makeProblem({ lastReviewed: null })],
      reviewEvents: [],
      submissions: [
        makeSubmission({
          id: "fresh-stale-sync-row",
          leetcodeSubmissionId: "fresh-lc-submission",
          status: "linked_existing",
          problemId: "p-existing",
        }),
      ],
    });

    expect(result.current.todayLeetCodeItems).toEqual([]);
    expect(result.current.leetcodeSubmissionsForTodayFeed[0]).toMatchObject({
      id: "fresh-stale-sync-row",
      status: "rated",
      problemId: "p-existing",
    });
  });
});
