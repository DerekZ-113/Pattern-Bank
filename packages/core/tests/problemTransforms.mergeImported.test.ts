// F-4: cross-device import merge fixtures for mergeImportedProblems.
//
// Web currently matches imported problems by id ONLY, so the same LeetCode
// problem exported on device A (id "a1") and imported on device B (where it
// lives under id "b1") gets duplicated. The canonical (mobile) implementation
// remaps imported ids to the canonical local id by leetcodeNumber and
// NaN-guards updatedAt comparisons via timestampMs() (invalid/missing → 0,
// i.e. treated as oldest).
//
// NOTE on return shape: web returns { mergedProblems, addedCount, updatedCount }
// while mobile additionally returns { changedProblems, importedIdToCanonicalId }.
// To survive the Phase 3 flip with minimal edits, all assertions here are on
// the resulting problem list (mergedProblems) only: count, ids, winning content.
import { mergeImportedProblems } from "../../../src/utils/problemTransforms";
import type { Problem } from "../../../src/types";

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    patterns: ["Hash Map"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-01-01",
    lastReviewed: null,
    nextReviewDate: "2026-01-05",
    fiveStarStreak: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// Note: mergeImportedProblems is pure and touches no storage; the root vitest
// config runs packages/core tests in the default node environment.

describe("mergeImportedProblems — same-id import (device re-imports its own export)", () => {
  it("updates the existing entry instead of duplicating when import is newer", () => {
    const existing = [
      makeProblem({ id: "a1", title: "Old Title", updatedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const imported = [
      makeProblem({ id: "a1", title: "New Title", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].id).toBe("a1");
    expect(mergedProblems[0].title).toBe("New Title");
  });

  it("re-importing an identical export is a no-op (no duplicate, same content)", () => {
    const existing = [makeProblem({ id: "a1", title: "Two Sum" })];
    const imported = [makeProblem({ id: "a1", title: "Two Sum" })];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0]).toMatchObject({ id: "a1", title: "Two Sum" });
  });

  it("still adds genuinely new problems", () => {
    const existing = [makeProblem({ id: "a1", leetcodeNumber: 1 })];
    const imported = [makeProblem({ id: "a2", leetcodeNumber: 2, title: "Add Two Numbers" })];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(2);
    expect(mergedProblems.map((p) => p.id).sort()).toEqual(["a1", "a2"]);
  });
});

describe("mergeImportedProblems — cross-device import (same leetcodeNumber, different ids)", () => {
  // FIXED-BY: Phase 3 (F-4) — web matches only by id, so a cross-device import of the same LeetCode problem duplicates it instead of updating the local canonical entry
  it.fails("does not duplicate; updates the local canonical entry when the import is newer", () => {
    const existing = [
      makeProblem({
        id: "b1",
        leetcodeNumber: 42,
        title: "Trapping Rain Water",
        confidence: 2,
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ];
    const imported = [
      makeProblem({
        id: "a1",
        leetcodeNumber: 42,
        title: "Trapping Rain Water",
        confidence: 5,
        notes: "reviewed on device A",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
    ];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    // Canonical: one entry, keeping the local id "b1" (so review history stays
    // attached) but carrying the newer imported content.
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0]).toMatchObject({
      id: "b1",
      leetcodeNumber: 42,
      confidence: 5,
      notes: "reviewed on device A",
    });
  });

  // FIXED-BY: Phase 3 (F-4) — web matches only by id, so even an OLDER cross-device duplicate is added as a second entry instead of being dropped
  it.fails("does not duplicate; keeps local content when the import is older", () => {
    const existing = [
      makeProblem({
        id: "b1",
        leetcodeNumber: 42,
        title: "Local Winner",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
    ];
    const imported = [
      makeProblem({
        id: "a1",
        leetcodeNumber: 42,
        title: "Older Backup",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0]).toMatchObject({ id: "b1", title: "Local Winner" });
  });
});

describe("mergeImportedProblems — newer-local-wins (same id, import older)", () => {
  it("keeps local content when the import has an older updatedAt", () => {
    const existing = [
      makeProblem({ id: "a1", title: "Newer Local", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    const imported = [
      makeProblem({ id: "a1", title: "Older Import", updatedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].title).toBe("Newer Local");
  });

  it("keeps local content on an exact updatedAt tie (import is not strictly newer)", () => {
    const existing = [
      makeProblem({ id: "a1", title: "Local", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    const imported = [
      makeProblem({ id: "a1", title: "Import", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].title).toBe("Local");
  });
});

describe("mergeImportedProblems — NaN-guard on updatedAt", () => {
  // FIXED-BY: Phase 3 (F-4) — web compares updatedAt as raw strings ("not-a-date" > "2026-…" is lexically true), letting an invalid imported timestamp beat a valid local one; canonical treats invalid timestamps as oldest
  it.fails("treats an invalid imported updatedAt as oldest — valid local content wins", () => {
    const existing = [
      makeProblem({ id: "a1", title: "Valid Local", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    const imported = [
      makeProblem({ id: "a1", title: "Corrupt Import", updatedAt: "not-a-date" }),
    ];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].title).toBe("Valid Local");
  });

  // FIXED-BY: Phase 3 (F-4) — web's lexical comparison ("2026-…" > "not-a-date" is false) keeps corrupt local data; canonical treats the invalid local timestamp as oldest so the valid import wins
  it.fails("treats an invalid local updatedAt as oldest — valid import wins", () => {
    const existing = [
      makeProblem({ id: "a1", title: "Corrupt Local", updatedAt: "not-a-date" }),
    ];
    const imported = [
      makeProblem({ id: "a1", title: "Valid Import", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].title).toBe("Valid Import");
  });

  it("does not crash when both timestamps are missing; keeps local deterministically", () => {
    // Legacy exports can lack updatedAt entirely; simulate via empty string
    // (canonical timestampMs treats falsy as 0 → import is not strictly newer).
    const existing = [makeProblem({ id: "a1", title: "Local", updatedAt: "" })];
    const imported = [makeProblem({ id: "a1", title: "Import", updatedAt: "" })];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].title).toBe("Local");
  });

  it("lets a valid import beat a missing local timestamp", () => {
    const existing = [makeProblem({ id: "a1", title: "Undated Local", updatedAt: "" })];
    const imported = [
      makeProblem({ id: "a1", title: "Dated Import", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ];
    const { mergedProblems } = mergeImportedProblems(existing, imported);
    expect(mergedProblems).toHaveLength(1);
    expect(mergedProblems[0].title).toBe("Dated Import");
  });
});
