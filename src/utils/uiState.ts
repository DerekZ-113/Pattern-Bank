export type AllProblemsSort =
  | "dateAdded"
  | "confidence"
  | "nextReview"
  | "leetcodeNumber";

export const ALL_PROBLEMS_SORT_KEY = "patternbank-all-problems-sort";
export const DEFAULT_ALL_PROBLEMS_SORT: AllProblemsSort = "leetcodeNumber";
export const WHATS_NEW_DISMISSED_KEY = "patternbank-whatsnew-dismissed";

const ALL_PROBLEMS_SORT_VALUES: readonly AllProblemsSort[] = [
  "dateAdded",
  "confidence",
  "nextReview",
  "leetcodeNumber",
];

export function isAllProblemsSort(value: unknown): value is AllProblemsSort {
  return typeof value === "string" && ALL_PROBLEMS_SORT_VALUES.includes(value as AllProblemsSort);
}

export function loadAllProblemsSort(defaultSort: AllProblemsSort = DEFAULT_ALL_PROBLEMS_SORT): AllProblemsSort {
  const stored = localStorage.getItem(ALL_PROBLEMS_SORT_KEY);
  return isAllProblemsSort(stored) ? stored : defaultSort;
}

export function saveAllProblemsSort(sort: AllProblemsSort): void {
  localStorage.setItem(ALL_PROBLEMS_SORT_KEY, sort);
}

export function loadWhatsNewDismissedId(): string | null {
  return localStorage.getItem(WHATS_NEW_DISMISSED_KEY);
}

export function saveWhatsNewDismissedId(id: string): void {
  localStorage.setItem(WHATS_NEW_DISMISSED_KEY, id);
  // Legacy V2 intro flag, superseded by the versioned banner (2026-07-22).
  localStorage.removeItem("patternbank-v2-leetcode-intro-dismissed");
}
