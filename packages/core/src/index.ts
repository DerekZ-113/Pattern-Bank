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
export * from "./spacedRepetition";
export * from "./progressVisuals";
export * from "./progressUtils";
export * from "./leetcode/importTransforms";
export * from "./leetcode/problemLists";
export {
  default as LEETCODE_PROBLEMS,
  searchProblems,
  getProblemByNumber,
  buildLeetCodeUrl,
} from "./leetcode/problems";

/** Placeholder export proving the workspace wiring; replaced as modules extract. */
export const CORE_PACKAGE_NAME = "@patternbank/core";
