import type { Confidence } from "../types";
import type { LeetCodeActivityResult } from "./leetcodeActivityData";

interface RateLeetCodeReviewLocallyFirstParams {
  submissionDbId: string;
  problemId: string;
  confidence: Confidence;
  onReview: (problemId: string, confidence: Confidence, options?: { replaceSameDayReviewEvent?: boolean }) => void;
  markRated: (submissionDbId: string, problemId: string) => Promise<LeetCodeActivityResult>;
  onError?: (error: string) => void;
}

export async function rateLeetCodeReviewLocallyFirst({
  submissionDbId,
  problemId,
  confidence,
  onReview,
  markRated,
  onError,
}: RateLeetCodeReviewLocallyFirstParams): Promise<LeetCodeActivityResult> {
  onReview(problemId, confidence, { replaceSameDayReviewEvent: true });
  const result = await markRated(submissionDbId, problemId);
  if (result.error) onError?.(result.error);
  return result;
}
