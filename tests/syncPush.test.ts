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
  logReview: vi.fn(),
  upsertPreferences: vi.fn(),
  fetchProblemReviewHistory: vi.fn(),
  submitFeedback: vi.fn(),
}));

import {
  upsertProblem,
  upsertProblems,
  deleteProblem,
  logReview,
  upsertPreferences,
} from "../src/utils/supabaseData";
import {
  pushProblemToCloud,
  pushProblemsToCloud,
  deleteProblemFromCloud,
  pushReviewToCloud,
  pushPreferencesToCloud,
} from "../src/utils/sync";

const upsertProblemMock = upsertProblem as ReturnType<typeof vi.fn>;
const upsertProblemsMock = upsertProblems as ReturnType<typeof vi.fn>;
const deleteProblemMock = deleteProblem as ReturnType<typeof vi.fn>;
const logReviewMock = logReview as ReturnType<typeof vi.fn>;
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
const DEFAULT_PREFS: Preferences = { dailyReviewGoal: 5, hidePatternsDuringReview: false };

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
  it("calls deleteProblem with problemId", async () => {
    deleteProblemMock.mockResolvedValue({ error: null });
    await deleteProblemFromCloud("problem-42");
    expect(deleteProblemMock).toHaveBeenCalledOnce();
    expect(deleteProblemMock).toHaveBeenCalledWith("problem-42");
  });

  it("logs error on failure but does not throw", async () => {
    deleteProblemMock.mockResolvedValue({ error: new Error("fail") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(deleteProblemFromCloud("problem-42")).resolves.toBeUndefined();
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
    await pushReviewToCloud(USER_ID, "problem-1", oldConf, newConf);
    expect(logReviewMock).toHaveBeenCalledOnce();
    expect(logReviewMock).toHaveBeenCalledWith(USER_ID, "problem-1", oldConf, newConf);
  });

  it("logs error on failure but does not throw", async () => {
    logReviewMock.mockResolvedValue({ error: new Error("fail") });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        pushReviewToCloud(USER_ID, "problem-1", 2, 4)
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
