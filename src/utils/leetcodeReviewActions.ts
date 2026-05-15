import type { Confidence } from "../types";
import type { LeetCodeActivityResult } from "./leetcodeActivityData";

interface RateLeetCodeReviewLocallyFirstParams {
  submissionDbId: string;
  problemId: string;
  confidence: Confidence;
  onReview: (problemId: string, confidence: Confidence) => void;
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
  onReview(problemId, confidence);
  const result = await markRated(submissionDbId, problemId);
  if (result.error) onError?.(result.error);
  return result;
}
