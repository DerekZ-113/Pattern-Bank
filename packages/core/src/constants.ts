import type { CorePreferences, Difficulty } from "./types";

export const CORE_PATTERNS = [
  "Two Pointers", "Hash Table", "Sliding Window",
  "Binary Search", "Sorting", "Linked List",
  "Stack", "Queue", "Tree",
  "BFS", "DFS", "Heap",
  "Greedy", "Backtracking", "Graph",
  "Union Find", "Trie", "DP",
] as const;

export const EXTRA_PATTERNS = [
  "Intervals", "Mono Stack", "Prefix Sum",
  "Bit", "System Design", "OOD",
] as const;

export function getVisiblePatterns(enabledExtras: string[]): string[] {
  return [
    ...CORE_PATTERNS,
    ...EXTRA_PATTERNS.filter((p) => enabledExtras.includes(p)),
  ];
}

export const DIFFICULTIES: readonly Difficulty[] = ["Easy", "Medium", "Hard"];

export const STORAGE_KEY = "patternbank-problems";
export const REVIEW_LOG_KEY = "patternbank-review-log";
export const REVIEW_EVENTS_KEY = "patternbank-review-events";
export const PREFERENCES_KEY = "patternbank-preferences";
export const PROBLEM_TOMBSTONES_KEY = "patternbank-problem-tombstones";
export const DATA_RESET_KEY = "patternbank-data-reset";
/**
 * ISO cutoff below which review events were locally pruned (F-3). Merge drops
 * cloud events older than this watermark so pruned history is not resurrected.
 */
export const REVIEW_EVENTS_PRUNED_BEFORE_KEY =
  "patternbank-review-events-pruned-before";

export const DEFAULT_PREFERENCES: CorePreferences = {
  dailyReviewGoal: 5,
  hidePatternsDuringReview: false,
  enabledExtraPatterns: [],
};
