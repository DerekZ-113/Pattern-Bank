import type { Confidence } from "../types";
import type { LeetCodeActivityResult } from "./activityData";
import type { LeetCodeCompletionIdentity } from "./todayCompletions";

export interface RateLeetCodeReviewLocallyFirstParams {
  submissionDbId: string;
  problemId: string;
  confidence: Confidence;
  completionSource?: LeetCodeCompletionIdentity;
  onReview: (problemId: string, confidence: Confidence, options?: { replaceSameDayReviewEvent?: boolean }) => void;
  markRated: (submissionDbId: string, problemId: string) => Promise<LeetCodeActivityResult>;
  onLocalReviewRecorded?: (source: LeetCodeCompletionIdentity & { submissionDbId: string }, problemId: string) => void;
  onError?: (error: string) => void;
}

export async function rateLeetCodeReviewLocallyFirst({
  submissionDbId,
  problemId,
  confidence,
  completionSource,
  onReview,
  markRated,
  onLocalReviewRecorded,
  onError,
}: RateLeetCodeReviewLocallyFirstParams): Promise<LeetCodeActivityResult> {
  onReview(problemId, confidence, { replaceSameDayReviewEvent: true });
  onLocalReviewRecorded?.({ ...completionSource, submissionDbId }, problemId);
  const result = await markRated(submissionDbId, problemId);
  if (result.error) onError?.(result.error);
  return result;
}
