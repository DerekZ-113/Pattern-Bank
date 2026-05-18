export type AllProblemsSort =
  | "dateAdded"
  | "confidence"
  | "nextReview"
  | "leetcodeNumber";

export const ALL_PROBLEMS_SORT_KEY = "patternbank-all-problems-sort";
export const DEFAULT_ALL_PROBLEMS_SORT: AllProblemsSort = "leetcodeNumber";

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
