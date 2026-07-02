import {
  buildTodayLeetCodeItems,
} from "@patternbank/core";
import {
  buildLeetCodeSubmissionsWithCompletions,
  isLeetCodeSubmissionCompletedToday,
  mergeTodayLeetCodeCompletion,
  type LeetCodeCompletionIdentity,
  type TodayLeetCodeCompletion,
} from "./todayLeetCodeCompletions";
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
};

function problemWasReviewedToday(
  problem: Pick<Problem, "id" | "lastReviewed">,
  reviewEvents: ReviewEvent[],
  today: string,
): boolean {
  return problem.lastReviewed === today
    || reviewEvents.some((event) => event.problemId === problem.id && event.date === today);
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
    if (!problem || !problemWasReviewedToday(problem, reviewEvents, today)) continue;

    completions.push({
      submissionDbId: submission.id,
      leetcodeSubmissionId: submission.leetcodeSubmissionId,
      titleSlug: submission.titleSlug,
      leetcodeNumber: submission.leetcodeNumber,
      problemId: problem.id,
      action: "rated",
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

export function logTodayLeetCodeDebugSnapshot(
  label: string,
  state: {
    submissions: LeetCodeSubmission[];
    completions: TodayLeetCodeCompletion[];
    fromLeetCodeItems: TodayLeetCodeItem[];
    doneTodayLeetCodeSubmissions: LeetCodeSubmission[];
    reviewEvents: ReviewEvent[];
    problems: Problem[];
  },
): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem("patternbank-debug-today-lc") !== "1") return;

  console.info("[PatternBank Today LC]", label, {
    submissions: state.submissions.map((submission) => ({
      id: submission.id,
      leetcodeSubmissionId: submission.leetcodeSubmissionId,
      titleSlug: submission.titleSlug,
      leetcodeNumber: submission.leetcodeNumber,
      status: submission.status,
      problemId: submission.problemId ?? null,
      updatedAt: submission.updatedAt ?? null,
    })),
    completions: state.completions,
    fromLeetCodeItems: state.fromLeetCodeItems.map((item) => ({
      kind: item.kind,
      submissionDbId: item.submissionDbId,
      leetcodeSubmissionId: item.leetcodeSubmissionId ?? null,
      titleSlug: item.titleSlug,
      leetcodeNumber: item.leetcodeNumber,
      matchedProblemId: item.matchedProblemId,
      status: item.status,
    })),
    doneTodayLeetCodeSubmissions: state.doneTodayLeetCodeSubmissions.map((submission) => ({
      id: submission.id,
      leetcodeSubmissionId: submission.leetcodeSubmissionId,
      titleSlug: submission.titleSlug,
      leetcodeNumber: submission.leetcodeNumber,
      status: submission.status,
      problemId: submission.problemId ?? null,
    })),
    reviewEvents: state.reviewEvents,
    problems: state.problems.map((problem) => ({
      id: problem.id,
      leetcodeNumber: problem.leetcodeNumber,
      lastReviewed: problem.lastReviewed,
    })),
  });
}
