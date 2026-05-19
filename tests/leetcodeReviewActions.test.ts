import { describe, expect, it, vi } from "vitest";
import { rateLeetCodeReviewLocallyFirst } from "../src/utils/leetcodeReviewActions";

describe("rateLeetCodeReviewLocallyFirst", () => {
  it("reviews locally before marking the LeetCode submission rated", async () => {
    const calls: string[] = [];
    const onReview = vi.fn(() => calls.push("review"));
    const onLocalReviewRecorded = vi.fn(() => calls.push("completion"));
    const markRated = vi.fn(async () => {
      calls.push("mark-rated");
      return { data: null, error: null };
    });

    await rateLeetCodeReviewLocallyFirst({
      submissionDbId: "sub-db-1",
      problemId: "problem-1",
      completionSource: {
        submissionDbId: "sub-db-1",
        titleSlug: "two-sum",
        leetcodeNumber: 1,
      },
      confidence: 4,
      onReview,
      markRated,
      onLocalReviewRecorded,
    });

    expect(calls).toEqual(["review", "completion", "mark-rated"]);
    expect(onReview).toHaveBeenCalledWith("problem-1", 4, { replaceSameDayReviewEvent: true });
    expect(onLocalReviewRecorded).toHaveBeenCalledWith({
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
    }, "problem-1");
    expect(markRated).toHaveBeenCalledWith("sub-db-1", "problem-1");
  });

  it("falls back to the submission id when no completion source is provided", async () => {
    const onLocalReviewRecorded = vi.fn();
    const markRated = vi.fn(async () => ({ data: null, error: null }));

    await rateLeetCodeReviewLocallyFirst({
      submissionDbId: "sub-db-1",
      problemId: "problem-1",
      confidence: 4,
      onReview: vi.fn(),
      markRated,
      onLocalReviewRecorded,
    });

    expect(onLocalReviewRecorded).toHaveBeenCalledWith({ submissionDbId: "sub-db-1" }, "problem-1");
  });

  it("keeps the local review when marking the LeetCode submission rated fails", async () => {
    const onReview = vi.fn();
    const onError = vi.fn();
    const onLocalReviewRecorded = vi.fn();
    const markRated = vi.fn(async () => ({ data: null, error: "LeetCode activity sync failed. Try again later." }));

    await rateLeetCodeReviewLocallyFirst({
      submissionDbId: "sub-db-1",
      problemId: "problem-1",
      completionSource: {
        submissionDbId: "sub-db-1",
        titleSlug: "two-sum",
        leetcodeNumber: 1,
      },
      confidence: 5,
      onReview,
      markRated,
      onError,
      onLocalReviewRecorded,
    });

    expect(onReview).toHaveBeenCalledWith("problem-1", 5, { replaceSameDayReviewEvent: true });
    expect(onLocalReviewRecorded).toHaveBeenCalledWith({
      submissionDbId: "sub-db-1",
      titleSlug: "two-sum",
      leetcodeNumber: 1,
    }, "problem-1");
    expect(onError).toHaveBeenCalledWith("LeetCode activity sync failed. Try again later.");
  });
});
