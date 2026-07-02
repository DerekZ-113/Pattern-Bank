import { buildTodayLeetCodeItems } from "./importTransforms";
import {
  buildLeetCodeSubmissionsWithCompletions,
  isLeetCodeSubmissionCompletedToday,
  mergeTodayLeetCodeCompletion,
  type LeetCodeCompletionIdentity,
  type TodayLeetCodeCompletion,
} from "./todayCompletions";
import type {
  LeetCodeIgnoredImport,
  LeetCodeSubmission,
  Problem,
  ReviewEvent,
  TodayLeetCodeItem,
} from "../types";

interface ResolveTodayLeetCodeStateArgs {
  problems: Problem[];
  reviewEvents: ReviewEvent[];
  leetcodeSubmissions: LeetCodeSubmission[];
  ignoredImports: LeetCodeIgnoredImport[];
  todayCompletions: TodayLeetCodeCompletion[];
  today: string;
}

export interface TodayLeetCodeResolvedState {
  fromLeetCodeItems: TodayLeetCodeItem[];
  doneTodayLeetCodeSubmissions: LeetCodeSubmission[];
  effectiveCompletions: TodayLeetCodeCompletion[];
}

type CompletionInput = LeetCodeCompletionIdentity & {
  submissionDbId: string;
  problemId: string;
  action: TodayLeetCodeCompletion["action"];
  completedAt?: string;
};

function getReviewedTodayTimestamp(
  problem: Pick<Problem, "id" | "lastReviewed">,
  reviewEvents: ReviewEvent[],
  today: string,
): string | null {
  const latestEvent = reviewEvents
    .filter((event) => event.problemId === problem.id && event.date === today)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  if (latestEvent) return latestEvent.timestamp;
  return problem.lastReviewed === today ? `${today}T00:00:00.000Z` : null;
}

export function buildReviewedTodayLeetCodeCompletions({
  submissions,
  problems,
  reviewEvents,
  today,
}: {
  submissions: LeetCodeSubmission[];
  problems: Problem[];
  reviewEvents: ReviewEvent[];
  today: string;
}): CompletionInput[] {
  const problemById = new Map(problems.map((problem) => [problem.id, problem]));
  const problemByNumber = new Map(
    problems
      .filter((problem): problem is Problem & { leetcodeNumber: number } => typeof problem.leetcodeNumber === "number")
      .map((problem) => [problem.leetcodeNumber, problem]),
  );
  const completions: CompletionInput[] = [];

  for (const submission of submissions) {
    if (submission.status === "ignored") continue;
    const problem = (submission.problemId ? problemById.get(submission.problemId) : undefined)
      ?? (typeof submission.leetcodeNumber === "number" ? problemByNumber.get(submission.leetcodeNumber) : undefined);
    if (!problem) continue;
    const completedAt = getReviewedTodayTimestamp(problem, reviewEvents, today);
    if (!completedAt) continue;

    completions.push({
      submissionDbId: submission.id,
      leetcodeSubmissionId: submission.leetcodeSubmissionId,
      titleSlug: submission.titleSlug,
      leetcodeNumber: submission.leetcodeNumber,
      problemId: problem.id,
      action: "rated",
      completedAt,
    });
  }

  return completions;
}

export function mergeTodayLeetCodeCompletions(
  completions: TodayLeetCodeCompletion[],
  completionInputs: CompletionInput[],
  today: string,
): TodayLeetCodeCompletion[] {
  let next = completions;
  for (const completion of completionInputs) {
    next = mergeTodayLeetCodeCompletion(next, completion, today);
  }
  return next;
}

export function resolveTodayLeetCodeState({
  problems,
  reviewEvents,
  leetcodeSubmissions,
  ignoredImports,
  todayCompletions,
  today,
}: ResolveTodayLeetCodeStateArgs): TodayLeetCodeResolvedState {
  const reviewedTodayCompletions = buildReviewedTodayLeetCodeCompletions({
    submissions: leetcodeSubmissions,
    problems,
    reviewEvents,
    today,
  });
  const effectiveCompletions = mergeTodayLeetCodeCompletions(
    todayCompletions,
    reviewedTodayCompletions,
    today,
  );
  const doneTodayLeetCodeSubmissions = buildLeetCodeSubmissionsWithCompletions(
    leetcodeSubmissions,
    effectiveCompletions,
  );
  const rawFromLeetCodeItems = buildTodayLeetCodeItems({
    submissions: leetcodeSubmissions,
    problems,
    ignoredImports,
    reviewEvents,
    today,
  });
  const fromLeetCodeItems = rawFromLeetCodeItems.filter((item) => !isLeetCodeSubmissionCompletedToday({
    submissionDbId: item.submissionDbId,
    leetcodeSubmissionId: item.leetcodeSubmissionId,
    titleSlug: item.titleSlug,
    leetcodeNumber: item.leetcodeNumber,
    problemId: item.matchedProblemId,
  }, effectiveCompletions));

  return {
    fromLeetCodeItems,
    doneTodayLeetCodeSubmissions,
    effectiveCompletions,
  };
}
