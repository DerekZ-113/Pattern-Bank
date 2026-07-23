import type { CorePreferences, Difficulty } from "./types";

export const CORE_PATTERNS = [
  "Array", "Two Pointers", "Hash Table",
  "Sliding Window", "Binary Search", "Sorting",
  "Linked List", "Stack", "Queue",
  "Tree", "BFS", "DFS",
  "Heap", "Greedy", "Backtracking",
  "Graph", "Union Find", "Trie",
  "DP", "Math",
] as const;

export const EXTRA_PATTERNS = [
  "Intervals", "Mono Stack", "Prefix Sum",
  "Bit", "System Design", "OOD",
] as const;

// Category membership for display grouping (picker sections, pill ordering).
// Membership only — display order still comes from CORE/EXTRA/stored order.
// Every CORE_PATTERNS and EXTRA_PATTERNS entry must appear in exactly one
// category (enforced by tests).
export const PATTERN_CATEGORIES = {
  structures: [
    "Array", "Hash Table", "Linked List", "Stack", "Queue",
    "Tree", "Heap", "Graph", "Trie", "Union Find",
  ],
  strategies: [
    "Two Pointers", "Sliding Window", "Binary Search", "Sorting",
    "BFS", "DFS", "Greedy", "Backtracking", "DP", "Math",
    "Intervals", "Mono Stack", "Prefix Sum", "Bit", "System Design", "OOD",
  ],
} as const;

const STRUCTURE_SET: ReadonlySet<string> = new Set(PATTERN_CATEGORIES.structures);
const STRATEGY_SET: ReadonlySet<string> = new Set(PATTERN_CATEGORIES.strategies);

export interface GroupedPatterns {
  structures: string[];
  strategies: string[];
  custom: string[];
}

export function groupPatternsByCategory(patterns: string[]): GroupedPatterns {
  const groups: GroupedPatterns = { structures: [], strategies: [], custom: [] };
  for (const pattern of patterns) {
    if (STRUCTURE_SET.has(pattern)) groups.structures.push(pattern);
    else if (STRATEGY_SET.has(pattern)) groups.strategies.push(pattern);
    else groups.custom.push(pattern);
  }
  return groups;
}

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
