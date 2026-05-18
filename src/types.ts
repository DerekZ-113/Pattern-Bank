export type Difficulty = "Easy" | "Medium" | "Hard";
export type Confidence = 1 | 2 | 3 | 4 | 5;
export type SyncStatus = "idle" | "syncing" | "synced" | "error";
export type ActiveTab = "dashboard" | "progress" | "problems";
export type LeetCodeSyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "no_visible_submissions"
  | "rate_limited";
export type LeetCodeSubmissionStatus =
  | "detected"
  | "linked_existing"
  | "pending"
  | "imported"
  | "ignored"
  | "rated";

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
  fiveStarStreak?: number;
  updatedAt: string;
}

export interface LeetCodeProblem {
  n: number;
  t: string;
  d: Difficulty;
  s: string;
}

export interface LeetCodeConnection {
  userId: string;
  leetcodeUsername: string;
  leetcodeDisplayName?: string | null;
  leetcodeAvatarUrl?: string | null;
  leetcodeTotalSolved?: number | null;
  lastSeenAcceptedCount?: number | null;
  lastSyncedAt?: string | null;
  lastSyncStartedAt?: string | null;
  syncStatus: LeetCodeSyncStatus;
  syncError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeetCodeSubmission {
  id: string;
  userId: string;
  leetcodeUsername: string;
  leetcodeSubmissionId: string;
  titleSlug: string;
  title: string;
  leetcodeNumber: number | null;
  difficulty: Difficulty | null;
  submittedAt: string;
  problemId?: string | null;
  status: LeetCodeSubmissionStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeetCodeIgnoredImport {
  userId: string;
  titleSlug: string;
  leetcodeNumber: number | null;
  ignoredAt?: string;
  createdAt?: string;
}

export interface PendingLeetCodeImport {
  submissionDbId: string;
  titleSlug: string;
  title: string;
  leetcodeNumber: number | null;
  difficulty: Difficulty | null;
  submittedAt: string;
  firstSeenAt?: string;
  suggestedPatterns: string[];
  expired: boolean;
}

export type TodayLeetCodeItem =
  | (PendingLeetCodeImport & {
    kind: "pending_import";
    status: "detected";
    matchedProblemId: null;
    statusLabel: "Rate to add";
  })
  | {
    kind: "linked_existing" | "imported" | "rated";
    submissionDbId: string;
    titleSlug: string;
    title: string;
    leetcodeNumber: number | null;
    difficulty: Difficulty | null;
    submittedAt: string;
    suggestedPatterns: string[];
    matchedProblemId: string | null;
    status: "linked_existing" | "imported" | "rated";
    statusLabel: "In library" | "Review due" | "Imported" | "Rated";
    confidence: Confidence | null;
    reviewedTodayConfidence: Confidence | null;
  };

export interface LeetCodeSyncSummary {
  fetchedCount?: number;
  insertedCount?: number;
  existingCount?: number;
  linkedExistingCount?: number;
  lastSyncedAt?: string | null;
  throttled?: boolean;
}

export interface ReviewLogEntry {
  date: string;
}

export interface ReviewEvent {
  date: string;
  problemId: string;
  confidence: number;
  patterns: string[];
  timestamp: string;
}

export interface ProblemTombstone {
  problemId: string;
  deletedAt: string;
}

export interface DataReset {
  resetAt: string;
}

export interface Preferences {
  dailyReviewGoal: number;
  hidePatternsDuringReview: boolean;
  enabledExtraPatterns: string[];
}

export interface ToastState {
  visible: boolean;
  message: string;
  variant?: "success" | "error";
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface BackupData {
  exportedAt?: string;
  problems: Problem[];
  reviewLog?: ReviewLogEntry[];
  reviewEvents?: ReviewEvent[];
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
