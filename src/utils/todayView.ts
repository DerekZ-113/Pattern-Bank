import { todayStr } from "./dateHelpers";
import { prioritizeProblems } from "./spacedRepetition";
import type { Confidence, Difficulty, Problem, ReviewEvent } from "../types";

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

function coerceConfidence(confidence: number): Confidence {
  if (confidence === 1 || confidence === 2 || confidence === 3 || confidence === 4 || confidence === 5) {
    return confidence;
  }
  return 1;
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
  const problemById = new Map(problems.map((problem) => [problem.id, problem]));

  return reviewEvents
    .filter((event) => event.date === today)
    .map((event) => {
      const problem = problemById.get(event.problemId);
      if (!problem) return null;
      return {
        id: `${event.problemId}-${event.timestamp}`,
        problemId: event.problemId,
        title: problem.title,
        leetcodeNumber: problem.leetcodeNumber,
        difficulty: problem.difficulty,
        confidence: coerceConfidence(event.confidence),
        timestamp: event.timestamp,
      };
    })
    .filter((item): item is DoneTodayFeedItem => item !== null)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
