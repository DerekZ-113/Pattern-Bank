/**
 * @patternbank/core — shared domain logic for PatternBank web and mobile.
 *
 * Pure logic only: no UI, no Tailwind classes, no import-time side effects.
 * Platform concerns (storage, Supabase client, analytics) are injected via
 * adapters — see storage/adapter.ts and supabase/data.ts as they land.
 */

export * from "./types";
export * from "./constants";
export * from "./dateHelpers";
export * from "./hooks";
export * from "./spacedRepetition";
export * from "./progressVisuals";
export * from "./progressUtils";
export * from "./preferences";
export * from "./problemTransforms";
export * from "./projectionEngine";
export * from "./sync/fullSync";
export * from "./sync/merge";
export * from "./sync/reviewEvents";
export * from "./syncTimeout";
export * from "./todayView";
export * from "./storage/adapter";
export * from "./storage/logic";
export * from "./supabase/mapping";
export * from "./supabase/data";
export * from "./leetcode/activityData";
export * from "./leetcode/importTransforms";
export * from "./leetcode/problemLists";
export * from "./leetcode/reviewActions";
export * from "./leetcode/todayCompletions";
export * from "./leetcode/todayResolver";
export {
  default as LEETCODE_PROBLEMS,
  searchProblems,
  getProblemByNumber,
  buildLeetCodeUrl,
} from "./leetcode/problems";

/** Placeholder export proving the workspace wiring; replaced as modules extract. */
export const CORE_PACKAGE_NAME = "@patternbank/core";
