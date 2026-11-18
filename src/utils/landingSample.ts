import { addDays, formatLocalDate } from "@patternbank/core";
import type { Confidence, Difficulty, Problem, TodayLeetCodeItem } from "../types";

// The small made-up library behind the landing page's sample panels. The
// panels are the app's own components, so the page can never show a card the
// app does not draw; this file only supplies what they are fed.

export interface LandingSample {
  /** Two reviews waiting on Today, weakest first. */
  due: Problem[];
  /** What the goal meter is given. */
  goal: { reviewedToday: number; effectiveGoal: number; totalDueCount: number };
  /** A solve LeetCode reported that is not in the library yet. */
  leetcode: TodayLeetCodeItem;
  /** Enough problems for the pattern grid to run from weak to strong. */
  library: Problem[];
}

function sampleProblem(
  today: string,
  fields: {
    id: string;
    title: string;
    leetcodeNumber: number | null;
    slug?: string;
    difficulty: Difficulty;
    patterns: string[];
    confidence: Confidence;
    reviewedDaysAgo: number;
    notes?: string;
  },
): Problem {
  const lastReviewed = addDays(today, -fields.reviewedDaysAgo);
  return {
    id: fields.id,
    title: fields.title,
    leetcodeNumber: fields.leetcodeNumber,
    url: fields.slug ? `https://leetcode.com/problems/${fields.slug}/` : null,
    difficulty: fields.difficulty,
    patterns: fields.patterns,
    confidence: fields.confidence,
    notes: fields.notes ?? "",
    excludeFromReview: false,
    dateAdded: addDays(today, -60),
    lastReviewed,
    nextReviewDate: today,
    updatedAt: `${lastReviewed}T09:00:00.000Z`,
  };
}

// One line per pattern: the confidence of each problem filed under it. Union
// Find is left empty on purpose, since a real library has gaps too.
const PATTERN_CONFIDENCES: Array<[string, Confidence[]]> = [
  ["Array", [4, 4, 5, 4, 3, 4, 5]],
  ["Two Pointers", [4, 4, 5, 4]],
  ["Hash Table", [5, 4, 4, 5, 4]],
  ["Sliding Window", [3, 4, 3, 4]],
  ["Binary Search", [3, 3, 4, 3]],
  ["Sorting", [5, 4, 5]],
  ["Linked List", [4, 5, 4, 5]],
  ["Stack", [4, 4, 4]],
  ["Queue", [3, 4]],
  ["Tree", [4, 4, 3, 4, 4]],
  ["BFS", [3, 4, 3]],
  ["DFS", [4, 3, 4, 3]],
  ["Heap", [2, 2, 2]],
  ["Greedy", [3, 2, 3]],
  ["Backtracking", [2, 3, 2]],
  ["Graph", [3, 3, 3, 4]],
  ["Trie", [3]],
  ["DP", [1, 2, 1, 2, 1]],
  ["Math", [4, 3]],
];

export function buildLandingSample(now: Date = new Date()): LandingSample {
  const today = formatLocalDate(now);

  const due = [
    sampleProblem(today, {
      id: "landing-due-5",
      title: "Longest Palindromic Substring",
      leetcodeNumber: 5,
      slug: "longest-palindromic-substring",
      difficulty: "Medium",
      patterns: ["DP", "Two Pointers"],
      confidence: 1,
      reviewedDaysAgo: 1,
    }),
    sampleProblem(today, {
      id: "landing-due-23",
      title: "Merge k Sorted Lists",
      leetcodeNumber: 23,
      slug: "merge-k-sorted-lists",
      difficulty: "Hard",
      patterns: ["Linked List", "Heap"],
      confidence: 2,
      reviewedDaysAgo: 17,
      notes: "Push the head of every list; pop the smallest and push its next.",
    }),
  ];

  const leetcode: TodayLeetCodeItem = {
    kind: "pending_import",
    status: "detected",
    matchedProblemId: null,
    statusLabel: "Rate to add",
    submissionDbId: "landing-leetcode-146",
    titleSlug: "lru-cache",
    title: "LRU Cache",
    leetcodeNumber: 146,
    difficulty: "Medium",
    submittedAt: `${today}T08:00:00.000Z`,
    suggestedPatterns: ["Hash Table", "Linked List"],
    expired: false,
  };

  const library = PATTERN_CONFIDENCES.flatMap(([pattern, confidences]) =>
    confidences.map((confidence, index) =>
      sampleProblem(today, {
        id: `landing-${pattern}-${index}`,
        title: `${pattern} ${index + 1}`,
        leetcodeNumber: null,
        difficulty: "Medium",
        patterns: [pattern],
        confidence,
        reviewedDaysAgo: 3,
      }),
    ),
  );

  return {
    due,
    goal: { reviewedToday: 3, effectiveGoal: 5, totalDueCount: due.length },
    leetcode,
    library,
  };
}
