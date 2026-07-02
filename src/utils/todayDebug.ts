import type { TodayLeetCodeCompletion } from "@patternbank/core";
import type { LeetCodeSubmission, Problem, ReviewEvent, TodayLeetCodeItem } from "../types";

// Web-only debug tool: set localStorage["patternbank-debug-today-lc"] = "1"
// to log resolved Today-LeetCode state snapshots to the console.
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
