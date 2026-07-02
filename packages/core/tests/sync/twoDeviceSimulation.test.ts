// Two-device end-to-end simulation: two in-memory StorageAdapters ("device A"
// and "device B") run the REAL performFullSync against ONE fake in-memory
// cloud that implements the FullSyncCloud surface over plain objects. This is
// the automated stand-in for the manual two-browser sync matrix.
import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_PREFERENCES, REVIEW_EVENTS_PRUNED_BEFORE_KEY } from "../../src/constants";
import { addDays, todayStr } from "../../src/dateHelpers";
import {
  performFullSync,
  type FullSyncCloud,
  type FullSyncLocalState,
  type FullSyncResult,
  type FullSyncSuccess,
} from "../../src/sync/fullSync";
import type { CloudPreferences } from "../../src/supabase/mapping";
import type {
  CorePreferences,
  DataReset,
  Problem,
  ProblemTombstone,
  ReviewEvent,
} from "../../src/types";
import { MemoryStorage, makeEvent, makeProblem } from "../helpers/syncTestUtils";

const USER_ID = "user-sim";
const TODAY = todayStr();

function iso(date: string, time = "12:00:00.000"): string {
  return `${date}T${time}Z`;
}

// ─── Fake cloud ──────────────────────────────────────────────────────────────

interface FakeCloudState {
  problems: Map<string, Problem>;
  tombstones: Map<string, ProblemTombstone>;
  dataReset: DataReset | null;
  reviewEvents: Map<string, ReviewEvent>;
  preferences: CloudPreferences | null;
}

function createFakeCloud(): { state: FakeCloudState; api: FullSyncCloud } {
  const state: FakeCloudState = {
    problems: new Map(),
    tombstones: new Map(),
    dataReset: null,
    reviewEvents: new Map(),
    preferences: null,
  };

  const sortedEvents = () =>
    [...state.reviewEvents.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const api: FullSyncCloud = {
    async fetchProblems() {
      return { data: [...state.problems.values()].map((p) => ({ ...p })), error: null };
    },
    async fetchProblemTombstones() {
      return { data: [...state.tombstones.values()].map((t) => ({ ...t })), error: null };
    },
    async fetchDataReset() {
      return { data: state.dataReset ? { ...state.dataReset } : null, error: null };
    },
    async fetchReviewLog() {
      const dates = new Set<string>();
      const log: Array<{ date: string }> = [];
      for (const event of sortedEvents()) {
        if (dates.has(event.date)) continue;
        dates.add(event.date);
        log.push({ date: event.date });
      }
      return { data: log, error: null };
    },
    async fetchReviewEvents() {
      return { data: sortedEvents().map((e) => ({ ...e })), error: null };
    },
    async fetchPreferences() {
      return { data: state.preferences ? { ...state.preferences } : null, error: null };
    },
    async upsertDataReset(_userId, reset) {
      state.dataReset = { ...reset };
      return { error: null };
    },
    async deleteAllUserProblems() {
      state.problems.clear();
      return { error: null };
    },
    async deleteAllUserReviewLog() {
      state.reviewEvents.clear();
      return { error: null };
    },
    async upsertProblemTombstones(_userId, tombstones) {
      for (const tombstone of tombstones) {
        state.tombstones.set(tombstone.problemId, { ...tombstone });
      }
      return { error: null };
    },
    async deleteProblems(problemIds) {
      for (const id of problemIds) state.problems.delete(id);
      return { error: null };
    },
    async upsertProblems(_userId, problems) {
      for (const problem of problems) state.problems.set(problem.id, { ...problem });
      return { data: problems, error: null };
    },
    async batchInsertReviewLogs(_userId, events) {
      for (const event of events) {
        // Mirrors the review_log dedupe_key upsert discipline (F-8).
        state.reviewEvents.set(`${event.problemId}|${event.timestamp}`, { ...event });
      }
      return { error: null };
    },
    async upsertPreferences(_userId, prefs) {
      state.preferences = { ...prefs, updatedAt: prefs.updatedAt ?? new Date().toISOString() };
      return { data: { ...state.preferences }, error: null };
    },
  };

  return { state, api };
}

// ─── Simulated device ────────────────────────────────────────────────────────

class Device {
  readonly storage = new MemoryStorage();
  eventRetentionDays: number | null = null;
  local: FullSyncLocalState<CorePreferences> = {
    problems: [],
    reviewLog: [],
    reviewEvents: [],
    preferences: { ...DEFAULT_PREFERENCES },
    problemTombstones: [],
    dataReset: null,
  };

  constructor(private readonly cloud: { api: FullSyncCloud }) {}

  addProblem(problem: Problem): void {
    this.local.problems.push(problem);
  }

  review(problemId: string, date: string, timestamp: string): void {
    this.local.reviewEvents.push(makeEvent({ problemId, date, timestamp, patterns: [] }));
    if (!this.local.reviewLog.some((entry) => entry.date === date)) {
      this.local.reviewLog.push({ date });
    }
  }

  /** What the platform does on clear-all: wipe local state, keep a reset marker. */
  clearAll(resetAt: string): void {
    this.local = {
      problems: [],
      reviewLog: [],
      reviewEvents: [],
      preferences: this.local.preferences,
      problemTombstones: [],
      dataReset: { resetAt },
    };
  }

  async sync(): Promise<FullSyncSuccess<CorePreferences>> {
    const result: FullSyncResult<CorePreferences> = await performFullSync({
      userId: USER_ID,
      cloud: this.cloud.api,
      storage: this.storage,
      local: {
        problems: [...this.local.problems],
        reviewLog: [...this.local.reviewLog],
        reviewEvents: [...this.local.reviewEvents],
        preferences: { ...this.local.preferences },
        problemTombstones: [...this.local.problemTombstones],
        dataReset: this.local.dataReset ? { ...this.local.dataReset } : null,
      },
      eventRetentionDays: this.eventRetentionDays,
    });
    expect(result.status).toBe("success");
    const success = result as FullSyncSuccess<CorePreferences>;
    // The platform persists the merged state after a successful sync.
    this.local = {
      problems: success.problems,
      reviewLog: success.reviewLog,
      reviewEvents: success.reviewEvents,
      preferences: success.preferences,
      problemTombstones: success.problemTombstones,
      dataReset: success.dataReset,
    };
    return success;
  }
}

let cloud: ReturnType<typeof createFakeCloud>;
let deviceA: Device;
let deviceB: Device;

beforeEach(() => {
  cloud = createFakeCloud();
  deviceA = new Device(cloud);
  deviceB = new Device(cloud);
});

// ─── Scenarios ───────────────────────────────────────────────────────────────

describe("two-device simulation — scenario 1: sign-in merge flows both directions", () => {
  it("device B receives device A's signed-out data, and B's later additions flow back to A", async () => {
    const d1 = addDays(TODAY, -2);
    const p1 = makeProblem({ id: "a-p1", leetcodeNumber: 1, title: "Two Sum", updatedAt: iso(d1) });
    deviceA.addProblem(p1);
    deviceA.review("a-p1", d1, iso(d1, "13:00:00.000"));

    await deviceA.sync();
    expect(cloud.state.problems.has("a-p1")).toBe(true);
    expect(cloud.state.reviewEvents.size).toBe(1);

    await deviceB.sync();
    expect(deviceB.local.problems.map((p) => p.id)).toEqual(["a-p1"]);
    expect(deviceB.local.reviewEvents).toHaveLength(1);
    expect(deviceB.local.reviewLog.map((e) => e.date)).toEqual([d1]);

    // B adds its own problem + review while A is elsewhere...
    const d2 = addDays(TODAY, -1);
    const p2 = makeProblem({ id: "b-p2", leetcodeNumber: 2, title: "Add Two Numbers", updatedAt: iso(d2) });
    deviceB.addProblem(p2);
    deviceB.review("b-p2", d2, iso(d2, "13:00:00.000"));
    await deviceB.sync();

    // ...and A picks it up on its next sync (other direction).
    await deviceA.sync();
    expect(deviceA.local.problems.map((p) => p.id).sort()).toEqual(["a-p1", "b-p2"]);
    expect(deviceA.local.reviewEvents).toHaveLength(2);
    expect(deviceA.local.reviewLog.map((e) => e.date).sort()).toEqual([d1, d2]);

    // Steady state: another A sync changes nothing.
    const steady = await deviceA.sync();
    expect(steady.hasChanges).toBe(false);
  });
});

describe("two-device simulation — scenario 2: clear-all reset survives and does not resurrect", () => {
  it("wipes device B's pre-reset data via the cloud reset marker, without tombstone resurrection", async () => {
    const before = addDays(TODAY, -5);
    deviceA.addProblem(makeProblem({ id: "old-1", leetcodeNumber: 1, updatedAt: iso(before) }));
    deviceA.addProblem(makeProblem({ id: "old-2", leetcodeNumber: 2, updatedAt: iso(before) }));
    deviceA.review("old-1", before, iso(before, "13:00:00.000"));
    await deviceA.sync();
    await deviceB.sync();
    expect(deviceB.local.problems).toHaveLength(2);

    // B also deleted a problem pre-reset — its tombstone must not survive the reset.
    deviceB.local.problemTombstones.push({ problemId: "old-2", deletedAt: iso(before, "14:00:00.000") });

    // A clears everything (reset marker newer than all data) and syncs.
    const resetAt = iso(addDays(TODAY, -1));
    deviceA.clearAll(resetAt);
    await deviceA.sync();
    expect(cloud.state.problems.size).toBe(0);
    expect(cloud.state.reviewEvents.size).toBe(0);
    expect(cloud.state.dataReset).toEqual({ resetAt });

    // B syncs: pre-reset local data is gone, the reset survives, nothing resurrects.
    await deviceB.sync();
    expect(deviceB.local.problems).toEqual([]);
    expect(deviceB.local.reviewEvents).toEqual([]);
    expect(deviceB.local.reviewLog).toEqual([]);
    expect(deviceB.local.problemTombstones).toEqual([]);
    expect(deviceB.local.dataReset).toEqual({ resetAt });
    // B's stale problems were NOT pushed back to the cloud.
    expect(cloud.state.problems.size).toBe(0);

    // Post-reset additions still flow normally.
    const after = TODAY;
    deviceA.addProblem(makeProblem({ id: "new-1", leetcodeNumber: 3, updatedAt: iso(after) }));
    await deviceA.sync();
    await deviceB.sync();
    expect(deviceB.local.problems.map((p) => p.id)).toEqual(["new-1"]);
  });
});

describe("two-device simulation — scenario 3: offline edits converge, newest wins, no duplicates", () => {
  it("resolves a same-problem conflict by newest updatedAt on both devices", async () => {
    const base = addDays(TODAY, -3);
    deviceA.addProblem(makeProblem({ id: "p1", leetcodeNumber: 1, notes: "original", updatedAt: iso(base) }));
    await deviceA.sync();
    await deviceB.sync();

    // Both edit the same problem offline; B's edit is later.
    const aEdit = iso(addDays(TODAY, -2), "10:00:00.000");
    const bEdit = iso(addDays(TODAY, -2), "11:00:00.000");
    deviceA.local.problems[0] = { ...deviceA.local.problems[0], notes: "A edit", updatedAt: aEdit };
    deviceB.local.problems[0] = { ...deviceB.local.problems[0], notes: "B edit", updatedAt: bEdit };

    await deviceA.sync(); // pushes A's edit
    await deviceB.sync(); // B is newer → wins and pushes
    await deviceA.sync(); // A converges to B's edit

    expect(deviceA.local.problems).toHaveLength(1);
    expect(deviceA.local.problems[0].notes).toBe("B edit");
    expect(deviceB.local.problems[0].notes).toBe("B edit");
    expect(cloud.state.problems.get("p1")?.notes).toBe("B edit");
  });

  it("deduplicates the same leetcode problem added independently on both devices", async () => {
    const tA = iso(addDays(TODAY, -2), "10:00:00.000");
    const tB = iso(addDays(TODAY, -2), "11:00:00.000");
    deviceA.addProblem(makeProblem({ id: "id-a", leetcodeNumber: 42, notes: "from A", updatedAt: tA }));
    deviceB.addProblem(makeProblem({ id: "id-b", leetcodeNumber: 42, notes: "from B", updatedAt: tB }));

    await deviceA.sync();
    await deviceB.sync(); // dedupe keeps the newer copy (id-b), deletes id-a from the cloud
    await deviceA.sync(); // A converges

    expect(deviceA.local.problems.map((p) => p.id)).toEqual(["id-b"]);
    expect(deviceB.local.problems.map((p) => p.id)).toEqual(["id-b"]);
    expect([...cloud.state.problems.keys()]).toEqual(["id-b"]);
  });
});

describe("two-device simulation — scenario 4: preferences newest-wins across devices (F-6)", () => {
  it("a stamped local change beats a stale cloud snapshot and reaches the other device", async () => {
    // Cloud holds a stale snapshot from an earlier session.
    cloud.state.preferences = {
      dailyReviewGoal: 5,
      hidePatternsDuringReview: false,
      enabledExtraPatterns: [],
      updatedAt: iso(addDays(TODAY, -10)),
    };
    deviceB.local.preferences = { ...DEFAULT_PREFERENCES, updatedAt: iso(addDays(TODAY, -10)) };

    // A changes preferences signed-out (stamped now-ish, newer than the cloud).
    deviceA.local.preferences = {
      dailyReviewGoal: 9,
      hidePatternsDuringReview: true,
      enabledExtraPatterns: ["Intervals"],
      updatedAt: iso(TODAY),
    };

    await deviceA.sync();
    expect(deviceA.local.preferences.dailyReviewGoal).toBe(9);
    expect(cloud.state.preferences?.dailyReviewGoal).toBe(9);
    expect(cloud.state.preferences?.updatedAt).toBe(iso(TODAY));

    await deviceB.sync();
    expect(deviceB.local.preferences.dailyReviewGoal).toBe(9);
    expect(deviceB.local.preferences.hidePatternsDuringReview).toBe(true);
    expect(deviceB.local.preferences.enabledExtraPatterns).toEqual(["Intervals"]);
    expect(deviceB.local.preferences.updatedAt).toBe(iso(TODAY));

    // A's next sync sees an identical cloud snapshot — nothing flips back.
    const steady = await deviceA.sync();
    expect(steady.preferences.dailyReviewGoal).toBe(9);
  });
});

describe("two-device simulation — scenario 5: prune watermark stops resurrection (F-3)", () => {
  it("device A's pruned history stays pruned across syncs while device B keeps everything", async () => {
    const oldDate = addDays(TODAY, -200);
    const recentDate = addDays(TODAY, -1);
    deviceA.addProblem(makeProblem({ id: "p-old", leetcodeNumber: 1, updatedAt: iso(oldDate) }));
    deviceA.addProblem(makeProblem({ id: "p-recent", leetcodeNumber: 2, updatedAt: iso(recentDate) }));
    deviceA.review("p-old", oldDate, iso(oldDate, "13:00:00.000"));
    deviceA.review("p-recent", recentDate, iso(recentDate, "13:00:00.000"));

    await deviceA.sync(); // full history reaches the cloud
    await deviceB.sync(); // B mirrors it
    expect(deviceB.local.reviewEvents).toHaveLength(2);

    // A turns on retention: post-sync prune drops the old event locally and
    // persists the watermark.
    deviceA.eventRetentionDays = 180;
    await deviceA.sync();
    expect(deviceA.local.reviewEvents.map((e) => e.date)).toEqual([recentDate]);
    expect(await deviceA.storage.getItem(REVIEW_EVENTS_PRUNED_BEFORE_KEY)).toBe(addDays(TODAY, -180));
    // Cloud still holds the full history (prune is local-only housekeeping).
    expect(cloud.state.reviewEvents.size).toBe(2);

    // A's next sync must NOT resurrect the pre-watermark cloud event — zero churn.
    const rerun = await deviceA.sync();
    expect(rerun.hasChanges).toBe(false);
    expect(deviceA.local.reviewEvents.map((e) => e.date)).toEqual([recentDate]);
    expect(cloud.state.reviewEvents.size).toBe(2);

    // B never prunes (retention null): it keeps everything it already had.
    await deviceB.sync();
    expect(deviceB.local.reviewEvents).toHaveLength(2);
    expect(await deviceB.storage.getItem(REVIEW_EVENTS_PRUNED_BEFORE_KEY)).toBeNull();
    expect(deviceB.storage.setItemCalls).toEqual([]);
  });
});
