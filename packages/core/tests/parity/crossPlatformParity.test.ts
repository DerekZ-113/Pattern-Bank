import rawFixture from "../fixtures/crossPlatformReviewParity.json";
import {
  getIntervalDays,
  getNextFiveStarStreak,
  getReviewIntervalDays,
} from "../../src/spacedRepetition";
import { buildTodayActivityFeedItems, buildTodayReviewState } from "../../src/todayView";
import { resolveTodayLeetCodeState } from "../../src/leetcode/todayResolver";
import {
  isLeetCodeSubmissionCompletedToday,
  type TodayLeetCodeCompletion,
} from "../../src/leetcode/todayCompletions";
import type {
  Confidence,
  Difficulty,
  LeetCodeSubmission,
  Problem,
  ReviewEvent,
} from "../../src/types";

// ============================================================
// Date-shift layer (fixture-rot protection)
//
// The JSON fixture is the shared cross-platform contract and its dates must
// never be edited. Instead, every date-like string in the fixture is shifted
// by (real local today - fixture.today) days before the families run, so the
// suite stays green forever while preserving all relative orderings and
// day-distances exactly.
// ============================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Matches "YYYY-MM-DD" and the date part of "YYYY-MM-DDTHH:mm:ss.sssZ".
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

// ============================================================
// Fixture helpers (mirroring mobile's parity suite)
// ============================================================

type ProblemFixture = Partial<Omit<Problem, "confidence" | "difficulty">> & {
  confidence?: number;
  difficulty?: Difficulty | null;
};
type ReviewEventFixture = Partial<ReviewEvent>;
type SubmissionFixture = Partial<Omit<LeetCodeSubmission, "difficulty" | "status">> & {
  difficulty?: Difficulty | null;
  status?: LeetCodeSubmission["status"];
};
type CompletionFixture = Partial<TodayLeetCodeCompletion>;

function toConfidence(value: number | undefined, fallback: Confidence = 3): Confidence {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) return value;
  return fallback;
}

function makeProblem(overrides: ProblemFixture = {}): Problem {
  const merged = {
    id: "fixture-problem",
    title: "Fixture Problem",
    leetcodeNumber: null,
    url: null,
    difficulty: "Medium" as Difficulty,
    patterns: ["Fixture"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: shiftDateStr("2026-05-01"),
    lastReviewed: null,
    nextReviewDate: fixture.today,
    fiveStarStreak: 0,
    updatedAt: shiftDateStr("2026-05-01T00:00:00.000Z"),
    ...overrides,
  };

  return {
    ...merged,
    difficulty: (merged.difficulty ?? "Medium") as Difficulty,
    confidence: toConfidence(merged.confidence),
  };
}

function makeReviewEvent(overrides: ReviewEventFixture = {}): ReviewEvent {
  return {
    date: fixture.today,
    problemId: "fixture-problem",
    confidence: 3,
    patterns: ["Fixture"],
    timestamp: `${fixture.today}T12:00:00.000Z`,
    ...overrides,
  };
}

function makeSubmission(overrides: SubmissionFixture = {}): LeetCodeSubmission {
  return {
    id: "fixture-submission",
    userId: "user-1",
    leetcodeUsername: "derek113",
    leetcodeSubmissionId: "fixture-lc-submission",
    titleSlug: "fixture-problem",
    title: "Fixture Problem",
    leetcodeNumber: null,
    difficulty: "Medium",
    submittedAt: `${fixture.today}T12:00:00.000Z`,
    problemId: null,
    status: "detected",
    createdAt: `${fixture.today}T12:01:00.000Z`,
    updatedAt: `${fixture.today}T12:01:00.000Z`,
    ...overrides,
  };
}

function makeCompletion(overrides: CompletionFixture = {}): TodayLeetCodeCompletion {
  return {
    key: "submission:fixture-submission",
    date: fixture.today,
    submissionDbId: "fixture-submission",
    leetcodeSubmissionId: null,
    titleSlug: null,
    leetcodeNumber: null,
    problemId: "fixture-problem",
    action: "rated",
    completedAt: `${fixture.today}T12:02:00.000Z`,
    ...overrides,
  };
}

describe("cross-platform parity fixtures", () => {
  it("matches cross-platform confidence interval fixtures", () => {
    for (const { confidence, days } of fixture.intervalCases) {
      expect(getIntervalDays(toConfidence(confidence))).toBe(days);
    }
  });

  it("matches cross-platform five-star graduation fixtures", () => {
    for (const scenario of fixture.fiveStarGraduationCases) {
      const problem = makeProblem({
        confidence: scenario.previousConfidence,
        fiveStarStreak: scenario.previousFiveStarStreak,
      });
      const newConfidence = toConfidence(scenario.newConfidence);

      expect(getNextFiveStarStreak(problem, newConfidence)).toBe(scenario.expectedNextFiveStarStreak);
      expect(getReviewIntervalDays(problem, newConfidence)).toBe(scenario.expectedIntervalDays);
    }
  });

  it("matches cross-platform Today due-state fixtures", () => {
    const state = buildTodayReviewState(
      fixture.todayDueState.problems.map((problem) => makeProblem(problem)),
      fixture.todayDueState.dailyGoal,
      fixture.today,
    );

    expect(state.totalDueCount).toBe(fixture.todayDueState.expected.totalDueCount);
    expect(state.reviewedToday).toBe(fixture.todayDueState.expected.reviewedToday);
    expect(state.effectiveGoal).toBe(fixture.todayDueState.expected.effectiveGoal);
    expect(state.remainingSlots).toBe(fixture.todayDueState.expected.remainingSlots);
    expect(state.todaysReviews.map((problem) => problem.id)).toEqual(
      fixture.todayDueState.expected.todaysReviewIds,
    );
  });

  it("matches cross-platform Done Today review-event fixtures", () => {
    const items = buildTodayActivityFeedItems({
      problems: fixture.doneToday.problems.map((problem) => makeProblem(problem)),
      reviewEvents: fixture.doneToday.reviewEvents.map((event) => makeReviewEvent(event)),
      leetcodeSubmissions: [],
      today: fixture.today,
    });
    const reviewProblemIds = items
      .filter((item) => item.type === "pb_review")
      .map((item) => item.problemId);

    expect(reviewProblemIds).toEqual(fixture.doneToday.expected.pbReviewProblemIds);
  });

  it("matches cross-platform LeetCode completion identity fixtures", () => {
    const leetcodeFixture = fixture.leetcodeCompletionIdentity;
    const problems = leetcodeFixture.problems.map((problem) => makeProblem(problem));
    const todayCompletions = leetcodeFixture.todayCompletions.map((completion) =>
      makeCompletion(completion as CompletionFixture)
    );
    const submissions = leetcodeFixture.submissions.map((submission) =>
      makeSubmission(submission as SubmissionFixture)
    );

    const completedSubmissionIds = submissions
      .filter((submission) => isLeetCodeSubmissionCompletedToday(submission, todayCompletions))
      .map((submission) => submission.id);
    expect(completedSubmissionIds).toEqual(leetcodeFixture.expected.completedSubmissionIds);

    const result = resolveTodayLeetCodeState({
      problems,
      reviewEvents: [],
      leetcodeSubmissions: submissions,
      ignoredImports: [],
      todayCompletions,
      today: fixture.today,
    });

    expect(result.fromLeetCodeItems.map((item) => item.submissionDbId)).toEqual(
      leetcodeFixture.expected.fromLeetCodeSubmissionIds,
    );
    expect(
      result.doneTodayLeetCodeSubmissions
        .filter((submission) => submission.status === "rated")
        .map((submission) => submission.id),
    ).toEqual(leetcodeFixture.expected.ratedDoneTodaySubmissionIds);
  });
});
