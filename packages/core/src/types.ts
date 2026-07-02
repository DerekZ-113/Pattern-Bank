export type Difficulty = "Easy" | "Medium" | "Hard";
export type Confidence = 1 | 2 | 3 | 4 | 5;
export type SyncStatus =
  | "idle"
  | "syncing"
  | "pending"
  | "synced"
  | "offline"
  | "error";
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
  leetcodeSubmissionId?: string | null;
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
    leetcodeSubmissionId?: string | null;
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

/**
 * Preferences shared by every platform. Platforms extend this with their own
 * fields (mobile adds notification settings) and alias it as `Preferences`.
 * `updatedAt` powers newest-wins preference sync (F-6); it is optional because
 * blobs persisted before the field existed lack it — sync treats absence as
 * the epoch so legacy cloud data still wins the first merge.
 */
export interface CorePreferences {
  dailyReviewGoal: number;
  hidePatternsDuringReview: boolean;
  enabledExtraPatterns: string[];
  updatedAt?: string;
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

export interface ProblemList {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  source: string;
  numbers: number[];
}

export interface ListSummary {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  total: number;
  existing: number;
  newCount: number;
}
