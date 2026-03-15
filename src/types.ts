export type Difficulty = "Easy" | "Medium" | "Hard";
export type Confidence = 1 | 2 | 3 | 4 | 5;
export type SyncStatus = "idle" | "syncing" | "synced" | "error";
export type ActiveTab = "dashboard" | "problems";

export interface Problem {
  id: string;
  title: string;
  leetcodeNumber: number | null;
  url: string | null;
  difficulty: Difficulty;
  patterns: string[];
  confidence: Confidence;
  notes: string;
  excludeFromReview: boolean;
  dateAdded: string;
  lastReviewed: string | null;
  nextReviewDate: string;
  updatedAt: string;
}

export interface LeetCodeProblem {
  n: number;
  t: string;
  d: Difficulty;
  s: string;
}

export interface ReviewLogEntry {
  date: string;
}

export interface Preferences {
  dailyReviewGoal: number;
  hidePatternsDuringReview: boolean;
}

export interface ToastState {
  visible: boolean;
  message: string;
}

export interface BackupData {
  exportedAt?: string;
  problems: Problem[];
  reviewLog?: ReviewLogEntry[];
}

export interface PatternColor {
  text: string;
  bg: string;
}

export interface ReviewHistoryEntry {
  reviewDate: string;
  newConfidence: number;
  createdAt: string;
}
