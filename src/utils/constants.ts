// Shared constants live in @patternbank/core; this module re-exports them so
// web code keeps importing from "./constants".
export {
  CORE_PATTERNS,
  DATA_RESET_KEY,
  DEFAULT_PREFERENCES,
  DIFFICULTIES,
  EXTRA_PATTERNS,
  getVisiblePatterns,
  groupPatternsByCategory,
  PATTERN_CATEGORIES,
  PREFERENCES_KEY,
  PROBLEM_TOMBSTONES_KEY,
  REVIEW_EVENTS_KEY,
  REVIEW_EVENTS_PRUNED_BEFORE_KEY,
  REVIEW_LOG_KEY,
  STORAGE_KEY,
} from "@patternbank/core";
