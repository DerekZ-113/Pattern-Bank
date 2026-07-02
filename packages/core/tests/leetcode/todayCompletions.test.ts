import { describe, expect, it, beforeEach } from "vitest";
import {
  addTodayLeetCodeCompletion,
  buildLeetCodeCompletionKey,
  buildLeetCodeSubmissionsWithCompletions,
  buildTodayLeetCodeCompletionsStorageKey,
  isLeetCodeSubmissionCompletedToday,
  loadTodayLeetCodeCompletions,
  mergeTodayLeetCodeCompletion,
  parseTodayLeetCodeCompletions,
  saveTodayLeetCodeCompletions,
  serializeTodayLeetCodeCompletions,
  type TodayLeetCodeCompletion,
} from "../../src/leetcode/todayCompletions";
import type { StorageAdapter } from "../../src/storage/adapter";
import type { LeetCodeSubmission } from "../../src/types";

// Core tests stay storage-free: a fake in-memory StorageAdapter stands in for
// localStorage (web) / AsyncStorage (mobile).
function makeFakeStorage(): StorageAdapter & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
  };
}

let storage = makeFakeStorage();

beforeEach(() => {
  storage = makeFakeStorage();
});

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
    submittedAt: "2026-05-18T18:00:00.000Z",
    problemId: null,
    status: "detected",
    createdAt: "2026-05-18T18:01:00.000Z",
    updatedAt: "2026-05-18T18:01:00.000Z",
    ...overrides,
  };
}

function makeCompletion(overrides: Partial<TodayLeetCodeCompletion> = {}): TodayLeetCodeCompletion {
  return {
    key: "slug:two-sum",
    date: "2026-05-18",
    submissionDbId: "sub-db-1",
    leetcodeSubmissionId: "lc-sub-1",
    titleSlug: "two-sum",
    leetcodeNumber: 1,
    problemId: "p1",
    action: "rated",
    completedAt: "2026-05-18T18:00:00.000Z",
    ...overrides,
  };
}

describe("todayLeetCodeCompletions", () => {
  it("uses titleSlug before leetcodeNumber before submissionDbId for completion identity", () => {
    expect(buildLeetCodeCompletionKey({
      submissionDbId: "sub-a",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
    })).toBe("slug:two-sum");
    expect(buildLeetCodeCompletionKey({
      submissionDbId: "sub-a",
      titleSlug: "",
      leetcodeNumber: 1,
    })).toBe("number:1");
    expect(buildLeetCodeCompletionKey({
      submissionDbId: "sub-a",
      titleSlug: "",
      leetcodeNumber: null,
      problemId: "p1",
    })).toBe("problem:p1");
    expect(buildLeetCodeCompletionKey({
      submissionDbId: "sub-a",
      titleSlug: "",
      leetcodeNumber: null,
    })).toBe("submission:sub-a");
  });

  it("stores completions only for the current local day", async () => {
    await addTodayLeetCodeCompletion(storage, {
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      problemId: "p1",
      action: "rated",
    }, "2026-05-18");

    expect(await loadTodayLeetCodeCompletions(storage, "2026-05-18")).toHaveLength(1);
    expect(await loadTodayLeetCodeCompletions(storage, "2026-05-19")).toEqual([]);
  });

  it("marks duplicate same-problem submissions completed by slug", async () => {
    const completions = await addTodayLeetCodeCompletion(storage, {
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      problemId: "p1",
      action: "rated",
    }, "2026-05-18");

    expect(isLeetCodeSubmissionCompletedToday(
      makeSubmission({ id: "sub-db-2", leetcodeSubmissionId: "lc-sub-2" }),
      completions,
    )).toBe(true);
  });

  it("marks same-problem submissions completed by fallback number when slug changes", async () => {
    const completions = await addTodayLeetCodeCompletion(storage, {
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      problemId: "p1",
      action: "rated",
    }, "2026-05-18");

    expect(isLeetCodeSubmissionCompletedToday(
      makeSubmission({
        id: "sub-db-2",
        leetcodeSubmissionId: "lc-sub-2",
        titleSlug: "two-sum-v2",
        leetcodeNumber: 1,
      }),
      completions,
    )).toBe(true);
  });

  it("marks stale synced rows completed by LeetCode submission id when DB row and slug change", async () => {
    const completions = await addTodayLeetCodeCompletion(storage, {
      submissionDbId: "sub-db-1",
      leetcodeSubmissionId: "lc-sub-1",
      titleSlug: "two-sum",
      leetcodeNumber: null,
      problemId: "p1",
      action: "rated",
    }, "2026-05-18");

    expect(isLeetCodeSubmissionCompletedToday(
      makeSubmission({
        id: "fresh-row",
        leetcodeSubmissionId: "lc-sub-1",
        titleSlug: "two-sum-remastered",
        leetcodeNumber: null,
      }),
      completions,
    )).toBe(true);
  });

  it("marks stale synced rows completed by problem id when submission identity changes", async () => {
    const completions = await addTodayLeetCodeCompletion(storage, {
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      problemId: "p1",
      action: "rated",
    }, "2026-05-18");

    expect(isLeetCodeSubmissionCompletedToday(
      {
        submissionDbId: "fresh-row",
        titleSlug: "two-sum-remastered",
        leetcodeNumber: null,
        problemId: "p1",
      },
      completions,
    )).toBe(true);
  });

  it("overlays local completions into submissions for Done today", async () => {
    const completions = await addTodayLeetCodeCompletion(storage, {
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      problemId: "p1",
      action: "imported",
    }, "2026-05-18");

    const submissions = buildLeetCodeSubmissionsWithCompletions([makeSubmission()], completions);

    expect(submissions[0]).toMatchObject({
      id: "sub-db-1",
      status: "imported",
      problemId: "p1",
    });
  });

  it("overlays local completions into changed synced submissions by fallback number", async () => {
    const completions = await addTodayLeetCodeCompletion(storage, {
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      problemId: "p1",
      action: "rated",
    }, "2026-05-18");

    const submissions = buildLeetCodeSubmissionsWithCompletions([
      makeSubmission({
        id: "sub-db-2",
        leetcodeSubmissionId: "lc-sub-2",
        titleSlug: "two-sum-v2",
        leetcodeNumber: 1,
      }),
    ], completions);

    expect(submissions[0]).toMatchObject({
      id: "sub-db-2",
      status: "rated",
      problemId: "p1",
    });
  });

  it("overlays local completions by LeetCode submission id after sync changes row identity", async () => {
    const completions = await addTodayLeetCodeCompletion(storage, {
      submissionDbId: "sub-db-1",
      leetcodeSubmissionId: "lc-sub-1",
      titleSlug: "two-sum",
      leetcodeNumber: null,
      problemId: "p1",
      action: "rated",
    }, "2026-05-18");

    const submissions = buildLeetCodeSubmissionsWithCompletions([
      makeSubmission({
        id: "fresh-row",
        leetcodeSubmissionId: "lc-sub-1",
        titleSlug: "two-sum-remastered",
        leetcodeNumber: null,
      }),
    ], completions);

    expect(submissions[0]).toMatchObject({
      id: "fresh-row",
      status: "rated",
      problemId: "p1",
    });
  });
});

describe("parse/serialize round trip", () => {
  it("parses only well-formed records for the given day", () => {
    const raw = JSON.stringify([
      makeCompletion(),
      makeCompletion({ date: "2026-05-17", key: "slug:old" }),
      { junk: true },
      null,
    ]);

    const parsed = parseTodayLeetCodeCompletions(raw, "2026-05-18");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ key: "slug:two-sum", date: "2026-05-18" });
  });

  it("returns [] for null, corrupt, or non-array raw values", () => {
    expect(parseTodayLeetCodeCompletions(null, "2026-05-18")).toEqual([]);
    expect(parseTodayLeetCodeCompletions("not-json", "2026-05-18")).toEqual([]);
    expect(parseTodayLeetCodeCompletions("{\"a\":1}", "2026-05-18")).toEqual([]);
  });

  it("normalizes optional identity fields to null on parse", () => {
    const record = makeCompletion();
    delete (record as Partial<TodayLeetCodeCompletion>).leetcodeSubmissionId;
    delete (record as Partial<TodayLeetCodeCompletion>).titleSlug;
    delete (record as Partial<TodayLeetCodeCompletion>).leetcodeNumber;

    const [parsed] = parseTodayLeetCodeCompletions(JSON.stringify([record]), "2026-05-18");
    expect(parsed.leetcodeSubmissionId).toBeNull();
    expect(parsed.titleSlug).toBeNull();
    expect(parsed.leetcodeNumber).toBeNull();
  });

  it("serializes only the given day's records", () => {
    const raw = serializeTodayLeetCodeCompletions([
      makeCompletion(),
      makeCompletion({ date: "2026-05-17", key: "slug:old" }),
    ], "2026-05-18");

    expect(JSON.parse(raw)).toHaveLength(1);
  });

  it("saves under the per-day storage key via the adapter", async () => {
    await saveTodayLeetCodeCompletions(storage, [makeCompletion()], "2026-05-18");
    expect(storage.data.has(buildTodayLeetCodeCompletionsStorageKey("2026-05-18"))).toBe(true);
  });
});

describe("mergeTodayLeetCodeCompletion (F-16: non-today records survive)", () => {
  it("preserves older-date records when replacing a same-day completion", () => {
    const yesterday = makeCompletion({
      date: "2026-05-17",
      submissionDbId: "old-sub-db",
      leetcodeSubmissionId: "old-lc-sub",
      problemId: "old-problem",
      action: "imported",
      completedAt: "2026-05-17T18:00:00.000Z",
    });
    const today = makeCompletion({ action: "imported" });

    const result = mergeTodayLeetCodeCompletion([
      yesterday,
      today,
    ], {
      submissionDbId: "sub-db-2",
      leetcodeSubmissionId: "lc-sub-2",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      problemId: "p2",
      action: "rated",
      completedAt: "2026-05-18T19:00:00.000Z",
    }, "2026-05-18", "2026-05-18T19:00:00.000Z");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(yesterday);
    expect(result[1]).toMatchObject({
      date: "2026-05-18",
      submissionDbId: "sub-db-2",
      problemId: "p2",
      action: "rated",
    });
  });

  it("preserves existing records when merging a different same-day identity", () => {
    const yesterday = makeCompletion({
      date: "2026-05-17",
      submissionDbId: "old-sub-db",
      leetcodeSubmissionId: "old-lc-sub",
      problemId: "old-problem",
      action: "imported",
      completedAt: "2026-05-17T18:00:00.000Z",
    });
    const today = makeCompletion();

    const result = mergeTodayLeetCodeCompletion([
      yesterday,
      today,
    ], {
      submissionDbId: "sub-db-2",
      leetcodeSubmissionId: "lc-sub-2",
      titleSlug: "three-sum",
      leetcodeNumber: 15,
      problemId: "p2",
      action: "imported",
      completedAt: "2026-05-18T19:00:00.000Z",
    }, "2026-05-18", "2026-05-18T19:00:00.000Z");

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      yesterday,
      today,
      expect.objectContaining({
        key: "slug:three-sum",
        date: "2026-05-18",
        problemId: "p2",
      }),
    ]);
  });

  it("returns the same array when re-merging an identical completion (no-op)", () => {
    const completions = [makeCompletion()];
    const result = mergeTodayLeetCodeCompletion(completions, {
      submissionDbId: "sub-db-1",
      leetcodeSubmissionId: "lc-sub-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      problemId: "p1",
      action: "rated",
    }, "2026-05-18");

    expect(result).toBe(completions);
  });
});
