import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Problem, ReviewLogEntry, Preferences } from "../src/types";

vi.mock("../src/utils/supabaseData", () => ({
  fetchProblems: vi.fn(),
  fetchReviewLog: vi.fn(),
  fetchPreferences: vi.fn(),
  upsertProblems: vi.fn(),
  deleteProblems: vi.fn(),
  upsertPreferences: vi.fn(),
  upsertProblem: vi.fn(),
  deleteProblem: vi.fn(),
  logReview: vi.fn(),
  fetchProblemReviewHistory: vi.fn(),
  submitFeedback: vi.fn(),
}));

import {
  fetchProblems,
  fetchReviewLog,
  fetchPreferences,
  upsertProblems,
  deleteProblems,
  upsertPreferences,
} from "../src/utils/supabaseData";
import { syncOnSignIn } from "../src/utils/sync";

const mockFetchProblems = fetchProblems as ReturnType<typeof vi.fn>;
const mockFetchReviewLog = fetchReviewLog as ReturnType<typeof vi.fn>;
const mockFetchPreferences = fetchPreferences as ReturnType<typeof vi.fn>;
const mockUpsertProblems = upsertProblems as ReturnType<typeof vi.fn>;
const mockDeleteProblems = deleteProblems as ReturnType<typeof vi.fn>;
const mockUpsertPreferences = upsertPreferences as ReturnType<typeof vi.fn>;

const USER_ID = "user-abc";

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

function makeEntry(date: string): ReviewLogEntry {
  return { date };
}

const defaultPrefs: Preferences = { dailyReviewGoal: 5, hidePatternsDuringReview: false };
const cloudPrefs: Preferences = { dailyReviewGoal: 10, hidePatternsDuringReview: false };

beforeEach(() => {
  vi.clearAllMocks();

  // Sensible defaults: no cloud data, no errors
  mockFetchProblems.mockResolvedValue({ data: [], error: null });
  mockFetchReviewLog.mockResolvedValue({ data: [], error: null });
  mockFetchPreferences.mockResolvedValue({ data: null, error: null });
  mockUpsertProblems.mockResolvedValue({ data: [], error: null });
  mockDeleteProblems.mockResolvedValue({ error: null });
  mockUpsertPreferences.mockResolvedValue({ data: null, error: null });
});

describe("syncOnSignIn", () => {
  describe("fetch failures", () => {
    it("returns local data unchanged when fetchProblems fails", async () => {
      const localProblem = makeProblem({ id: "local-1" });
      const localLog = [makeEntry("2025-01-01")];
      const fetchError = new Error("Network failure");

      mockFetchProblems.mockResolvedValue({ data: null, error: fetchError });

      const result = await syncOnSignIn(USER_ID, [localProblem], localLog, defaultPrefs);

      expect(result.problems).toEqual([localProblem]);
      expect(result.reviewLog).toEqual(localLog);
      expect(result.preferences).toEqual(defaultPrefs);
      expect(result.error).toBe(fetchError);

      // Should not push anything since we bailed out early
      expect(mockUpsertProblems).not.toHaveBeenCalled();
    });

    it("treats fetchReviewLog error gracefully (uses empty array)", async () => {
      const localProblem = makeProblem({ id: "local-1" });
      const localLog = [makeEntry("2025-01-01")];

      mockFetchProblems.mockResolvedValue({ data: [], error: null });
      mockFetchReviewLog.mockResolvedValue({ data: null, error: new Error("log fetch failed") });

      const result = await syncOnSignIn(USER_ID, [localProblem], localLog, defaultPrefs);

      // fetchReviewLog error is non-fatal — cloudLog falls back to []
      expect(result.error).toBeNull();
      // mergedLog = mergeReviewLog(localLog, []) = localLog entries
      expect(result.reviewLog).toHaveLength(1);
      expect(result.reviewLog[0].date).toBe("2025-01-01");
    });

    it("treats fetchPreferences error gracefully (uses local prefs)", async () => {
      const localProblem = makeProblem({ id: "local-1" });

      mockFetchPreferences.mockResolvedValue({ data: null, error: new Error("prefs fetch failed") });

      const result = await syncOnSignIn(USER_ID, [localProblem], [], defaultPrefs);

      // cloudPrefs is null → use local, push to cloud
      expect(result.error).toBeNull();
      expect(result.preferences).toEqual(defaultPrefs);
      expect(mockUpsertPreferences).toHaveBeenCalledWith(USER_ID, defaultPrefs);
    });
  });

  describe("merge behavior", () => {
    it("merges local-only and cloud-only problems", async () => {
      const localProblem = makeProblem({ id: "local-1", leetcodeNumber: 1 });
      const cloudProblem = makeProblem({ id: "cloud-1", leetcodeNumber: 2, title: "Add Two Numbers" });

      mockFetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

      const result = await syncOnSignIn(USER_ID, [localProblem], [], defaultPrefs);

      expect(result.problems).toHaveLength(2);
      const ids = result.problems.map((p) => p.id);
      expect(ids).toContain("local-1");
      expect(ids).toContain("cloud-1");
    });

    it("resolves conflicts by updatedAt timestamp — cloud wins when newer", async () => {
      const sharedId = "shared-1";
      const localProblem = makeProblem({
        id: sharedId,
        leetcodeNumber: 1,
        notes: "local notes",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
      const cloudProblem = makeProblem({
        id: sharedId,
        leetcodeNumber: 1,
        notes: "cloud notes",
        updatedAt: "2025-06-01T00:00:00.000Z",
      });

      mockFetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

      const result = await syncOnSignIn(USER_ID, [localProblem], [], defaultPrefs);

      expect(result.problems).toHaveLength(1);
      expect(result.problems[0].notes).toBe("cloud notes");
    });

    it("resolves conflicts by updatedAt timestamp — local wins when newer", async () => {
      const sharedId = "shared-1";
      const localProblem = makeProblem({
        id: sharedId,
        leetcodeNumber: 1,
        notes: "local notes",
        updatedAt: "2025-06-01T00:00:00.000Z",
      });
      const cloudProblem = makeProblem({
        id: sharedId,
        leetcodeNumber: 1,
        notes: "cloud notes",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });

      mockFetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

      const result = await syncOnSignIn(USER_ID, [localProblem], [], defaultPrefs);

      expect(result.problems).toHaveLength(1);
      expect(result.problems[0].notes).toBe("local notes");
    });

    it("deduplicates merged problems by leetcodeNumber", async () => {
      // Two separate IDs referencing the same leetcodeNumber
      const localProblem = makeProblem({
        id: "local-dup",
        leetcodeNumber: 1,
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
      const cloudProblem = makeProblem({
        id: "cloud-dup",
        leetcodeNumber: 1,
        updatedAt: "2025-01-02T00:00:00.000Z",
      });

      mockFetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

      const result = await syncOnSignIn(USER_ID, [localProblem], [], defaultPrefs);

      // Only one should survive deduplication
      expect(result.problems).toHaveLength(1);
      // deleteProblems should have been called to remove the duplicate from the cloud
      expect(mockDeleteProblems).toHaveBeenCalledOnce();
    });

    it("merges review logs by date deduplication", async () => {
      const localLog = [makeEntry("2025-01-01"), makeEntry("2025-01-02")];
      const cloudLog = [makeEntry("2025-01-02"), makeEntry("2025-01-03")];

      mockFetchReviewLog.mockResolvedValue({ data: cloudLog, error: null });

      const result = await syncOnSignIn(USER_ID, [], localLog, defaultPrefs);

      expect(result.reviewLog).toHaveLength(3);
      const dates = result.reviewLog.map((e) => e.date);
      expect(dates).toContain("2025-01-01");
      expect(dates).toContain("2025-01-02");
      expect(dates).toContain("2025-01-03");
    });
  });

  describe("preferences merge", () => {
    it("uses cloud preferences when they exist", async () => {
      mockFetchPreferences.mockResolvedValue({ data: cloudPrefs, error: null });

      const result = await syncOnSignIn(USER_ID, [], [], defaultPrefs);

      expect(result.preferences).toEqual(cloudPrefs);
      expect(result.preferences.dailyReviewGoal).toBe(10);
      // Should NOT push local prefs when cloud already has them
      expect(mockUpsertPreferences).not.toHaveBeenCalled();
    });

    it("uses local preferences and pushes to cloud on first sign-in", async () => {
      // No cloud prefs (first sign-in scenario)
      mockFetchPreferences.mockResolvedValue({ data: null, error: null });

      const result = await syncOnSignIn(USER_ID, [], [], defaultPrefs);

      expect(result.preferences).toEqual(defaultPrefs);
      expect(mockUpsertPreferences).toHaveBeenCalledOnce();
      expect(mockUpsertPreferences).toHaveBeenCalledWith(USER_ID, defaultPrefs);
    });
  });

  describe("push behavior", () => {
    it("pushes local-only problems to cloud", async () => {
      const localProblem = makeProblem({ id: "local-only", leetcodeNumber: 1 });
      // Cloud has no problems
      mockFetchProblems.mockResolvedValue({ data: [], error: null });

      await syncOnSignIn(USER_ID, [localProblem], [], defaultPrefs);

      expect(mockUpsertProblems).toHaveBeenCalledOnce();
      const [calledUserId, calledProblems] = mockUpsertProblems.mock.calls[0];
      expect(calledUserId).toBe(USER_ID);
      expect(calledProblems).toHaveLength(1);
      expect(calledProblems[0].id).toBe("local-only");
    });

    it("pushes local-wins problems to cloud", async () => {
      const sharedId = "shared-1";
      const localProblem = makeProblem({
        id: sharedId,
        leetcodeNumber: 1,
        notes: "local wins",
        updatedAt: "2025-06-01T00:00:00.000Z",
      });
      const cloudProblem = makeProblem({
        id: sharedId,
        leetcodeNumber: 1,
        notes: "cloud older",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });

      mockFetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

      await syncOnSignIn(USER_ID, [localProblem], [], defaultPrefs);

      expect(mockUpsertProblems).toHaveBeenCalledOnce();
      const [, calledProblems] = mockUpsertProblems.mock.calls[0];
      expect(calledProblems[0].notes).toBe("local wins");
    });

    it("does not push cloud-only problems (not in local) back to cloud", async () => {
      // A problem that exists only in the cloud — should not be pushed back
      const cloudOnlyProblem = makeProblem({
        id: "cloud-only-1",
        leetcodeNumber: 99,
        updatedAt: "2025-06-01T00:00:00.000Z",
      });

      mockFetchProblems.mockResolvedValue({ data: [cloudOnlyProblem], error: null });

      // No local problems at all
      await syncOnSignIn(USER_ID, [], [], defaultPrefs);

      // Cloud-only problems are not in localIds, and are in cloudIds — no push
      expect(mockUpsertProblems).not.toHaveBeenCalled();
    });

    it("deletes duplicate problem IDs from cloud", async () => {
      // Two cloud problems with the same leetcodeNumber — should deduplicate
      const cloudA = makeProblem({
        id: "cloud-a",
        leetcodeNumber: 42,
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
      const cloudB = makeProblem({
        id: "cloud-b",
        leetcodeNumber: 42,
        updatedAt: "2025-06-01T00:00:00.000Z",
      });

      mockFetchProblems.mockResolvedValue({ data: [cloudA, cloudB], error: null });

      const result = await syncOnSignIn(USER_ID, [], [], defaultPrefs);

      expect(result.problems).toHaveLength(1);
      expect(mockDeleteProblems).toHaveBeenCalledOnce();
      const [deletedIds] = mockDeleteProblems.mock.calls[0];
      // The older one (cloud-a) should be the removed duplicate
      expect(deletedIds).toContain("cloud-a");
    });

    it("does not call upsertProblems when nothing to push", async () => {
      // Only cloud problems exist — no local problems to push
      const cloudProblem = makeProblem({
        id: "cloud-only-1",
        leetcodeNumber: 1,
        updatedAt: "2025-12-31T00:00:00.000Z",
      });

      mockFetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

      // Empty local list — nothing for the push loop to act on
      await syncOnSignIn(USER_ID, [], [], defaultPrefs);

      expect(mockUpsertProblems).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns local data and error on unexpected exception", async () => {
      const localProblem = makeProblem({ id: "local-1" });
      const localLog = [makeEntry("2025-01-01")];
      const unexpected = new Error("something blew up");

      // Make Promise.all itself throw by rejecting fetchProblems in a way that bypasses the error check
      mockFetchProblems.mockRejectedValue(unexpected);

      const result = await syncOnSignIn(USER_ID, [localProblem], localLog, defaultPrefs);

      expect(result.problems).toEqual([localProblem]);
      expect(result.reviewLog).toEqual(localLog);
      expect(result.preferences).toEqual(defaultPrefs);
      expect(result.error).toBe(unexpected);
    });
  });
});
