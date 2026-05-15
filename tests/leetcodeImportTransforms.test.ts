import { describe, expect, it, vi } from "vitest";
import {
  buildPendingLeetCodeImports,
  buildProblemFromLeetCodeImport,
} from "../src/utils/leetcodeImportTransforms";
import type {
  Confidence,
  LeetCodeIgnoredImport,
  LeetCodeSubmission,
  Problem,
} from "../src/types";

vi.mock("../src/utils/dateHelpers", async () => {
  const actual = await vi.importActual<typeof import("../src/utils/dateHelpers")>("../src/utils/dateHelpers");
  return {
    ...actual,
    generateId: () => "generated-problem-id",
  };
});

function makeSubmission(overrides: Partial<LeetCodeSubmission> = {}): LeetCodeSubmission {
  return {
    id: "sub-1",
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
    id: "p1",
    title: "Existing",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-05-01",
    lastReviewed: null,
    nextReviewDate: "2026-05-10",
    fiveStarStreak: 0,
    updatedAt: "2026-05-01T12:00:00.000Z",
    ...overrides,
  };
}

function makeIgnored(overrides: Partial<LeetCodeIgnoredImport> = {}): LeetCodeIgnoredImport {
  return {
    userId: "user-1",
    titleSlug: "two-sum",
    leetcodeNumber: 1,
    ignoredAt: "2026-05-15T19:00:00.000Z",
    createdAt: "2026-05-15T19:00:00.000Z",
    ...overrides,
  };
}

describe("buildPendingLeetCodeImports", () => {
  it("turns detected submissions into pending imports with suggested patterns", () => {
    const imports = buildPendingLeetCodeImports({
      submissions: [makeSubmission()],
      problems: [],
      ignoredImports: [],
      today: "2026-05-15",
    });

    expect(imports).toHaveLength(1);
    expect(imports[0]).toMatchObject({
      submissionDbId: "sub-1",
      title: "Two Sum",
      suggestedPatterns: ["Hash Table"],
      expired: false,
    });
  });

  it("excludes non-pending statuses, linked rows, existing local problems, and ignored slugs", () => {
    const imports = buildPendingLeetCodeImports({
      submissions: [
        makeSubmission({ id: "imported", status: "imported" }),
        makeSubmission({ id: "linked", problemId: "p1" }),
        makeSubmission({ id: "existing-local", titleSlug: "binary-search", leetcodeNumber: 704 }),
        makeSubmission({ id: "ignored", titleSlug: "two-sum" }),
      ],
      problems: [makeProblem({ leetcodeNumber: 704 })],
      ignoredImports: [makeIgnored({ titleSlug: "two-sum" })],
      today: "2026-05-15",
    });

    expect(imports).toEqual([]);
  });

  it("dedupes by titleSlug using newest submission display and earliest first-seen date", () => {
    const imports = buildPendingLeetCodeImports({
      submissions: [
        makeSubmission({
          id: "older-display",
          submittedAt: "2026-05-14T08:00:00.000Z",
          createdAt: "2026-05-14T08:10:00.000Z",
        }),
        makeSubmission({
          id: "newer-display",
          leetcodeSubmissionId: "lc-sub-2",
          submittedAt: "2026-05-15T08:00:00.000Z",
          createdAt: "2026-05-15T08:10:00.000Z",
        }),
      ],
      problems: [],
      ignoredImports: [],
      today: "2026-05-15",
    });

    expect(imports).toHaveLength(1);
    expect(imports[0].submissionDbId).toBe("newer-display");
    expect(imports[0].firstSeenAt).toBe("2026-05-14T08:10:00.000Z");
    expect(imports[0].expired).toBe(true);
  });
});

describe("buildProblemFromLeetCodeImport", () => {
  it("uses base intervals for explicit imports and does not graduate 5-star imports", () => {
    const pending = buildPendingLeetCodeImports({
      submissions: [makeSubmission({ difficulty: null })],
      problems: [],
      ignoredImports: [],
      today: "2026-05-15",
    })[0];

    const problem = buildProblemFromLeetCodeImport(pending, 5 as Confidence, {
      today: "2026-05-15",
      now: "2026-05-15T20:00:00.000Z",
      autoExpired: false,
    });

    expect(problem).toMatchObject({
      id: "generated-problem-id",
      title: "Two Sum",
      leetcodeNumber: 1,
      difficulty: "Medium",
      patterns: ["Hash Table"],
      confidence: 5,
      lastReviewed: null,
      nextReviewDate: "2026-06-14",
      fiveStarStreak: 0,
    });
  });

  it("makes auto-expired imports one-star and due today", () => {
    const pending = buildPendingLeetCodeImports({
      submissions: [makeSubmission({ createdAt: "2026-05-14T20:00:00.000Z" })],
      problems: [],
      ignoredImports: [],
      today: "2026-05-15",
    })[0];

    const problem = buildProblemFromLeetCodeImport(pending, 1, {
      today: "2026-05-15",
      now: "2026-05-15T20:00:00.000Z",
      autoExpired: true,
    });

    expect(problem.confidence).toBe(1);
    expect(problem.nextReviewDate).toBe("2026-05-15");
    expect(problem.lastReviewed).toBeNull();
  });
});
