import { describe, expect, it, vi } from "vitest";
import { rateLeetCodeReviewLocallyFirst } from "../src/utils/leetcodeReviewActions";

describe("rateLeetCodeReviewLocallyFirst", () => {
  it("reviews locally before marking the LeetCode submission rated", async () => {
    const calls: string[] = [];
    const onReview = vi.fn(() => calls.push("review"));
    const markRated = vi.fn(async () => {
      calls.push("mark-rated");
      return { data: null, error: null };
    });

    await rateLeetCodeReviewLocallyFirst({
      submissionDbId: "sub-db-1",
      problemId: "problem-1",
      confidence: 4,
      onReview,
      markRated,
    });

    expect(calls).toEqual(["review", "mark-rated"]);
    expect(onReview).toHaveBeenCalledWith("problem-1", 4);
    expect(markRated).toHaveBeenCalledWith("sub-db-1", "problem-1");
  });

  it("keeps the local review when marking the LeetCode submission rated fails", async () => {
    const onReview = vi.fn();
    const onError = vi.fn();
    const markRated = vi.fn(async () => ({ data: null, error: "LeetCode activity sync failed. Try again later." }));

    await rateLeetCodeReviewLocallyFirst({
      submissionDbId: "sub-db-1",
      problemId: "problem-1",
      confidence: 5,
      onReview,
      markRated,
      onError,
    });

    expect(onReview).toHaveBeenCalledWith("problem-1", 5);
    expect(onError).toHaveBeenCalledWith("LeetCode activity sync failed. Try again later.");
  });
});
