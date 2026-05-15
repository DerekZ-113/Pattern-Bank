import {
  DATA_RESET_KEY,
  PREFERENCES_KEY,
  PROBLEM_TOMBSTONES_KEY,
  REVIEW_EVENTS_KEY,
  REVIEW_LOG_KEY,
  STORAGE_KEY,
} from "./constants";
import { addDays, formatLocalDate, parseDateOnly } from "./dateHelpers";
import type { Confidence, Difficulty, Preferences, Problem, ReviewEvent, ReviewLogEntry } from "../types";

interface DemoProblemInput {
  id: string;
  title: string;
  leetcodeNumber: number | null;
  difficulty: Difficulty;
  patterns: string[];
  confidence: Confidence;
  nextReviewDate: string;
  lastReviewed?: string | null;
  notes?: string;
  excludeFromReview?: boolean;
  dateAdded?: string;
  fiveStarStreak?: number;
}

export interface TodayDemoSeedData {
  problems: Problem[];
  reviewEvents: ReviewEvent[];
  reviewLog: ReviewLogEntry[];
  preferences: Preferences;
}

declare global {
  interface Window {
    PatternBankDev?: {
      seedTodayDemo: () => void;
      clearDemoData: () => void;
    };
  }
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeTimestamp(dateStr: string, hour: number, minute: number): string {
  const { year, month, day } = parseDateOnly(dateStr);
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function makeProblem(input: DemoProblemInput, today: string, now: string): Problem {
  return {
    id: input.id,
    title: input.title,
    leetcodeNumber: input.leetcodeNumber,
    url: input.leetcodeNumber
      ? `https://leetcode.com/problems/${slugifyTitle(input.title)}/`
      : null,
    difficulty: input.difficulty,
    patterns: input.patterns,
    confidence: input.confidence,
    notes: input.notes ?? "",
    excludeFromReview: input.excludeFromReview ?? false,
    dateAdded: input.dateAdded ?? addDays(today, -21),
    lastReviewed: input.lastReviewed ?? null,
    nextReviewDate: input.nextReviewDate,
    fiveStarStreak: input.fiveStarStreak ?? 0,
    updatedAt: now,
  };
}

export function buildTodayDemoSeedData(baseDate = new Date()): TodayDemoSeedData {
  const today = formatLocalDate(baseDate);
  const now = baseDate.toISOString();

  const problems = [
    makeProblem({
      id: "demo-two-sum",
      title: "Two Sum",
      leetcodeNumber: 1,
      difficulty: "Easy",
      patterns: ["Hash Table"],
      confidence: 3,
      nextReviewDate: today,
      lastReviewed: addDays(today, -5),
    }, today, now),
    makeProblem({
      id: "demo-merge-k-sorted-lists",
      title: "Merge k Sorted Lists",
      leetcodeNumber: 23,
      difficulty: "Hard",
      patterns: ["Linked List", "Heap"],
      confidence: 2,
      nextReviewDate: addDays(today, -3),
      lastReviewed: addDays(today, -17),
      notes: "Watch the heap size and null-list edge cases.",
    }, today, now),
    makeProblem({
      id: "demo-longest-palindromic-substring",
      title: "Longest Palindromic Substring",
      leetcodeNumber: 5,
      difficulty: "Medium",
      patterns: ["DP", "Two Pointers"],
      confidence: 1,
      nextReviewDate: today,
      lastReviewed: addDays(today, -1),
    }, today, now),
    makeProblem({
      id: "demo-daily-temperatures",
      title: "Daily Temperatures",
      leetcodeNumber: 739,
      difficulty: "Medium",
      patterns: ["Stack", "Mono Stack"],
      confidence: 4,
      nextReviewDate: today,
      lastReviewed: addDays(today, -10),
    }, today, now),
    makeProblem({
      id: "demo-lru-cache",
      title: "LRU Cache",
      leetcodeNumber: 146,
      difficulty: "Medium",
      patterns: ["Hash Table", "Linked List", "OOD"],
      confidence: 4,
      nextReviewDate: addDays(today, 10),
      lastReviewed: today,
      notes: "Map nodes to keys so eviction can delete from both structures.",
    }, today, now),
    makeProblem({
      id: "demo-group-anagrams",
      title: "Group Anagrams",
      leetcodeNumber: 49,
      difficulty: "Medium",
      patterns: ["Hash Table", "Sorting"],
      confidence: 3,
      nextReviewDate: addDays(today, 5),
      lastReviewed: today,
    }, today, now),
    makeProblem({
      id: "demo-max-depth-binary-tree",
      title: "Maximum Depth of Binary Tree",
      leetcodeNumber: 104,
      difficulty: "Easy",
      patterns: ["Tree", "DFS"],
      confidence: 5,
      nextReviewDate: addDays(today, 30),
      lastReviewed: today,
      fiveStarStreak: 1,
    }, today, now),
    makeProblem({
      id: "demo-binary-search",
      title: "Binary Search",
      leetcodeNumber: 704,
      difficulty: "Easy",
      patterns: ["Binary Search"],
      confidence: 4,
      nextReviewDate: addDays(today, 6),
      lastReviewed: addDays(today, -1),
    }, today, now),
    makeProblem({
      id: "demo-number-of-islands",
      title: "Number of Islands",
      leetcodeNumber: 200,
      difficulty: "Medium",
      patterns: ["Graph", "DFS", "BFS"],
      confidence: 3,
      nextReviewDate: addDays(today, 5),
      lastReviewed: addDays(today, -2),
    }, today, now),
    makeProblem({
      id: "demo-coin-change",
      title: "Coin Change",
      leetcodeNumber: 322,
      difficulty: "Medium",
      patterns: ["DP"],
      confidence: 2,
      nextReviewDate: addDays(today, 2),
      lastReviewed: addDays(today, -1),
    }, today, now),
    makeProblem({
      id: "demo-valid-palindrome",
      title: "Valid Palindrome",
      leetcodeNumber: 125,
      difficulty: "Easy",
      patterns: ["Two Pointers"],
      confidence: 5,
      nextReviewDate: addDays(today, -30),
      lastReviewed: addDays(today, -60),
      excludeFromReview: true,
      fiveStarStreak: 1,
      notes: "Excluded from reviews to demonstrate library-only problems.",
    }, today, now),
  ];

  const reviewEvents: ReviewEvent[] = [
    {
      date: today,
      problemId: "demo-lru-cache",
      confidence: 4,
      patterns: ["Hash Table", "Linked List", "OOD"],
      timestamp: makeTimestamp(today, 14, 14),
    },
    {
      date: today,
      problemId: "demo-group-anagrams",
      confidence: 3,
      patterns: ["Hash Table", "Sorting"],
      timestamp: makeTimestamp(today, 10, 42),
    },
    {
      date: today,
      problemId: "demo-max-depth-binary-tree",
      confidence: 5,
      patterns: ["Tree", "DFS"],
      timestamp: makeTimestamp(today, 8, 12),
    },
    {
      date: addDays(today, -1),
      problemId: "demo-binary-search",
      confidence: 4,
      patterns: ["Binary Search"],
      timestamp: makeTimestamp(addDays(today, -1), 18, 5),
    },
    {
      date: addDays(today, -2),
      problemId: "demo-number-of-islands",
      confidence: 3,
      patterns: ["Graph", "DFS", "BFS"],
      timestamp: makeTimestamp(addDays(today, -2), 20, 20),
    },
  ];

  const reviewLog: ReviewLogEntry[] = [
    { date: today },
    { date: addDays(today, -1) },
    { date: addDays(today, -2) },
    { date: addDays(today, -4) },
    { date: addDays(today, -6) },
  ];

  return {
    problems,
    reviewEvents,
    reviewLog,
    preferences: {
      dailyReviewGoal: 5,
      hidePatternsDuringReview: false,
      enabledExtraPatterns: ["Mono Stack", "Intervals", "Prefix Sum", "OOD"],
    },
  };
}

function hasSupabaseAuthKeys(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("sb-")) return true;
  }
  return false;
}

function shouldProceedWithDemoWrite(): boolean {
  if (!hasSupabaseAuthKeys()) return true;
  return window.confirm(
    "This writes demo problems into localStorage. Use this signed out or in incognito so demo data does not sync to cloud.",
  );
}

function reloadApp(): void {
  window.location.reload();
}

export function installDevSeedHelpers(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  window.PatternBankDev = {
    seedTodayDemo: () => {
      if (!shouldProceedWithDemoWrite()) return;
      const data = buildTodayDemoSeedData();

      console.warn("PatternBank dev helper: writing local demo data to localStorage.");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.problems));
      localStorage.setItem(REVIEW_EVENTS_KEY, JSON.stringify(data.reviewEvents));
      localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(data.reviewLog));
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(data.preferences));
      localStorage.removeItem(PROBLEM_TOMBSTONES_KEY);
      localStorage.removeItem(DATA_RESET_KEY);
      sessionStorage.setItem("patternbank-skip-landing", "true");

      const todayEventCount = data.reviewEvents.filter((event) => event.date === formatLocalDate(new Date())).length;
      console.info(
        [
          "Seeded PatternBank demo data:",
          `- ${data.problems.length} problems`,
          `- ${todayEventCount} review events today`,
          `- ${data.reviewLog.length} review-log days`,
          "Reloading...",
        ].join("\n"),
      );
      reloadApp();
    },
    clearDemoData: () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REVIEW_EVENTS_KEY);
      localStorage.removeItem(REVIEW_LOG_KEY);
      localStorage.removeItem(PREFERENCES_KEY);
      localStorage.removeItem(PROBLEM_TOMBSTONES_KEY);
      localStorage.removeItem(DATA_RESET_KEY);
      sessionStorage.setItem("patternbank-skip-landing", "true");
      console.info("Cleared PatternBank local demo data. Reloading...");
      reloadApp();
    },
  };

  console.info(
    [
      "PatternBank dev helpers installed:",
      "PatternBankDev.seedTodayDemo()",
      "PatternBankDev.clearDemoData()",
    ].join("\n"),
  );
}
