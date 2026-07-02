import { todayStr, utcToLocalDateStr } from "./dateHelpers";
import { prioritizeProblems } from "./spacedRepetition";
import { buildLeetCodeCompletionKey } from "./leetcode/todayCompletions";
import type { Confidence, Difficulty, LeetCodeSubmission, Problem, ReviewEvent, TodayLeetCodeItem } from "./types";

export interface TodayReviewState {
  todaysReviews: Problem[];
  totalDueCount: number;
  reviewedToday: number;
  effectiveGoal: number;
  remainingSlots: number;
}

export interface DoneTodayFeedItem {
  id: string;
  problemId: string;
  title: string;
  leetcodeNumber: number | null;
  difficulty: Difficulty;
  confidence: Confidence;
  timestamp: string;
}

export type TodayActivityFeedItem =
  | {
      type: "pb_review";
      id: string;
      problemId: string;
      title: string;
      leetcodeNumber: number | null;
      difficulty: Difficulty;
      confidence: Confidence;
      timestamp: string;
    }
  | {
      type: "leetcode_solve";
      id: string;
      submissionDbId: string;
      problemId: string;
      title: string;
      leetcodeNumber: number | null;
      difficulty: Difficulty;
      submittedAt: string;
      status: "linked_existing" | "imported" | "rated";
      reviewDue: boolean;
      canRate: boolean;
    };

export interface SolvedOnLeetCodeTodayIndex {
  problemIds: Set<string>;
  leetcodeNumbers: Set<number>;
}

export interface ExitingTodayLeetCodeItem {
  key: string;
  item: TodayLeetCodeItem;
}

function coerceConfidence(confidence: number): Confidence {
  if (confidence === 1 || confidence === 2 || confidence === 3 || confidence === 4 || confidence === 5) {
    return confidence;
  }
  return 1;
}

function isDoneTodayLeetCodeStatus(
  status: LeetCodeSubmission["status"],
): status is "detected" | "linked_existing" | "imported" | "rated" {
  return status === "detected" || status === "linked_existing" || status === "imported" || status === "rated";
}

function leetcodeStatusRank(status: "linked_existing" | "imported" | "rated"): number {
  if (status === "rated") return 3;
  if (status === "imported") return 2;
  return 1;
}

function activityTimestamp(item: TodayActivityFeedItem): string {
  return item.type === "pb_review" ? item.timestamp : item.submittedAt;
}

export function buildTodayReviewState(
  problems: Problem[],
  dailyGoal: number,
  today = todayStr(),
): TodayReviewState {
  const allDueProblems = problems.filter((p) => p.nextReviewDate <= today && !p.excludeFromReview);
  const reviewedToday = problems.filter((p) => p.lastReviewed === today).length;
  const totalDueCount = allDueProblems.length;
  const effectiveGoal = Math.min(dailyGoal, totalDueCount + reviewedToday);
  const remainingSlots = Math.max(0, effectiveGoal - reviewedToday);
  const todaysReviews = prioritizeProblems(allDueProblems, remainingSlots, today);

  return {
    todaysReviews,
    totalDueCount,
    reviewedToday,
    effectiveGoal,
    remainingSlots,
  };
}

export function buildDoneTodayFeedItems(
  problems: Problem[],
  reviewEvents: ReviewEvent[],
  today = todayStr(),
): DoneTodayFeedItem[] {
  return buildTodayActivityFeedItems({
    problems,
    reviewEvents,
    leetcodeSubmissions: [],
    today,
  }).filter((item): item is DoneTodayFeedItem & { type: "pb_review" } => item.type === "pb_review");
}

export function buildSolvedOnLeetCodeTodayIndex(
  leetcodeSubmissions: LeetCodeSubmission[],
  today = todayStr(),
): SolvedOnLeetCodeTodayIndex {
  const problemIds = new Set<string>();
  const leetcodeNumbers = new Set<number>();

  for (const submission of leetcodeSubmissions) {
    if (submission.status === "ignored") continue;
    if (utcToLocalDateStr(submission.submittedAt) !== today) continue;
    if (submission.problemId) problemIds.add(submission.problemId);
    if (typeof submission.leetcodeNumber === "number") leetcodeNumbers.add(submission.leetcodeNumber);
  }

  return { problemIds, leetcodeNumbers };
}

export function buildTodayLeetCodeItemKey(item: TodayLeetCodeItem): string {
  return buildLeetCodeCompletionKey({
    submissionDbId: item.submissionDbId,
    leetcodeSubmissionId: item.leetcodeSubmissionId,
    titleSlug: item.titleSlug,
    leetcodeNumber: item.leetcodeNumber,
    problemId: item.matchedProblemId,
  });
}

export function buildRemovedTodayLeetCodeItems({
  previousItems,
  currentItems,
  exitingKeys,
}: {
  previousItems: TodayLeetCodeItem[];
  currentItems: TodayLeetCodeItem[];
  exitingKeys: Set<string>;
}): ExitingTodayLeetCodeItem[] {
  const currentKeys = new Set(currentItems.map(buildTodayLeetCodeItemKey));
  return previousItems
    .map((item) => ({ key: buildTodayLeetCodeItemKey(item), item }))
    .filter(({ key }) => !currentKeys.has(key) && !exitingKeys.has(key));
}

export function buildTodayActivityFeedItems({
  problems,
  reviewEvents,
  leetcodeSubmissions,
  today = todayStr(),
}: {
  problems: Problem[];
  reviewEvents: ReviewEvent[];
  leetcodeSubmissions: LeetCodeSubmission[];
  today?: string;
}): TodayActivityFeedItem[] {
  const problemById = new Map(problems.map((problem) => [problem.id, problem]));
  const problemByNumber = new Map(
    problems
      .filter((problem): problem is Problem & { leetcodeNumber: number } => typeof problem.leetcodeNumber === "number")
      .map((problem) => [problem.leetcodeNumber, problem]),
  );
  const reviewedProblemIds = new Set<string>();
  const latestReviewByProblem = new Map<string, ReviewEvent>();

  for (const event of reviewEvents) {
    if (event.date !== today) continue;
    const problem = problemById.get(event.problemId);
    if (!problem) continue;
    reviewedProblemIds.add(event.problemId);
    const current = latestReviewByProblem.get(event.problemId);
    if (!current || event.timestamp > current.timestamp) {
      latestReviewByProblem.set(event.problemId, event);
    }
  }

  const pbItems: TodayActivityFeedItem[] = Array.from(latestReviewByProblem.values()).map((event) => {
    const problem = problemById.get(event.problemId)!;
    return {
      type: "pb_review",
      id: `pb-${event.problemId}-${event.timestamp}`,
      problemId: event.problemId,
      title: problem.title,
      leetcodeNumber: problem.leetcodeNumber,
      difficulty: problem.difficulty,
      confidence: coerceConfidence(event.confidence),
      timestamp: event.timestamp,
    };
  });

  const leetcodeByProblemId = new Map<string, Extract<TodayActivityFeedItem, { type: "leetcode_solve" }>>();

  for (const submission of leetcodeSubmissions) {
    if (!isDoneTodayLeetCodeStatus(submission.status)) continue;
    if (utcToLocalDateStr(submission.submittedAt) !== today) continue;

    const problem = (submission.problemId ? problemById.get(submission.problemId) : undefined)
      ?? (typeof submission.leetcodeNumber === "number" ? problemByNumber.get(submission.leetcodeNumber) : undefined);
    if (!problem?.id) continue;
    if (reviewedProblemIds.has(problem.id)) continue;

    const reviewDue = problem.nextReviewDate <= today && !problem.excludeFromReview;
    const alreadyReviewedToday = problem.lastReviewed === today || reviewedProblemIds.has(problem.id);
    const status = submission.status === "detected" ? "linked_existing" : submission.status;
    const item: Extract<TodayActivityFeedItem, { type: "leetcode_solve" }> = {
      type: "leetcode_solve",
      id: `lc-${submission.id}`,
      submissionDbId: submission.id,
      problemId: problem.id,
      title: problem.title,
      leetcodeNumber: problem.leetcodeNumber ?? submission.leetcodeNumber,
      difficulty: problem.difficulty,
      submittedAt: submission.submittedAt,
      status,
      reviewDue,
      canRate: reviewDue && !alreadyReviewedToday && status !== "rated",
    };

    const current = leetcodeByProblemId.get(problem.id);
    if (!current) {
      leetcodeByProblemId.set(problem.id, item);
      continue;
    }
    const nextRank = leetcodeStatusRank(item.status);
    const currentRank = leetcodeStatusRank(current.status);
    if (nextRank > currentRank || (nextRank === currentRank && item.submittedAt > current.submittedAt)) {
      leetcodeByProblemId.set(problem.id, item);
    }
  }

  return [...pbItems, ...leetcodeByProblemId.values()].sort((a, b) =>
    activityTimestamp(b).localeCompare(activityTimestamp(a)),
  );
}
