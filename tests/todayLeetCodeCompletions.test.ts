// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  addTodayLeetCodeCompletion,
  buildLeetCodeCompletionKey,
  buildLeetCodeSubmissionsWithCompletions,
  isLeetCodeSubmissionCompletedToday,
  loadTodayLeetCodeCompletions,
} from "../src/utils/todayLeetCodeCompletions";
import type { LeetCodeSubmission } from "../src/types";

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

describe("todayLeetCodeCompletions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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
    })).toBe("submission:sub-a");
  });

  it("stores completions only for the current local day", () => {
    addTodayLeetCodeCompletion({
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
      problemId: "p1",
      action: "rated",
    }, "2026-05-18");

    expect(loadTodayLeetCodeCompletions("2026-05-18")).toHaveLength(1);
    expect(loadTodayLeetCodeCompletions("2026-05-19")).toEqual([]);
  });

  it("marks duplicate same-problem submissions completed by slug", () => {
    const completions = addTodayLeetCodeCompletion({
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

  it("marks same-problem submissions completed by fallback number when slug changes", () => {
    const completions = addTodayLeetCodeCompletion({
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

  it("marks stale synced rows completed by LeetCode submission id when DB row and slug change", () => {
    const completions = addTodayLeetCodeCompletion({
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

  it("marks stale synced rows completed by problem id when submission identity changes", () => {
    const completions = addTodayLeetCodeCompletion({
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

  it("overlays local completions into submissions for Done today", () => {
    const completions = addTodayLeetCodeCompletion({
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

  it("overlays local completions into changed synced submissions by fallback number", () => {
    const completions = addTodayLeetCodeCompletion({
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

  it("overlays local completions by LeetCode submission id after sync changes row identity", () => {
    const completions = addTodayLeetCodeCompletion({
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
