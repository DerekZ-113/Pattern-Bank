// Consolidated performFullSync suite: union of web tests/syncOnSignIn.test.ts
// and the syncOnSignIn half of mobile src/utils/__tests__/sync.test.ts,
// deduplicated and rewritten against core with an injected mock cloud +
// in-memory StorageAdapter (no module mocking, no localStorage).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { REVIEW_EVENTS_PRUNED_BEFORE_KEY } from "../../src/constants";
import { addDays, todayStr, utcToLocalDateStr } from "../../src/dateHelpers";
import {
  performFullSync,
  type FullSyncDeps,
  type FullSyncResult,
  type FullSyncSuccess,
} from "../../src/sync/fullSync";
import type { CorePreferences, DataReset, ProblemTombstone } from "../../src/types";
import {
  MemoryStorage,
  createMockCloud,
  makeEntry,
  makeEvent,
  makePreferences,
  makeProblem,
  type MockCloud,
} from "../helpers/syncTestUtils";

const USER_ID = "user-abc";

let cloud: MockCloud;
let storage: MemoryStorage;
let warn: ReturnType<typeof vi.fn<(message: string, data?: unknown) => void>>;

beforeEach(() => {
  cloud = createMockCloud();
  storage = new MemoryStorage();
  warn = vi.fn<(message: string, data?: unknown) => void>();
});

function deps(overrides: Partial<FullSyncDeps<CorePreferences>> = {}): FullSyncDeps<CorePreferences> {
  return {
    userId: USER_ID,
    cloud,
    storage,
    local: {
      problems: [],
      reviewLog: [],
      reviewEvents: [],
      preferences: makePreferences(),
      problemTombstones: [],
      dataReset: null,
    },
    eventRetentionDays: null,
    hooks: { warn },
    ...overrides,
  };
}

function local(overrides: Partial<FullSyncDeps<CorePreferences>["local"]> = {}) {
  return {
    problems: [],
    reviewLog: [],
    reviewEvents: [],
    preferences: makePreferences(),
    problemTombstones: [],
    dataReset: null,
    ...overrides,
  };
}

function expectSuccess(result: FullSyncResult<CorePreferences>): FullSyncSuccess<CorePreferences> {
  expect(result.status).toBe("success");
  return result as FullSyncSuccess<CorePreferences>;
}

describe("performFullSync — fetch failures (fail-closed, F-5)", () => {
  it("aborts with an error when fetchProblems fails, pushing nothing", async () => {
    const fetchError = new Error("Network failure");
    cloud.fetchProblems.mockResolvedValue({ data: null, error: fetchError });

    const result = await performFullSync(deps({ local: local({ problems: [makeProblem({ id: "local-1" })] }) }));

    expect(result).toEqual({ status: "error", error: fetchError });
    expect(warn).toHaveBeenCalledWith("Sync: failed to fetch problems", fetchError);
    expect(cloud.upsertProblems).not.toHaveBeenCalled();
    expect(storage.writeCount).toBe(0);
  });

  it("treats tombstone fetch failure as critical to avoid resurrecting deleted rows", async () => {
    const fetchError = new Error("tombstone fetch failed");
    cloud.fetchProblemTombstones.mockResolvedValue({ data: null, error: fetchError });

    const result = await performFullSync(deps({ local: local({ problems: [makeProblem({ id: "local-1" })] }) }));

    expect(result).toEqual({ status: "error", error: fetchError });
    expect(cloud.upsertProblems).not.toHaveBeenCalled();
  });

  it("treats data reset fetch failure as critical", async () => {
    const fetchError = new Error("reset fetch failed");
    cloud.fetchDataReset.mockResolvedValue({ data: null, error: fetchError });

    const result = await performFullSync(deps());

    expect(result).toEqual({ status: "error", error: fetchError });
    expect(warn).toHaveBeenCalledWith("Sync: failed to fetch data reset marker", fetchError);
  });

  it("treats fetchReviewLog error gracefully (uses empty array)", async () => {
    cloud.fetchReviewLog.mockResolvedValue({ data: null, error: new Error("log fetch failed") });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ reviewLog: [makeEntry("2025-01-01")] }) })),
    );

    expect(result.reviewLog).toEqual([makeEntry("2025-01-01")]);
  });

  it("treats fetchPreferences error gracefully without overwriting cloud prefs", async () => {
    const fetchError = new Error("prefs fetch failed");
    cloud.fetchPreferences.mockResolvedValue({ data: null, error: fetchError });
    const localPrefs = makePreferences({ dailyReviewGoal: 9 });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ preferences: localPrefs }) })),
    );

    expect(result.preferences).toEqual(localPrefs);
    expect(cloud.upsertPreferences).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("Sync: failed to fetch preferences", fetchError);
  });
});

describe("performFullSync — merge behavior", () => {
  it("merges local-only and cloud-only problems", async () => {
    const localProblem = makeProblem({ id: "local-1", leetcodeNumber: 1 });
    const cloudProblem = makeProblem({ id: "cloud-1", leetcodeNumber: 2, title: "Add Two Numbers" });
    cloud.fetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ problems: [localProblem] }) })),
    );

    expect(result.problems.map((p) => p.id).sort()).toEqual(["cloud-1", "local-1"]);
  });

  it("resolves conflicts by updatedAt — cloud wins when newer", async () => {
    const localProblem = makeProblem({ id: "shared-1", notes: "local notes", updatedAt: "2025-01-01T00:00:00.000Z" });
    const cloudProblem = makeProblem({ id: "shared-1", notes: "cloud notes", updatedAt: "2025-06-01T00:00:00.000Z" });
    cloud.fetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ problems: [localProblem] }) })),
    );

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].notes).toBe("cloud notes");
  });

  it("resolves conflicts by updatedAt — local wins when newer", async () => {
    const localProblem = makeProblem({ id: "shared-1", notes: "local notes", updatedAt: "2025-06-01T00:00:00.000Z" });
    const cloudProblem = makeProblem({ id: "shared-1", notes: "cloud notes", updatedAt: "2025-01-01T00:00:00.000Z" });
    cloud.fetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ problems: [localProblem] }) })),
    );

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].notes).toBe("local notes");
  });

  it("deduplicates merged problems by leetcodeNumber and deletes the loser from the cloud", async () => {
    const localProblem = makeProblem({ id: "local-dup", leetcodeNumber: 1, updatedAt: "2025-01-01T00:00:00.000Z" });
    const cloudProblem = makeProblem({ id: "cloud-dup", leetcodeNumber: 1, updatedAt: "2025-01-02T00:00:00.000Z" });
    cloud.fetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ problems: [localProblem] }) })),
    );

    expect(result.problems).toHaveLength(1);
    expect(cloud.deleteProblems).toHaveBeenCalledOnce();
    expect(cloud.deleteProblems).toHaveBeenCalledWith(["local-dup"]);
  });

  it("merges review logs by date deduplication", async () => {
    cloud.fetchReviewLog.mockResolvedValue({
      data: [makeEntry("2025-01-02"), makeEntry("2025-01-03")],
      error: null,
    });

    const result = expectSuccess(
      await performFullSync(
        deps({ local: local({ reviewLog: [makeEntry("2025-01-01"), makeEntry("2025-01-02")] }) }),
      ),
    );

    expect(result.reviewLog.map((e) => e.date).sort()).toEqual(["2025-01-01", "2025-01-02", "2025-01-03"]);
  });
});

describe("performFullSync — tombstones", () => {
  const localTombstone: ProblemTombstone = { problemId: "deleted-1", deletedAt: "2026-03-10T12:00:00.000Z" };

  it("does not resurrect a cloud problem when a local tombstone exists", async () => {
    const deletedCloudProblem = makeProblem({ id: "deleted-1", updatedAt: "2026-03-11T12:00:00.000Z" });
    cloud.fetchProblems.mockResolvedValue({ data: [deletedCloudProblem], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ problemTombstones: [localTombstone] }) })),
    );

    expect(result.problems).toEqual([]);
    expect(result.problemTombstones).toEqual([localTombstone]);
    expect(cloud.upsertProblemTombstones).toHaveBeenCalledWith(USER_ID, [localTombstone]);
    expect(cloud.deleteProblems).toHaveBeenCalledWith(["deleted-1"]);
    expect(cloud.upsertProblems).not.toHaveBeenCalled();
  });

  it("applies cloud tombstones to local problems before merging", async () => {
    const cloudTombstone = { problemId: "local-1", deletedAt: "2026-03-12T12:00:00.000Z" };
    cloud.fetchProblemTombstones.mockResolvedValue({ data: [cloudTombstone], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ problems: [makeProblem({ id: "local-1" })] }) })),
    );

    expect(result.problems).toEqual([]);
    expect(result.problemTombstones).toEqual([cloudTombstone]);
    expect(result.hasChanges).toBe(true);
  });

  it("uses the newest tombstone when local and cloud both have one for the same problem", async () => {
    const olderLocal = { problemId: "p1", deletedAt: "2026-03-10T12:00:00.000Z" };
    const newerCloud = { problemId: "p1", deletedAt: "2026-03-11T12:00:00.000Z" };
    cloud.fetchProblemTombstones.mockResolvedValue({ data: [newerCloud], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ problemTombstones: [olderLocal] }) })),
    );

    expect(result.problemTombstones).toEqual([newerCloud]);
  });
});

describe("performFullSync — data resets", () => {
  const localReset: DataReset = { resetAt: "2026-03-10T12:00:00.000Z" };

  it("applies a newer cloud reset marker before merging local data", async () => {
    const cloudReset = { resetAt: "2026-03-12T12:00:00.000Z" };
    cloud.fetchDataReset.mockResolvedValue({ data: cloudReset, error: null });

    const result = expectSuccess(
      await performFullSync(
        deps({
          local: local({
            problems: [makeProblem({ id: "local-1" })],
            reviewLog: [makeEntry("2026-03-10")],
            reviewEvents: [makeEvent({ problemId: "local-1" })],
          }),
        }),
      ),
    );

    expect(result.problems).toEqual([]);
    expect(result.reviewLog).toEqual([]);
    expect(result.reviewEvents).toEqual([]);
    expect(result.dataReset).toEqual(cloudReset);
    expect(result.hasChanges).toBe(true);
  });

  it("does not resurrect stale cloud problems older than a newer cloud reset marker", async () => {
    const staleCloudProblem = makeProblem({ id: "stale-cloud-1", updatedAt: "2026-03-10T12:00:00.000Z" });
    const cloudReset = { resetAt: "2026-03-12T12:00:00.000Z" };
    cloud.fetchProblems.mockResolvedValue({ data: [staleCloudProblem], error: null });
    cloud.fetchDataReset.mockResolvedValue({ data: cloudReset, error: null });

    const result = expectSuccess(await performFullSync(deps()));

    expect(result.problems).toEqual([]);
    expect(cloud.deleteProblems).toHaveBeenCalledWith(["stale-cloud-1"]);
  });

  it("does not resurrect stale cloud problems when reset markers already match", async () => {
    const staleCloudProblem = makeProblem({ id: "stale-cloud-1", updatedAt: "2026-03-10T12:00:00.000Z" });
    const matchingReset = { resetAt: "2026-03-12T12:00:00.000Z" };
    cloud.fetchProblems.mockResolvedValue({ data: [staleCloudProblem], error: null });
    cloud.fetchDataReset.mockResolvedValue({ data: matchingReset, error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ dataReset: matchingReset }) })),
    );

    expect(result.problems).toEqual([]);
    expect(result.dataReset).toEqual(matchingReset);
    expect(cloud.deleteProblems).toHaveBeenCalledWith(["stale-cloud-1"]);
    expect(cloud.upsertProblems).not.toHaveBeenCalled();
  });

  it("keeps cloud problems created after matching reset markers", async () => {
    const freshCloudProblem = makeProblem({ id: "fresh-cloud-1", updatedAt: "2026-03-13T12:00:00.000Z" });
    const matchingReset = { resetAt: "2026-03-12T12:00:00.000Z" };
    cloud.fetchProblems.mockResolvedValue({ data: [freshCloudProblem], error: null });
    cloud.fetchDataReset.mockResolvedValue({ data: matchingReset, error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ dataReset: matchingReset }) })),
    );

    expect(result.problems).toEqual([freshCloudProblem]);
    expect(cloud.deleteProblems).not.toHaveBeenCalled();
  });

  it("ignores tombstones older than the active reset marker", async () => {
    const restoredProblem = makeProblem({ id: "restored-1", updatedAt: "2026-03-13T12:00:00.000Z" });
    const matchingReset = { resetAt: "2026-03-12T12:00:00.000Z" };
    const oldCloudTombstone = { problemId: "restored-1", deletedAt: "2026-03-11T12:00:00.000Z" };
    cloud.fetchDataReset.mockResolvedValue({ data: matchingReset, error: null });
    cloud.fetchProblemTombstones.mockResolvedValue({ data: [oldCloudTombstone], error: null });

    const result = expectSuccess(
      await performFullSync(
        deps({ local: local({ problems: [restoredProblem], dataReset: matchingReset }) }),
      ),
    );

    expect(result.problems).toEqual([restoredProblem]);
    expect(result.problemTombstones).toEqual([]);
  });

  it("applies tombstones newer than the active reset marker", async () => {
    const localProblem = makeProblem({ id: "deleted-after-reset", updatedAt: "2026-03-13T12:00:00.000Z" });
    const matchingReset = { resetAt: "2026-03-12T12:00:00.000Z" };
    const newCloudTombstone = { problemId: "deleted-after-reset", deletedAt: "2026-03-13T13:00:00.000Z" };
    cloud.fetchDataReset.mockResolvedValue({ data: matchingReset, error: null });
    cloud.fetchProblemTombstones.mockResolvedValue({ data: [newCloudTombstone], error: null });

    const result = expectSuccess(
      await performFullSync(
        deps({ local: local({ problems: [localProblem], dataReset: matchingReset }) }),
      ),
    );

    expect(result.problems).toEqual([]);
    expect(result.problemTombstones).toEqual([newCloudTombstone]);
  });

  it("does not let old cloud tombstones delete a problem restored after reset", async () => {
    // Note (F-20): the restored problem must carry a post-reset updatedAt to
    // survive — local rows predating the reset are filtered like cloud rows.
    const importedProblem = makeProblem({
      id: "restored-after-reset",
      updatedAt: "2026-03-13T12:00:00.000Z",
    });
    const matchingReset = { resetAt: "2026-03-12T12:00:00.000Z" };
    const oldCloudTombstone = {
      problemId: "restored-after-reset",
      deletedAt: "2026-03-11T12:00:00.000Z",
    };
    cloud.fetchDataReset.mockResolvedValue({ data: matchingReset, error: null });
    cloud.fetchProblemTombstones.mockResolvedValue({ data: [oldCloudTombstone], error: null });

    const result = expectSuccess(
      await performFullSync(
        deps({ local: local({ problems: [importedProblem], dataReset: matchingReset }) }),
      ),
    );

    expect(result.problems).toEqual([importedProblem]);
    expect(result.problemTombstones).toEqual([]);
  });

  it("uses a newer local reset marker to suppress stale cloud data and repair cloud state", async () => {
    const olderCloudReset = { resetAt: "2026-03-09T12:00:00.000Z" };
    cloud.fetchProblems.mockResolvedValue({ data: [makeProblem({ id: "cloud-1" })], error: null });
    cloud.fetchDataReset.mockResolvedValue({ data: olderCloudReset, error: null });
    cloud.fetchReviewLog.mockResolvedValue({ data: [makeEntry("2026-03-09")], error: null });
    cloud.fetchReviewEvents.mockResolvedValue({ data: [makeEvent({ problemId: "cloud-1" })], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ dataReset: localReset }) })),
    );

    expect(result.problems).toEqual([]);
    expect(result.reviewLog).toEqual([]);
    expect(result.reviewEvents).toEqual([]);
    expect(result.dataReset).toEqual(localReset);
    expect(cloud.upsertDataReset).toHaveBeenCalledWith(USER_ID, localReset);
    expect(cloud.deleteAllUserProblems).toHaveBeenCalledWith(USER_ID);
    expect(cloud.deleteAllUserReviewLog).toHaveBeenCalledWith(USER_ID);
  });

  it("skips cloud cleanup and re-upload, returning an error, when the reset marker upsert fails", async () => {
    const resetError = new Error("reset marker failed");
    cloud.fetchProblems.mockResolvedValue({
      data: [makeProblem({ id: "cloud", updatedAt: "2026-03-09T12:00:00.000Z" })],
      error: null,
    });
    cloud.upsertDataReset.mockResolvedValue({ error: resetError });

    const result = await performFullSync(
      deps({
        local: local({
          problems: [makeProblem({ id: "local", updatedAt: "2026-03-15T12:00:00.000Z" })],
          dataReset: localReset,
        }),
      }),
    );

    expect(result).toEqual({ status: "error", error: resetError });
    expect(warn).toHaveBeenCalledWith("Sync: failed to upsert local data reset marker", resetError);
    expect(cloud.deleteAllUserProblems).not.toHaveBeenCalled();
    expect(cloud.deleteAllUserReviewLog).not.toHaveBeenCalled();
    expect(cloud.upsertProblems).not.toHaveBeenCalled();
  });

  it("completes deleteAllUserProblems before re-upserting surviving problems", async () => {
    const callOrder: string[] = [];
    const newerLocalReset: DataReset = { resetAt: "2026-03-10T12:00:00.000Z" };
    const olderCloudReset: DataReset = { resetAt: "2026-03-09T12:00:00.000Z" };
    const survivor = makeProblem({ id: "survivor-1", updatedAt: "2026-03-11T12:00:00.000Z" });
    const staleCloudProblem = makeProblem({ id: "stale-cloud-1", updatedAt: "2026-03-08T12:00:00.000Z" });

    cloud.fetchProblems.mockResolvedValue({ data: [staleCloudProblem], error: null });
    cloud.fetchDataReset.mockResolvedValue({ data: olderCloudReset, error: null });
    cloud.upsertDataReset.mockImplementation(async () => {
      callOrder.push("upsertDataReset:done");
      return { error: null };
    });
    cloud.deleteAllUserProblems.mockImplementation(async () => {
      // Simulate network latency so a missing await would reorder the calls.
      await new Promise((resolve) => setTimeout(resolve, 5));
      callOrder.push("deleteAllUserProblems:done");
      return { error: null };
    });
    cloud.deleteAllUserReviewLog.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      callOrder.push("deleteAllUserReviewLog:done");
      return { error: null };
    });
    cloud.upsertProblems.mockImplementation(async () => {
      callOrder.push("upsertProblems:start");
      return { data: [], error: null };
    });

    const result = expectSuccess(
      await performFullSync(
        deps({ local: local({ problems: [survivor], dataReset: newerLocalReset }) }),
      ),
    );

    expect(result.dataReset).toEqual(newerLocalReset);
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

describe("performFullSync — local rows predating the reset are filtered (F-20)", () => {
  const reset: DataReset = { resetAt: "2026-03-12T12:00:00.000Z" };
  const staleProblem = () => makeProblem({ id: "stale-local-1", updatedAt: "2026-03-10T12:00:00.000Z" });
  const staleEvent = () =>
    makeEvent({ problemId: "stale-local-1", date: "2026-03-08", timestamp: "2026-03-08T12:00:00.000Z" });

  it("filters stale local problems/events/log on matching reset markers (tie), pushing nothing", async () => {
    cloud.fetchDataReset.mockResolvedValue({ data: reset, error: null });

    const result = expectSuccess(
      await performFullSync(
        deps({
          local: local({
            problems: [staleProblem()],
            reviewEvents: [staleEvent()],
            reviewLog: [makeEntry("2026-03-08")],
            dataReset: reset,
          }),
        }),
      ),
    );

    expect(result.problems).toEqual([]);
    expect(result.reviewEvents).toEqual([]);
    expect(result.reviewLog).toEqual([]);
    expect(result.hasChanges).toBe(true);
    expect(cloud.upsertProblems).not.toHaveBeenCalled();
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
  });

  it("neither returns nor pushes stale local rows when the local reset wins", async () => {
    // Cloud has no reset marker at all — resetWinner is "local".
    const result = expectSuccess(
      await performFullSync(
        deps({
          local: local({
            problems: [staleProblem()],
            reviewEvents: [staleEvent()],
            reviewLog: [makeEntry("2026-03-08")],
            dataReset: reset,
          }),
        }),
      ),
    );

    expect(cloud.upsertDataReset).toHaveBeenCalledWith(USER_ID, reset);
    expect(cloud.deleteAllUserProblems).toHaveBeenCalledWith(USER_ID);
    expect(result.problems).toEqual([]);
    expect(result.reviewEvents).toEqual([]);
    expect(result.reviewLog).toEqual([]);
    expect(cloud.upsertProblems).not.toHaveBeenCalled();
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
  });

  it("keeps same-day post-reset review log entries (>= boundary) and post-reset rows", async () => {
    const resetDay = utcToLocalDateStr(reset.resetAt)!;
    const survivor = makeProblem({ id: "survivor-1", updatedAt: "2026-03-13T12:00:00.000Z" });
    cloud.fetchDataReset.mockResolvedValue({ data: reset, error: null });

    const result = expectSuccess(
      await performFullSync(
        deps({
          local: local({
            problems: [survivor],
            reviewLog: [makeEntry("2026-03-08"), makeEntry(resetDay)],
            dataReset: reset,
          }),
        }),
      ),
    );

    expect(result.problems).toEqual([survivor]);
    expect(result.reviewLog).toEqual([makeEntry(resetDay)]);
    expect(cloud.upsertProblems).toHaveBeenCalledWith(USER_ID, [survivor]);
  });
});

describe("performFullSync — review events (incl. F-7 orphan filter)", () => {
  it("does not reinsert old local events already present in cloud history", async () => {
    const event = makeEvent({ problemId: "prob-old", timestamp: "2025-01-10T12:00:00.000Z", date: "2025-01-10" });
    cloud.fetchProblems.mockResolvedValue({ data: [makeProblem({ id: "prob-old" })], error: null });
    cloud.fetchReviewEvents.mockResolvedValue({ data: [event], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ reviewEvents: [event] }) })),
    );

    expect(result.reviewEvents).toEqual([event]);
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
  });

  it("does not push local review events with a near cloud duplicate", async () => {
    const localEvent = makeEvent({ problemId: "prob-near", timestamp: "2026-03-10T12:00:00.000Z" });
    const cloudEvent = makeEvent({ problemId: "prob-near", timestamp: "2026-03-10T12:00:03.000Z" });
    cloud.fetchProblems.mockResolvedValue({ data: [makeProblem({ id: "prob-near" })], error: null });
    cloud.fetchReviewEvents.mockResolvedValue({ data: [cloudEvent], error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ reviewEvents: [localEvent] }) })),
    );

    expect(result.reviewEvents).toHaveLength(1);
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
  });

  it("still pushes true local-only review events", async () => {
    const localProblem = makeProblem({ id: "p1" });
    const localEvent = makeEvent({ problemId: "p1", timestamp: "2026-03-10T12:00:00.000Z" });

    await performFullSync(
      deps({ local: local({ problems: [localProblem], reviewEvents: [localEvent] }) }),
    );

    expect(cloud.batchInsertReviewLogs).toHaveBeenCalledWith(USER_ID, [localEvent]);
  });

  it("skips local review event backfill when cloud event fetch fails", async () => {
    const fetchError = new Error("review event fetch failed");
    cloud.fetchReviewEvents.mockResolvedValue({ data: null, error: fetchError });
    const localEvent = makeEvent({ problemId: "p1" });

    const result = expectSuccess(
      await performFullSync(
        deps({ local: local({ problems: [makeProblem({ id: "p1" })], reviewEvents: [localEvent] }) }),
      ),
    );

    expect(result.reviewEvents).toEqual([localEvent]);
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("Sync: failed to fetch review events", fetchError);
  });

  it("does not backfill local review events when their problem is missing after merge (F-7)", async () => {
    const orphanEvent = makeEvent({ problemId: "deleted-problem" });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ reviewEvents: [orphanEvent] }) })),
    );

    expect(result.reviewEvents).toEqual([]);
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
  });

  it("does not backfill legacy local review events with null problem ids (F-7)", async () => {
    const legacyEvent = makeEvent({ problemId: null as unknown as string });

    const result = expectSuccess(
      await performFullSync(
        deps({ local: local({ problems: [makeProblem({ id: "p1" })], reviewEvents: [legacyEvent] }) }),
      ),
    );

    expect(result.reviewEvents).toEqual([]);
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
  });

  it("does not backfill local review events for tombstoned problems (F-7)", async () => {
    const deletedProblem = makeProblem({ id: "p1" });
    const orphanEvent = makeEvent({ problemId: "p1" });

    const result = expectSuccess(
      await performFullSync(
        deps({
          local: local({
            problems: [deletedProblem],
            reviewEvents: [orphanEvent],
            problemTombstones: [{ problemId: "p1", deletedAt: "2026-03-16T12:00:00.000Z" }],
          }),
        }),
      ),
    );

    expect(result.problems).toEqual([]);
    expect(result.reviewEvents).toEqual([]);
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
  });

  it("excludes orphaned cloud events from the merged local set (F-7)", async () => {
    cloud.fetchReviewEvents.mockResolvedValue({
      data: [makeEvent({ problemId: "gone-from-everywhere" })],
      error: null,
    });

    const result = expectSuccess(await performFullSync(deps()));

    expect(result.reviewEvents).toEqual([]);
    expect(result.hasChanges).toBe(true); // orphan removal is a local change
  });

  it("uploads local-only problems before backfilling their review events", async () => {
    const localProblem = makeProblem({ id: "p1", updatedAt: "2026-03-14T12:00:00.000Z" });
    const localEvent = makeEvent({ problemId: "p1" });

    const result = expectSuccess(
      await performFullSync(
        deps({ local: local({ problems: [localProblem], reviewEvents: [localEvent] }) }),
      ),
    );

    expect(result.problems).toEqual([localProblem]);
    expect(cloud.upsertProblems).toHaveBeenCalledWith(USER_ID, [localProblem]);
    expect(cloud.upsertProblems.mock.invocationCallOrder[0]).toBeLessThan(
      cloud.batchInsertReviewLogs.mock.invocationCallOrder[0],
    );
  });
});

describe("performFullSync — push behavior", () => {
  it("pushes local-only problems to cloud", async () => {
    const localProblem = makeProblem({ id: "local-only", leetcodeNumber: 1 });

    await performFullSync(deps({ local: local({ problems: [localProblem] }) }));

    expect(cloud.upsertProblems).toHaveBeenCalledOnce();
    const [calledUserId, calledProblems] = cloud.upsertProblems.mock.calls[0];
    expect(calledUserId).toBe(USER_ID);
    expect(calledProblems).toEqual([localProblem]);
  });

  it("pushes local-wins problems to cloud", async () => {
    const localProblem = makeProblem({ id: "shared-1", notes: "local wins", updatedAt: "2025-06-01T00:00:00.000Z" });
    const cloudProblem = makeProblem({ id: "shared-1", notes: "cloud older", updatedAt: "2025-01-01T00:00:00.000Z" });
    cloud.fetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });

    await performFullSync(deps({ local: local({ problems: [localProblem] }) }));

    expect(cloud.upsertProblems).toHaveBeenCalledOnce();
    const [, calledProblems] = cloud.upsertProblems.mock.calls[0];
    expect(calledProblems[0].notes).toBe("local wins");
  });

  it("does not push cloud-only problems (not in local) back to cloud", async () => {
    const cloudOnlyProblem = makeProblem({ id: "cloud-only-1", leetcodeNumber: 99, updatedAt: "2025-06-01T00:00:00.000Z" });
    cloud.fetchProblems.mockResolvedValue({ data: [cloudOnlyProblem], error: null });

    await performFullSync(deps());

    expect(cloud.upsertProblems).not.toHaveBeenCalled();
  });

  it("deletes duplicate problem IDs from cloud", async () => {
    const cloudA = makeProblem({ id: "cloud-a", leetcodeNumber: 42, updatedAt: "2025-01-01T00:00:00.000Z" });
    const cloudB = makeProblem({ id: "cloud-b", leetcodeNumber: 42, updatedAt: "2025-06-01T00:00:00.000Z" });
    cloud.fetchProblems.mockResolvedValue({ data: [cloudA, cloudB], error: null });

    const result = expectSuccess(await performFullSync(deps()));

    expect(result.problems).toHaveLength(1);
    expect(cloud.deleteProblems).toHaveBeenCalledOnce();
    const [deletedIds] = cloud.deleteProblems.mock.calls[0];
    expect(deletedIds).toContain("cloud-a"); // the older duplicate
  });

  it("does not call upsertProblems when nothing to push", async () => {
    cloud.fetchProblems.mockResolvedValue({
      data: [makeProblem({ id: "cloud-only-1", updatedAt: "2025-12-31T00:00:00.000Z" })],
      error: null,
    });

    await performFullSync(deps());

    expect(cloud.upsertProblems).not.toHaveBeenCalled();
  });
});

describe("performFullSync — fail-closed cloud writes (F-5)", () => {
  it("surfaces local problem upload failures instead of reporting synced", async () => {
    const error = new Error("offline");
    cloud.upsertProblems.mockResolvedValue({ data: null, error });

    const result = await performFullSync(
      deps({ local: local({ problems: [makeProblem({ id: "p1" })] }) }),
    );

    expect(result).toEqual({ status: "error", error });
    expect(warn).toHaveBeenCalledWith("Sync: failed to push local problems", error);
  });

  it("surfaces cleanup delete failures instead of reporting synced", async () => {
    const error = new Error("delete failed");
    cloud.fetchProblems.mockResolvedValue({ data: [makeProblem({ id: "p1" })], error: null });
    cloud.deleteProblems.mockResolvedValue({ error });

    const result = await performFullSync(
      deps({
        local: local({ problemTombstones: [{ problemId: "p1", deletedAt: "2026-03-16T12:00:00.000Z" }] }),
      }),
    );

    expect(result).toEqual({ status: "error", error });
  });

  it("surfaces review backfill failures through the warn hook, never the console", async () => {
    const error = new Error("foreign key failed");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    cloud.batchInsertReviewLogs.mockResolvedValue({ error });

    try {
      const result = await performFullSync(
        deps({
          local: local({
            problems: [makeProblem({ id: "p1" })],
            reviewEvents: [makeEvent({ problemId: "p1" })],
          }),
        }),
      );

      expect(result).toEqual({ status: "error", error });
      expect(warn).toHaveBeenCalledWith("Sync: failed to backfill local review events", error);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it("a tombstone upsert failing mid-sync returns an error without poisoning local state (partial failure)", async () => {
    const error = new Error("tombstone upsert failed");
    const cloudProblem = makeProblem({ id: "deleted-1", updatedAt: "2026-03-11T12:00:00.000Z" });
    cloud.fetchProblems.mockResolvedValue({ data: [cloudProblem], error: null });
    cloud.upsertProblemTombstones.mockResolvedValue({ error });

    const result = await performFullSync(
      deps({
        local: local({
          problems: [makeProblem({ id: "local-1" })],
          reviewEvents: [makeEvent({ problemId: "local-1" })],
          problemTombstones: [{ problemId: "deleted-1", deletedAt: "2026-03-16T12:00:00.000Z" }],
        }),
      }),
    );

    // Error returned, merge aborted...
    expect(result).toEqual({ status: "error", error });
    expect(warn).toHaveBeenCalledWith("Sync: failed to upsert problem tombstones", error);
    // ...no destructive follow-up writes happened after the failed marker...
    expect(cloud.deleteProblems).not.toHaveBeenCalled();
    expect(cloud.upsertProblems).not.toHaveBeenCalled();
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
    // ...and the injected StorageAdapter saw no partial write.
    expect(storage.writeCount).toBe(0);
  });

  it("surfaces first-sign-in preference initialization failures", async () => {
    const error = new Error("prefs upsert failed");
    cloud.upsertPreferences.mockResolvedValue({ data: null, error });

    const result = await performFullSync(deps());

    expect(result).toEqual({ status: "error", error });
    expect(warn).toHaveBeenCalledWith("Sync: failed to initialize cloud preferences", error);
  });

  it("returns an error on unexpected exceptions", async () => {
    const unexpected = new Error("something blew up");
    cloud.fetchProblems.mockRejectedValue(unexpected);

    const result = await performFullSync(deps());

    expect(result).toEqual({ status: "error", error: unexpected });
    expect(warn).toHaveBeenCalledWith("Sync: unexpected error", unexpected);
  });
});

describe("performFullSync — preferences (F-6 within the full flow)", () => {
  it("uses cloud preferences when local is unstamped (legacy cloud-wins preserved)", async () => {
    const cloudPrefs = makePreferences({ dailyReviewGoal: 10 });
    cloud.fetchPreferences.mockResolvedValue({ data: cloudPrefs, error: null });

    const result = expectSuccess(await performFullSync(deps()));

    expect(result.preferences).toEqual(cloudPrefs);
    expect(cloud.upsertPreferences).not.toHaveBeenCalled();
  });

  it("uses local preferences and pushes to cloud on first sign-in", async () => {
    const localPrefs = makePreferences({ dailyReviewGoal: 7 });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ preferences: localPrefs }) })),
    );

    expect(result.preferences).toEqual(localPrefs);
    expect(cloud.upsertPreferences).toHaveBeenCalledOnce();
    expect(cloud.upsertPreferences).toHaveBeenCalledWith(USER_ID, localPrefs);
  });

  it("pushes newer stamped local preferences over a stale cloud snapshot", async () => {
    const staleCloud = makePreferences({ dailyReviewGoal: 5, updatedAt: "2026-03-01T00:00:00.000Z" });
    const newerLocal = makePreferences({ dailyReviewGoal: 8, updatedAt: "2026-03-10T00:00:00.000Z" });
    cloud.fetchPreferences.mockResolvedValue({ data: staleCloud, error: null });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ preferences: newerLocal }) })),
    );

    expect(result.preferences).toEqual(newerLocal);
    expect(cloud.upsertPreferences).toHaveBeenCalledWith(USER_ID, newerLocal);
  });

  it("marks changes when cloud-synced preference fields differ", async () => {
    const localPrefs = makePreferences({ hidePatternsDuringReview: false });
    cloud.fetchPreferences.mockResolvedValue({
      data: makePreferences({ hidePatternsDuringReview: true }),
      error: null,
    });

    const result = expectSuccess(
      await performFullSync(deps({ local: local({ preferences: localPrefs }) })),
    );

    expect(result.hasChanges).toBe(true);
  });

  it("platform-only preference fields do not mark sync as changed and survive a cloud win", async () => {
    // Mobile extends CorePreferences with notification fields; only the
    // cloud-synced subset participates in change detection and merging.
    const localPrefs = { ...makePreferences(), notificationsEnabled: true };
    cloud.fetchPreferences.mockResolvedValue({ data: makePreferences(), error: null });

    const result = await performFullSync({
      userId: USER_ID,
      cloud,
      storage,
      local: { ...local(), preferences: localPrefs },
      eventRetentionDays: null,
      hooks: { warn },
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.hasChanges).toBe(false);
      expect(result.preferences.notificationsEnabled).toBe(true);
    }
  });
});

describe("performFullSync — prune watermark (F-3 within the full flow)", () => {
  const today = todayStr();

  it("prunes old events post-sync and persists the watermark when retention is set", async () => {
    const oldDate = addDays(today, -200);
    const recentDate = addDays(today, -1);
    const problem = makeProblem({ id: "p1" });
    const oldEvent = makeEvent({ problemId: "p1", date: oldDate, timestamp: `${oldDate}T10:00:00.000Z` });
    const recentEvent = makeEvent({ problemId: "p1", date: recentDate, timestamp: `${recentDate}T10:00:00.000Z` });

    const result = expectSuccess(
      await performFullSync(
        deps({
          eventRetentionDays: 180,
          local: local({ problems: [problem], reviewEvents: [oldEvent, recentEvent] }),
        }),
      ),
    );

    expect(result.reviewEvents).toEqual([recentEvent]);
    expect(result.hasChanges).toBe(true);
    expect(await storage.getItem(REVIEW_EVENTS_PRUNED_BEFORE_KEY)).toBe(addDays(today, -180));
    // Cloud keeps full history: the old event is still backfilled, never deleted.
    expect(cloud.batchInsertReviewLogs).toHaveBeenCalledWith(USER_ID, [oldEvent, recentEvent]);
  });

  it("never prunes or writes a watermark when retention is null (web)", async () => {
    const oldDate = addDays(today, -400);
    const problem = makeProblem({ id: "p1" });
    const oldEvent = makeEvent({ problemId: "p1", date: oldDate, timestamp: `${oldDate}T10:00:00.000Z` });

    const result = expectSuccess(
      await performFullSync(
        deps({ eventRetentionDays: null, local: local({ problems: [problem], reviewEvents: [oldEvent] }) }),
      ),
    );

    expect(result.reviewEvents).toEqual([oldEvent]);
    expect(storage.setItemCalls).toEqual([]);
  });

  it("drops pre-watermark cloud events instead of resurrecting them", async () => {
    const oldDate = addDays(today, -200);
    const recentDate = addDays(today, -1);
    const problem = makeProblem({ id: "p1" });
    const oldEvent = makeEvent({ problemId: "p1", date: oldDate, timestamp: `${oldDate}T10:00:00.000Z` });
    const recentEvent = makeEvent({ problemId: "p1", date: recentDate, timestamp: `${recentDate}T10:00:00.000Z` });
    await storage.setItem(REVIEW_EVENTS_PRUNED_BEFORE_KEY, addDays(today, -180));
    cloud.fetchProblems.mockResolvedValue({ data: [problem], error: null });
    cloud.fetchReviewEvents.mockResolvedValue({ data: [oldEvent, recentEvent], error: null });

    const result = expectSuccess(
      await performFullSync(
        deps({
          eventRetentionDays: 180,
          local: local({ problems: [problem], reviewEvents: [recentEvent] }),
        }),
      ),
    );

    expect(result.reviewEvents).toEqual([recentEvent]);
    // Nothing changed locally: no resurrection means no churn.
    expect(result.hasChanges).toBe(false);
    expect(cloud.batchInsertReviewLogs).not.toHaveBeenCalled();
  });
});
