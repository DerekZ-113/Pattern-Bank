// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import useLeetCodePendingImports from "../src/hooks/useLeetCodePendingImports";
import type { LeetCodeIgnoredImport, LeetCodeSubmission, Problem } from "../src/types";
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

vi.mock("../src/utils/dateHelpers", async () => {
  const actual = await vi.importActual<typeof import("../src/utils/dateHelpers")>("../src/utils/dateHelpers");
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

function renderPendingHook(overrides: {
  problems?: Problem[];
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
});
