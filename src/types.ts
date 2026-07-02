// Shared domain types live in @patternbank/core; this module re-exports them
// so web code keeps importing from "../types". Web-only types live below.
export type {
  BackupData,
  Confidence,
  CorePreferences,
  DataReset,
  Difficulty,
  LeetCodeConnection,
  LeetCodeIgnoredImport,
  LeetCodeProblem,
  LeetCodeSubmission,
  LeetCodeSubmissionStatus,
  LeetCodeSyncStatus,
  LeetCodeSyncSummary,
  ListSummary,
  PatternColor,
  PendingLeetCodeImport,
  Problem,
  ProblemList,
  ProblemTombstone,
  ReviewEvent,
  ReviewHistoryEntry,
  ReviewLogEntry,
  SyncStatus,
  TodayLeetCodeItem,
} from "@patternbank/core";

import type { CorePreferences } from "@patternbank/core";

/** Web has no platform-specific preference fields (mobile adds notifications). */
export type Preferences = CorePreferences;

// ─── Web-only types ───

export type ActiveTab = "dashboard" | "progress" | "problems";

export interface ToastState {
  visible: boolean;
  message: string;
  variant?: "success" | "error";
  action?: {
    label: string;
    onClick: () => void;
  };
}
