import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Problem, Confidence, Preferences } from "../src/types";

vi.mock("../src/utils/supabaseData", () => ({
  fetchProblems: vi.fn(),
  fetchReviewLog: vi.fn(),
  fetchPreferences: vi.fn(),
  upsertProblem: vi.fn(),
  upsertProblems: vi.fn(),
  deleteProblem: vi.fn(),
  deleteProblems: vi.fn(),
  upsertProblemTombstone: vi.fn(),
  upsertDataReset: vi.fn(),
  deleteAllUserProblems: vi.fn(),
  deleteAllUserReviewLog: vi.fn(),
  logReview: vi.fn(),
  replaceReviewLog: vi.fn(),
  upsertPreferences: vi.fn(),
  fetchProblemReviewHistory: vi.fn(),
  submitFeedback: vi.fn(),
}));

import {
  upsertProblem,
  upsertProblems,
  deleteProblem,
  upsertProblemTombstone,
  upsertDataReset,
  deleteAllUserProblems,
  deleteAllUserReviewLog,
  logReview,
  replaceReviewLog,
  upsertPreferences,
} from "../src/utils/supabaseData";
import {
  pushProblemToCloud,
  pushProblemsToCloud,
  deleteProblemFromCloud,
  pushReviewToCloud,
  replaceReviewInCloud,
  pushPreferencesToCloud,
  clearAllCloudData,
} from "../src/utils/sync";

const upsertProblemMock = upsertProblem as ReturnType<typeof vi.fn>;
const upsertProblemsMock = upsertProblems as ReturnType<typeof vi.fn>;
const deleteProblemMock = deleteProblem as ReturnType<typeof vi.fn>;
const upsertProblemTombstoneMock = upsertProblemTombstone as ReturnType<typeof vi.fn>;
const upsertDataResetMock = upsertDataReset as ReturnType<typeof vi.fn>;
const deleteAllUserProblemsMock = deleteAllUserProblems as ReturnType<typeof vi.fn>;
const deleteAllUserReviewLogMock = deleteAllUserReviewLog as ReturnType<typeof vi.fn>;
const logReviewMock = logReview as ReturnType<typeof vi.fn>;
const replaceReviewLogMock = replaceReviewLog as ReturnType<typeof vi.fn>;
const upsertPreferencesMock = upsertPreferences as ReturnType<typeof vi.fn>;

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "test-1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2025-01-01",
    lastReviewed: null,
    nextReviewDate: "2025-01-02",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const USER_ID = "user-abc";
const DEFAULT_PREFS: Preferences = { dailyReviewGoal: 5, hidePatternsDuringReview: false, enabledExtraPatterns: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pushProblemToCloud", () => {
  it("calls upsertProblem with userId and problem", async () => {
    upsertProblemMock.mockResolvedValue({ error: null });
    const problem = makeProblem();
    await pushProblemToCloud(USER_ID, problem);
    expect(upsertProblemMock).toHaveBeenCalledOnce();
    expect(upsertProblemMock).toHaveBeenCalledWith(USER_ID, problem);
  });

  it("logs error on failure but does not throw", async () => {
    upsertProblemMock.mockResolvedValue({ error: new Error("fail") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(pushProblemToCloud(USER_ID, makeProblem())).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe("pushProblemsToCloud", () => {
  it("calls upsertProblems with userId and problems", async () => {
    upsertProblemsMock.mockResolvedValue({ error: null });
    const problems = [makeProblem({ id: "a" }), makeProblem({ id: "b" })];
    await pushProblemsToCloud(USER_ID, problems);
    expect(upsertProblemsMock).toHaveBeenCalledOnce();
    expect(upsertProblemsMock).toHaveBeenCalledWith(USER_ID, problems);
  });

  it("does nothing when problems array is empty", async () => {
    await pushProblemsToCloud(USER_ID, []);
    expect(upsertProblemsMock).not.toHaveBeenCalled();
  });

  it("logs error on failure but does not throw", async () => {
    upsertProblemsMock.mockResolvedValue({ error: new Error("fail") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        pushProblemsToCloud(USER_ID, [makeProblem()])
      ).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe("deleteProblemFromCloud", () => {
  it("records a tombstone and deletes the problem row", async () => {
    deleteProblemMock.mockResolvedValue({ error: null });
    upsertProblemTombstoneMock.mockResolvedValue({ error: null });
    await deleteProblemFromCloud(USER_ID, "problem-42", "2026-03-10T12:00:00.000Z");
    expect(upsertProblemTombstoneMock).toHaveBeenCalledOnce();
    expect(upsertProblemTombstoneMock).toHaveBeenCalledWith(USER_ID, {
      problemId: "problem-42",
      deletedAt: "2026-03-10T12:00:00.000Z",
    });
    expect(deleteProblemMock).toHaveBeenCalledOnce();
    expect(deleteProblemMock).toHaveBeenCalledWith("problem-42");
  });

  it("logs error on failure but does not throw", async () => {
    deleteProblemMock.mockResolvedValue({ error: new Error("fail") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(deleteProblemFromCloud(USER_ID, "problem-42")).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("skips physical delete when tombstone upsert fails", async () => {
    upsertProblemTombstoneMock.mockResolvedValue({ error: new Error("tombstone failed") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(deleteProblemFromCloud(USER_ID, "problem-42")).resolves.toBeUndefined();

      expect(upsertProblemTombstoneMock).toHaveBeenCalledWith(USER_ID, {
        problemId: "problem-42",
        deletedAt: expect.any(String),
      });
      expect(deleteProblemMock).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe("clearAllCloudData", () => {
  it("writes the reset marker before clearing cloud rows", async () => {
    upsertDataResetMock.mockResolvedValue({ error: null });
    deleteAllUserProblemsMock.mockResolvedValue({ error: null });
    deleteAllUserReviewLogMock.mockResolvedValue({ error: null });

    await clearAllCloudData(USER_ID, "2026-03-10T12:00:00.000Z");

    expect(upsertDataResetMock).toHaveBeenCalledWith(USER_ID, {
      resetAt: "2026-03-10T12:00:00.000Z",
    });
    expect(deleteAllUserProblemsMock).toHaveBeenCalledWith(USER_ID);
    expect(deleteAllUserReviewLogMock).toHaveBeenCalledWith(USER_ID);
  });

  it("skips cloud cleanup when reset marker upsert fails", async () => {
    upsertDataResetMock.mockResolvedValue({ error: new Error("reset failed") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(clearAllCloudData(USER_ID, "2026-03-10T12:00:00.000Z")).resolves.toBeUndefined();

      expect(upsertDataResetMock).toHaveBeenCalledWith(USER_ID, {
        resetAt: "2026-03-10T12:00:00.000Z",
      });
      expect(deleteAllUserProblemsMock).not.toHaveBeenCalled();
      expect(deleteAllUserReviewLogMock).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe("pushReviewToCloud", () => {
  it("calls logReview with correct arguments", async () => {
    logReviewMock.mockResolvedValue({ error: null });
    const oldConf: Confidence = 2;
    const newConf: Confidence = 4;
    await pushReviewToCloud(USER_ID, "problem-1", oldConf, newConf, ["DP"]);
    expect(logReviewMock).toHaveBeenCalledOnce();
    expect(logReviewMock).toHaveBeenCalledWith(USER_ID, "problem-1", oldConf, newConf, ["DP"], undefined);
  });

  it("logs error on failure but does not throw", async () => {
    logReviewMock.mockResolvedValue({ error: new Error("fail") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        pushReviewToCloud(USER_ID, "problem-1", 2, 4, ["DP"])
      ).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe("replaceReviewInCloud", () => {
  it("calls replaceReviewLog with correct arguments", async () => {
    replaceReviewLogMock.mockResolvedValue({ data: null, error: null });
    const timestamp = "2026-03-10T12:00:00.000Z";

    await replaceReviewInCloud(USER_ID, "problem-1", 2, 5, ["DP"], timestamp);

    expect(replaceReviewLogMock).toHaveBeenCalledOnce();
    expect(replaceReviewLogMock).toHaveBeenCalledWith(USER_ID, "problem-1", 2, 5, ["DP"], timestamp);
  });

  it("serializes same-day replacements for the same problem", async () => {
    let resolveFirst: ((value: { data: null; error: null }) => void) | undefined;
    const startedNewConfidences: Confidence[] = [];
    replaceReviewLogMock.mockImplementation((...args: unknown[]) => {
      startedNewConfidences.push(args[3] as Confidence);
      if (startedNewConfidences.length === 1) {
        return new Promise((resolve) => {
          resolveFirst = resolve as typeof resolveFirst;
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const first = replaceReviewInCloud(
      USER_ID,
      "problem-1",
      3,
      4,
      ["DP"],
      "2026-03-10T12:00:00.000Z",
    );
    const second = replaceReviewInCloud(
      USER_ID,
      "problem-1",
      4,
      5,
      ["DP"],
      "2026-03-10T12:01:00.000Z",
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(startedNewConfidences).toEqual([4]);

    resolveFirst?.({ data: null, error: null });
    await Promise.all([first, second]);

    expect(startedNewConfidences).toEqual([4, 5]);
  });

  it("logs error on replacement failure but does not throw", async () => {
    replaceReviewLogMock.mockResolvedValue({ data: null, error: new Error("fail") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        replaceReviewInCloud(USER_ID, "problem-1", 2, 5, ["DP"])
      ).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe("pushPreferencesToCloud", () => {
  it("calls upsertPreferences with userId and prefs", async () => {
    upsertPreferencesMock.mockResolvedValue({ error: null });
    await pushPreferencesToCloud(USER_ID, DEFAULT_PREFS);
    expect(upsertPreferencesMock).toHaveBeenCalledOnce();
    expect(upsertPreferencesMock).toHaveBeenCalledWith(USER_ID, DEFAULT_PREFS);
  });

  it("logs error on failure but does not throw", async () => {
    upsertPreferencesMock.mockResolvedValue({ error: new Error("fail") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        pushPreferencesToCloud(USER_ID, DEFAULT_PREFS)
      ).resolves.toBeUndefined();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
