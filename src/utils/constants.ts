import type { PatternColor, Preferences } from "../types";

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

export const PATTERN_COLORS: Record<string, PatternColor> = {
  "Two Pointers":       { text: "var(--color-pattern-two-pointers-text)", bg: "var(--color-pattern-two-pointers-bg)" },
  "Hash Table":         { text: "var(--color-pattern-hash-table-text)", bg: "var(--color-pattern-hash-table-bg)" },
  "Sliding Window":     { text: "var(--color-pattern-sliding-window-text)", bg: "var(--color-pattern-sliding-window-bg)" },
  "Binary Search":      { text: "var(--color-pattern-binary-search-text)", bg: "var(--color-pattern-binary-search-bg)" },
  "Sorting":            { text: "var(--color-pattern-sorting-text)", bg: "var(--color-pattern-sorting-bg)" },
  "Linked List":        { text: "var(--color-pattern-linked-list-text)", bg: "var(--color-pattern-linked-list-bg)" },
  "Stack":              { text: "var(--color-pattern-stack-text)", bg: "var(--color-pattern-stack-bg)" },
  "Queue":              { text: "var(--color-pattern-queue-text)", bg: "var(--color-pattern-queue-bg)" },
  "Tree":               { text: "var(--color-pattern-tree-text)", bg: "var(--color-pattern-tree-bg)" },
  "BFS":                { text: "var(--color-pattern-bfs-text)", bg: "var(--color-pattern-bfs-bg)" },
  "DFS":                { text: "var(--color-pattern-dfs-text)", bg: "var(--color-pattern-dfs-bg)" },
  "Heap":               { text: "var(--color-pattern-heap-text)", bg: "var(--color-pattern-heap-bg)" },
  "Greedy":             { text: "var(--color-pattern-greedy-text)", bg: "var(--color-pattern-greedy-bg)" },
  "Backtracking":       { text: "var(--color-pattern-backtracking-text)", bg: "var(--color-pattern-backtracking-bg)" },
  "Graph":              { text: "var(--color-pattern-graph-text)", bg: "var(--color-pattern-graph-bg)" },
  "Union Find":         { text: "var(--color-pattern-union-find-text)", bg: "var(--color-pattern-union-find-bg)" },
  "Trie":               { text: "var(--color-pattern-trie-text)", bg: "var(--color-pattern-trie-bg)" },
  "DP":                  { text: "var(--color-pattern-dp-text)", bg: "var(--color-pattern-dp-bg)" },
  "Intervals":          { text: "var(--color-pattern-intervals-text)", bg: "var(--color-pattern-intervals-bg)" },
  "Mono Stack":         { text: "var(--color-pattern-mono-stack-text)", bg: "var(--color-pattern-mono-stack-bg)" },
  "Prefix Sum":         { text: "var(--color-pattern-prefix-sum-text)", bg: "var(--color-pattern-prefix-sum-bg)" },
  "Bit":                { text: "var(--color-pattern-bit-text)", bg: "var(--color-pattern-bit-bg)" },
  "System Design":      { text: "var(--color-pattern-system-design-text)", bg: "var(--color-pattern-system-design-bg)" },
  "OOD":                { text: "var(--color-pattern-ood-text)", bg: "var(--color-pattern-ood-bg)" },
};

export function getVisiblePatterns(enabledExtras: string[]): string[] {
  return [
    ...CORE_PATTERNS,
    ...EXTRA_PATTERNS.filter((p) => enabledExtras.includes(p)),
  ];
}

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export const STORAGE_KEY = "patternbank-problems";
export const REVIEW_LOG_KEY = "patternbank-review-log";
export const REVIEW_EVENTS_KEY = "patternbank-review-events";
export const PREFERENCES_KEY = "patternbank-preferences";
export const PROBLEM_TOMBSTONES_KEY = "patternbank-problem-tombstones";
export const DATA_RESET_KEY = "patternbank-data-reset";

export const DEFAULT_PREFERENCES: Preferences = {
  dailyReviewGoal: 5,
  hidePatternsDuringReview: false,
  enabledExtraPatterns: [],
};
