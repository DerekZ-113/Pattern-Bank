import { describe, it, expect } from "vitest";
import rawFixture from "../fixtures/crossPlatformSyncParity.json";
import {
  filterProblemsAfterDataReset,
  filterReviewEventsAfterDataReset,
  filterReviewLogAfterDataReset,
  filterTombstonedProblems,
  filterTombstonesAfterDataReset,
  mergeProblems,
  mergeProblemTombstones,
} from "../../src/sync/merge";
import { mergeReviewEvents, reviewEventKey } from "../../src/sync/reviewEvents";
import { respreadScheduledProblems } from "../../src/problemTransforms";
import { toCamelCase, toSnakeCase } from "../../src/supabase/mapping";
import type { Confidence, Difficulty, Problem, ReviewEvent } from "../../src/types";

// ============================================================
// Cross-platform SYNC parity (fixture v2) — the S6 acceptance gate for
// PatternBankKit's sync engine. Same date-shift layer as fixture v1
// (crossPlatformParity.test.ts): the fixture bytes are frozen and shared
// with the mobile repo; every date-like string shifts by
// (local today − fixture.today) days before the families run.
//
// The F-20 `>=` same-day log boundary is deliberately NOT in this fixture:
// it depends on the ambient timezone's local date of the reset instant, so
// it stays unit-tested per platform. The log dates here sit far from the
// boundary and behave identically in every zone.
// ============================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_STRING_RE = /^(\d{4}-\d{2}-\d{2})(T.*)?$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function localTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function dateOnlyToUtcMs(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

const deltaDays = Math.round(
  (dateOnlyToUtcMs(localTodayStr()) - dateOnlyToUtcMs(rawFixture.today)) / MS_PER_DAY,
);

function shiftDateStr(value: string): string {
  const match = DATE_STRING_RE.exec(value);
  if (!match) return value;
  const shifted = new Date(dateOnlyToUtcMs(match[1]) + deltaDays * MS_PER_DAY);
  const datePart = `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
  return `${datePart}${match[2] ?? ""}`;
}

function shiftDates<T>(value: T): T {
  if (typeof value === "string") return shiftDateStr(value) as T;
  if (Array.isArray(value)) return value.map((entry) => shiftDates(entry)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, shiftDates(entry)]),
    ) as T;
  }
  return value;
}

const fixture = shiftDates(rawFixture);

// The v2 factory intentionally has NO fiveStarStreak default: the mapping
// family distinguishes absent (defaulted on the wire) from explicit values.
type ProblemFixture = Partial<Omit<Problem, "confidence" | "difficulty">> & {
  confidence?: number;
  difficulty?: string;
};

function makeProblem(overrides: ProblemFixture): Problem {
  return {
    id: "fixture-problem",
    title: "Fixture Problem",
    leetcodeNumber: null,
    url: null,
    difficulty: "Medium" as Difficulty,
    patterns: ["Fixture"],
    confidence: 3 as Confidence,
    notes: "",
    excludeFromReview: false,
    dateAdded: shiftDateStr("2026-05-01"),
    lastReviewed: null,
    nextReviewDate: fixture.today,
    updatedAt: shiftDateStr("2026-05-01T00:00:00.000Z"),
    ...overrides,
  } as Problem;
}

function makeEvent(overrides: Partial<ReviewEvent>): ReviewEvent {
  return {
    date: fixture.today,
    problemId: "fixture-problem",
    confidence: 3,
    patterns: ["Fixture"],
    timestamp: `${fixture.today}T12:00:00.000Z`,
    ...overrides,
  };
}

describe("cross-platform sync parity fixtures (v2)", () => {
  it("matches cross-platform mergeProblems fixtures (newest-wins, F-17 malformed losers)", () => {
    const family = fixture.mergeProblems;
    const { problems, cloudAdded, cloudWon } = mergeProblems(
      family.local.map((p) => makeProblem(p)),
      family.cloud.map((p) => makeProblem(p)),
    );

    expect(problems.map((p) => p.id)).toEqual(family.expected.orderedIds);
    for (const problem of problems) {
      expect(problem.notes).toBe(
        family.expected.notesById[problem.id as keyof typeof family.expected.notesById],
      );
    }
    expect(cloudAdded).toBe(family.expected.cloudAdded);
    expect(cloudWon).toBe(family.expected.cloudWon);
  });

  it("matches cross-platform mergeReviewEvents fixtures (5s window, date+confidence gates, watermark)", () => {
    const family = fixture.mergeReviewEvents;
    const { events, addedFromCloud, localOnlyEvents } = mergeReviewEvents(
      family.local.map((e) => makeEvent(e)),
      family.cloud.map((e) => makeEvent(e)),
      { prunedBefore: family.prunedBefore },
    );

    const expectedKey = (ref: { problemId: string; timestamp: string }) =>
      `${ref.problemId}|${ref.timestamp}`;
    expect(events.map(reviewEventKey)).toEqual(family.expected.orderedEvents.map(expectedKey));
    expect(addedFromCloud).toBe(family.expected.addedFromCloud);
    expect(localOnlyEvents.map(reviewEventKey)).toEqual(
      family.expected.localOnlyEvents.map(expectedKey),
    );
  });

  it("matches cross-platform tombstone fixtures (newest-wins merge + F-25 LWW filter)", () => {
    const family = fixture.tombstones;
    const { tombstones, addedFromCloud } = mergeProblemTombstones(
      family.localTombstones,
      family.cloudTombstones,
    );

    expect(tombstones.map((t) => t.problemId)).toEqual(family.expected.orderedTombstoneProblemIds);
    for (const [problemId, deletedAt] of Object.entries(family.expected.winningDeletedAtById)) {
      expect(tombstones.find((t) => t.problemId === problemId)?.deletedAt).toBe(deletedAt);
    }
    expect(addedFromCloud).toBe(family.expected.addedFromCloud);

    const surviving = filterTombstonedProblems(
      family.problems.map((p) => makeProblem(p)),
      tombstones,
    );
    expect(surviving.map((p) => p.id)).toEqual(family.expected.survivingProblemIds);
  });

  it("matches cross-platform data-reset filter fixtures (strict > cutoffs)", () => {
    const family = fixture.dataResetFilters;
    const reset = family.reset;

    const { problems: keptProblems, removedIds } = filterProblemsAfterDataReset(
      family.problems.map((p) => makeProblem(p)),
      reset,
    );
    expect(keptProblems.map((p) => p.id)).toEqual(family.expected.keptProblemIds);
    expect(removedIds).toEqual(family.expected.removedProblemIds);

    const keptEvents = filterReviewEventsAfterDataReset(
      family.events.map((e) => makeEvent(e)),
      reset,
    );
    expect(keptEvents.map((e) => e.problemId)).toEqual(family.expected.keptEventProblemIds);

    const keptTombstones = filterTombstonesAfterDataReset(family.tombstones, reset);
    expect(keptTombstones.map((t) => t.problemId)).toEqual(family.expected.keptTombstoneProblemIds);

    const keptLog = filterReviewLogAfterDataReset(family.log, reset);
    expect(keptLog.map((entry) => entry.date)).toEqual(family.expected.keptLogDates);
  });

  it("matches cross-platform respread fixtures (top-up today, idempotent second run)", () => {
    const family = fixture.respreadIdempotency;
    const options = { dailyGoal: family.dailyGoal, today: fixture.today, now: family.now };

    const first = respreadScheduledProblems(
      family.problems.map((p) => makeProblem(p)),
      options,
    );
    expect(first.changedCount).toBe(family.expected.firstChangedCount);
    for (const problem of first.problems) {
      expect(problem.nextReviewDate).toBe(
        family.expected.dateById[problem.id as keyof typeof family.expected.dateById],
      );
    }

    const second = respreadScheduledProblems(first.problems, options);
    expect(second.changedCount).toBe(family.expected.secondChangedCount);
  });

  it("matches cross-platform mapping round-trip fixtures (defaults materialize on the wire)", () => {
    const family = fixture.mappingRoundTrip;
    for (const entry of family.problems) {
      const problem = makeProblem(entry);
      const roundTripped = toCamelCase(
        toSnakeCase(problem) as unknown as Record<string, unknown>,
      );
      const id = problem.id as keyof typeof family.expected.fiveStarStreakById;

      expect(roundTripped.fiveStarStreak).toBe(family.expected.fiveStarStreakById[id]);
      expect(roundTripped.notes).toBe(family.expected.notesById[id]);
      expect(roundTripped.excludeFromReview).toBe(family.expected.excludeFromReviewById[id]);
      expect(roundTripped.confidence).toBe(family.expected.confidenceById[id]);
      expect(roundTripped.id).toBe(problem.id);
      expect(roundTripped.updatedAt).toBe(problem.updatedAt);
    }
  });
});
