// Thin shim over @patternbank/core's LeetCode activity factory (constructed
// once in cloudData.ts). Kept as a module so existing import sites and
// vi.mock("../src/utils/leetcodeActivityData") targets stay stable.
import { leetcodeActivityData } from "./cloudData";

export {
  LEETCODE_RECENT_ACTIVITY_LIMIT,
  normalizeLeetCodeUsername,
  sanitizeLeetCodeActivityError,
  toLeetCodeConnection,
  toLeetCodeSubmission,
  toLeetCodeIgnoredImport,
  type LeetCodeActivityFunctionResponse,
  type LeetCodeActivityResult,
} from "@patternbank/core";

export const {
  fetchLeetCodeConnection,
  fetchRecentLeetCodeSubmissions,
  fetchLeetCodeIgnoredImports,
  connectLeetCodeActivity,
  syncLeetCodeActivity,
  disconnectLeetCodeActivity,
  markLeetCodeImportImported,
  markLeetCodeImportLinkedExisting,
  ignoreLeetCodeImport,
  restoreIgnoredLeetCodeImport,
  markLeetCodeSubmissionRated,
} = leetcodeActivityData;
