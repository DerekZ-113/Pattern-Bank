// Thin shim over @patternbank/core's cloud-data factory (constructed once in
// cloudData.ts). Kept as a module so existing import sites and
// vi.mock("../src/utils/supabaseData") targets stay stable.
import { cloudData } from "./cloudData";

export { toSnakeCase, toCamelCase } from "@patternbank/core";

export const {
  fetchProblems,
  upsertProblem,
  upsertProblems,
  deleteProblem,
  deleteProblems,
  fetchProblemTombstones,
  upsertProblemTombstone,
  upsertProblemTombstones,
  fetchDataReset,
  upsertDataReset,
  fetchReviewLog,
  logReview,
  replaceReviewLog,
  fetchReviewEvents,
  batchInsertReviewLogs,
  fetchProblemReviewHistory,
  fetchPreferences,
  upsertPreferences,
  submitFeedback,
  deleteAllUserProblems,
  deleteAllUserReviewLog,
} = cloudData;
