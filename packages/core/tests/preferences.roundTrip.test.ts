import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Preferences, Problem, DataReset } from "../../../src/types";

vi.mock("../../../src/utils/supabaseData", () => ({
  fetchProblems: vi.fn(),
  fetchProblemTombstones: vi.fn(),
  upsertProblemTombstone: vi.fn(),
  upsertProblemTombstones: vi.fn(),
  fetchDataReset: vi.fn(),
  upsertDataReset: vi.fn(),
  fetchReviewLog: vi.fn(),
  fetchReviewEvents: vi.fn(),
  fetchPreferences: vi.fn(),
  upsertProblems: vi.fn(),
  deleteProblems: vi.fn(),
  upsertPreferences: vi.fn(),
  upsertProblem: vi.fn(),
  deleteProblem: vi.fn(),
  logReview: vi.fn(),
  replaceReviewLog: vi.fn(),
  batchInsertReviewLogs: vi.fn(),
  deleteAllUserProblems: vi.fn(),
  deleteAllUserReviewLog: vi.fn(),
}));

import {
  fetchProblems,
  fetchProblemTombstones,
  upsertProblemTombstones,
  fetchDataReset,
  upsertDataReset,
  fetchReviewLog,
  fetchReviewEvents,
  fetchPreferences,
  upsertProblems,
  deleteProblems,
  upsertPreferences,
  batchInsertReviewLogs,
  deleteAllUserProblems,
  deleteAllUserReviewLog,
} from "../../../src/utils/supabaseData";
import { syncOnSignIn } from "../../../src/utils/sync";

const mockFetchProblems = fetchProblems as ReturnType<typeof vi.fn>;
const mockFetchProblemTombstones = fetchProblemTombstones as ReturnType<typeof vi.fn>;
const mockUpsertProblemTombstones = upsertProblemTombstones as ReturnType<typeof vi.fn>;
const mockFetchDataReset = fetchDataReset as ReturnType<typeof vi.fn>;
const mockUpsertDataReset = upsertDataReset as ReturnType<typeof vi.fn>;
const mockFetchReviewLog = fetchReviewLog as ReturnType<typeof vi.fn>;
const mockFetchReviewEvents = fetchReviewEvents as ReturnType<typeof vi.fn>;
const mockFetchPreferences = fetchPreferences as ReturnType<typeof vi.fn>;
const mockUpsertProblems = upsertProblems as ReturnType<typeof vi.fn>;
const mockDeleteProblems = deleteProblems as ReturnType<typeof vi.fn>;
const mockUpsertPreferences = upsertPreferences as ReturnType<typeof vi.fn>;
const mockBatchInsertReviewLogs = batchInsertReviewLogs as ReturnType<typeof vi.fn>;
const mockDeleteAllUserProblems = deleteAllUserProblems as ReturnType<typeof vi.fn>;
const mockDeleteAllUserReviewLog = deleteAllUserReviewLog as ReturnType<typeof vi.fn>;

const USER_ID = "user-prefs";

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "prob-1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-03-01",
    lastReviewed: null,
    nextReviewDate: "2026-03-02",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Sensible defaults: no cloud data, no errors
  mockFetchProblems.mockResolvedValue({ data: [], error: null });
  mockFetchProblemTombstones.mockResolvedValue({ data: [], error: null });
  mockFetchDataReset.mockResolvedValue({ data: null, error: null });
  mockFetchReviewLog.mockResolvedValue({ data: [], error: null });
  mockFetchReviewEvents.mockResolvedValue({ data: [], error: null });
  mockFetchPreferences.mockResolvedValue({ data: null, error: null });
  mockUpsertProblems.mockResolvedValue({ data: [], error: null });
  mockDeleteProblems.mockResolvedValue({ error: null });
  mockUpsertProblemTombstones.mockResolvedValue({ error: null });
  mockUpsertDataReset.mockResolvedValue({ error: null });
  mockUpsertPreferences.mockResolvedValue({ data: null, error: null });
  mockBatchInsertReviewLogs.mockResolvedValue({ error: null });
  mockDeleteAllUserProblems.mockResolvedValue({ error: null });
  mockDeleteAllUserReviewLog.mockResolvedValue({ error: null });
});

describe("preferences round-trip on sign-in (F-6)", () => {
  // Scenario: the user changed preferences while SIGNED OUT (localStorage was
  // updated after the last cloud write), then signs back in. Web's Preferences
  // has no updatedAt field yet, so "local is newer" is expressed purely by the
  // fixture setup below: localPrefs is the recent signed-out edit
  // (dailyReviewGoal bumped to 8), cloudPrefs is the stale snapshot from the
  // previous session. Desired (canonical) behavior: newest wins, so the local
  // signed-out change must survive sync. Web today unconditionally takes cloud
  // prefs whenever they exist (sync.ts ~327-328), clobbering the local edit.
  // FIXED-BY: Phase 5 (F-6 newest-wins via preferences updatedAt)
  it.fails("keeps a local signed-out preferences change over an older cloud snapshot", async () => {
    const staleCloudPrefs: Preferences = {
      dailyReviewGoal: 5,
      hidePatternsDuringReview: false,
      enabledExtraPatterns: [],
    };
    const newerLocalPrefs: Preferences = {
      dailyReviewGoal: 8,
      hidePatternsDuringReview: true,
      enabledExtraPatterns: ["Sliding Window"],
    };
    mockFetchPreferences.mockResolvedValue({ data: staleCloudPrefs, error: null });

    const result = await syncOnSignIn(USER_ID, [], [], [], newerLocalPrefs);

    // The persisted preferences object must be the newer local edit.
    expect(result.preferences).toEqual(newerLocalPrefs);
  });

  it("uses cloud preferences when cloud is genuinely newer (control)", async () => {
    // Here the cloud snapshot IS the most recent write (e.g. edited on another
    // device after this device last synced) — cloud winning is correct.
    const staleLocalPrefs: Preferences = {
      dailyReviewGoal: 5,
      hidePatternsDuringReview: false,
      enabledExtraPatterns: [],
    };
    const newerCloudPrefs: Preferences = {
      dailyReviewGoal: 12,
      hidePatternsDuringReview: true,
      enabledExtraPatterns: ["Monotonic Stack"],
    };
    mockFetchPreferences.mockResolvedValue({ data: newerCloudPrefs, error: null });

    const result = await syncOnSignIn(USER_ID, [], [], [], staleLocalPrefs);

    expect(result.preferences).toEqual(newerCloudPrefs);
    expect(result.hasChanges).toBe(true);
    // Cloud already had prefs — nothing should be pushed back.
    expect(mockUpsertPreferences).not.toHaveBeenCalled();
  });

  it("pushes local preferences to cloud on first sign-in (no cloud prefs)", async () => {
    const localPrefs: Preferences = {
      dailyReviewGoal: 7,
      hidePatternsDuringReview: false,
      enabledExtraPatterns: [],
    };
    mockFetchPreferences.mockResolvedValue({ data: null, error: null });

    const result = await syncOnSignIn(USER_ID, [], [], [], localPrefs);

    expect(result.preferences).toEqual(localPrefs);
    expect(mockUpsertPreferences).toHaveBeenCalledWith(USER_ID, localPrefs);
  });
});

describe("reset ordering during local-reset-wins sync", () => {
  const defaultPrefs: Preferences = {
    dailyReviewGoal: 5,
    hidePatternsDuringReview: false,
    enabledExtraPatterns: [],
  };

  it("completes deleteAllUserProblems before re-upserting surviving problems", async () => {
    const callOrder: string[] = [];
    const localReset: DataReset = { resetAt: "2026-03-10T12:00:00.000Z" };
    const olderCloudReset: DataReset = { resetAt: "2026-03-09T12:00:00.000Z" };
    // A local problem created after the reset — it survives and must be
    // re-uploaded, but only after the cloud wipe has finished.
    const survivor = makeProblem({ id: "survivor-1", updatedAt: "2026-03-11T12:00:00.000Z" });
    const staleCloudProblem = makeProblem({ id: "stale-cloud-1", updatedAt: "2026-03-08T12:00:00.000Z" });

    mockFetchProblems.mockResolvedValue({ data: [staleCloudProblem], error: null });
    mockFetchDataReset.mockResolvedValue({ data: olderCloudReset, error: null });
    mockUpsertDataReset.mockImplementation(async () => {
      callOrder.push("upsertDataReset:done");
      return { error: null };
    });
    mockDeleteAllUserProblems.mockImplementation(async () => {
      // Simulate network latency so a missing await would reorder the calls.
      await new Promise((resolve) => setTimeout(resolve, 5));
      callOrder.push("deleteAllUserProblems:done");
      return { error: null };
    });
    mockDeleteAllUserReviewLog.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      callOrder.push("deleteAllUserReviewLog:done");
      return { error: null };
    });
    mockUpsertProblems.mockImplementation(async () => {
      callOrder.push("upsertProblems:start");
      return { data: [], error: null };
    });

    const result = await syncOnSignIn(USER_ID, [survivor], [], [], defaultPrefs, [], localReset);

    expect(result.dataReset).toEqual(localReset);
    expect(result.problems).toEqual([survivor]);

    // The survivor must have been re-upserted...
    const upsertIndex = callOrder.indexOf("upsertProblems:start");
    expect(upsertIndex).toBeGreaterThan(-1);
    // ...strictly after the cloud wipe completed (delete-before-upsert),
    // otherwise the wipe could race the re-upload and destroy the survivor.
    const deleteIndex = callOrder.indexOf("deleteAllUserProblems:done");
    expect(deleteIndex).toBeGreaterThan(-1);
    expect(deleteIndex).toBeLessThan(upsertIndex);
    // And the durable reset marker must land before the destructive wipe.
    expect(callOrder.indexOf("upsertDataReset:done")).toBeLessThan(deleteIndex);
  });
});
