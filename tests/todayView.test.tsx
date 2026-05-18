// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodayView from "../src/components/TodayView";
import type {
  Confidence,
  LeetCodeProblem,
  LeetCodeSubmission,
  PendingLeetCodeImport,
  Problem,
  ReviewEvent,
  TodayLeetCodeItem,
} from "../src/types";

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-05-01",
    lastReviewed: null,
    nextReviewDate: "2026-05-14",
    updatedAt: "2026-05-01T12:00:00.000Z",
    ...overrides,
  };
}

function makeReviewEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    date: "2026-05-14",
    problemId: "p1",
    confidence: 4,
    patterns: ["Hash Table"],
    timestamp: "2026-05-14T21:14:00.000Z",
    ...overrides,
  };
}

function makePendingImport(overrides: Partial<PendingLeetCodeImport> = {}): PendingLeetCodeImport {
  return {
    submissionDbId: "sub-db-1",
    titleSlug: "number-of-islands",
    title: "Number of Islands",
    leetcodeNumber: 200,
    difficulty: "Medium",
    submittedAt: "2026-05-14T21:00:00.000Z",
    firstSeenAt: "2026-05-14T21:01:00.000Z",
    suggestedPatterns: ["BFS"],
    expired: false,
    ...overrides,
  };
}

function makeTodayLeetCodeItem(overrides: Partial<TodayLeetCodeItem> = {}): TodayLeetCodeItem {
  return {
    kind: "linked_existing",
    submissionDbId: "sub-db-1",
    titleSlug: "two-sum",
    title: "Two Sum",
    leetcodeNumber: 1,
    difficulty: "Easy",
    submittedAt: "2026-05-14T21:30:00.000Z",
    suggestedPatterns: ["Hash Table"],
    matchedProblemId: "p1",
    statusLabel: "Review due",
    confidence: 3,
    ...overrides,
  } as TodayLeetCodeItem;
}

function makeSubmission(overrides: Partial<LeetCodeSubmission> = {}): LeetCodeSubmission {
  return {
    id: "sub-db-1",
    userId: "user-1",
    leetcodeUsername: "derek113",
    leetcodeSubmissionId: "lc-sub-1",
    titleSlug: "two-sum",
    title: "Two Sum",
    leetcodeNumber: 1,
    difficulty: "Easy",
    submittedAt: "2026-05-14T21:30:00.000Z",
    problemId: "p1",
    status: "linked_existing",
    createdAt: "2026-05-14T21:31:00.000Z",
    updatedAt: "2026-05-14T21:31:00.000Z",
    ...overrides,
  };
}

function renderTodayView(overrides: {
  problems?: Problem[];
  reviewEvents?: ReviewEvent[];
  onReview?: (id: string, confidence: Confidence) => void;
  onDismiss?: (id: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onBulkAdd?: (problems: LeetCodeProblem[], patternMap?: Map<number, string[]> | null) => void;
  pendingLeetCodeImports?: PendingLeetCodeImport[];
  todayLeetCodeItems?: TodayLeetCodeItem[];
  onConfirmLeetCodeImport?: (item: PendingLeetCodeImport, confidence: Confidence) => void;
  onIgnoreLeetCodeImport?: (item: PendingLeetCodeImport) => void;
  leetcodeSubmissions?: LeetCodeSubmission[];
  onRateLeetCodeReview?: (submissionDbId: string, problemId: string, confidence: Confidence) => void | Promise<void>;
  showLeetCodeIntro?: boolean;
  leetcodeIntroSignedIn?: boolean;
  onOpenLeetCodeSettings?: () => void;
  onDismissLeetCodeIntro?: () => void;
} = {}) {
  return render(
    <TodayView
      problems={overrides.problems ?? [makeProblem()]}
      reviewEvents={overrides.reviewEvents ?? []}
      dailyGoal={5}
      hidePatterns={false}
      onReview={overrides.onReview ?? vi.fn()}
      onDismiss={overrides.onDismiss ?? vi.fn()}
      onUpdateNotes={overrides.onUpdateNotes ?? vi.fn()}
      onViewAllDue={vi.fn()}
      onAddClick={vi.fn()}
      onBulkAdd={overrides.onBulkAdd ?? vi.fn()}
      existingProblemNumbers={new Set([1])}
      pendingLeetCodeImports={overrides.pendingLeetCodeImports ?? []}
      todayLeetCodeItems={overrides.todayLeetCodeItems}
      onConfirmLeetCodeImport={overrides.onConfirmLeetCodeImport ?? vi.fn()}
      onIgnoreLeetCodeImport={overrides.onIgnoreLeetCodeImport ?? vi.fn()}
      leetcodeSubmissions={overrides.leetcodeSubmissions ?? []}
      onRateLeetCodeReview={overrides.onRateLeetCodeReview ?? vi.fn()}
      showLeetCodeIntro={overrides.showLeetCodeIntro}
      leetcodeIntroSignedIn={overrides.leetcodeIntroSignedIn}
      onOpenLeetCodeSettings={overrides.onOpenLeetCodeSettings}
      onDismissLeetCodeIntro={overrides.onDismissLeetCodeIntro}
      today="2026-05-14"
    />,
  );
}

describe("TodayView", () => {
  it("renders the Today header with a local display date", () => {
    renderTodayView();

    expect(screen.getByRole("heading", { name: "Today" })).toBeTruthy();
    expect(screen.getByText("Thursday, May 14")).toBeTruthy();
  });

  it("renders the V2 LeetCode intro card when requested", () => {
    const onOpen = vi.fn();
    const onDismiss = vi.fn();
    renderTodayView({
      showLeetCodeIntro: true,
      leetcodeIntroSignedIn: false,
      onOpenLeetCodeSettings: onOpen,
      onDismissLeetCodeIntro: onDismiss,
    });

    expect(screen.getByText("New in V2: LeetCode Activity")).toBeTruthy();
    expect(screen.getByText("Add your public LeetCode username to automatically track accepted solves and rate them in PatternBank.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sign in to set up LeetCode" }));
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss V2 LeetCode Activity intro" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses signed-in CTA copy for the V2 LeetCode intro", () => {
    renderTodayView({
      showLeetCodeIntro: true,
      leetcodeIntroSignedIn: true,
    });

    expect(screen.getByRole("button", { name: "Set up LeetCode Activity" })).toBeTruthy();
  });

  it("hides the V2 LeetCode intro card when not requested", () => {
    renderTodayView({ showLeetCodeIntro: false });

    expect(screen.queryByText("New in V2: LeetCode Activity")).toBeNull();
  });

  it("renders real due problems in Reviews due", () => {
    renderTodayView({ problems: [makeProblem({ title: "Binary Search" })] });

    expect(screen.getByText("Reviews due")).toBeTruthy();
    expect(screen.getByText("Binary Search")).toBeTruthy();
  });

  it("renders review card title before the problem number", () => {
    renderTodayView({ problems: [makeProblem({ title: "Two Sum", leetcodeNumber: 1 })] });

    const reviewsSection = screen.getByRole("region", { name: "Reviews due" });
    const titleRow = within(reviewsSection).getByText("#1").parentElement;
    const rowText = titleRow?.textContent ?? "";

    expect(rowText.indexOf("Two Sum")).toBeLessThan(rowText.indexOf("#1"));
  });

  it("calls onReview from the review flow", () => {
    const onReview = vi.fn();
    renderTodayView({ onReview });

    fireEvent.click(screen.getByRole("button", { name: /Review Now/i }));
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onReview).toHaveBeenCalledWith("p1", 4);
  });

  it("calls onDismiss when Dismiss is clicked", () => {
    const onDismiss = vi.fn();
    renderTodayView({ onDismiss });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledWith("p1");
  });

  it("calls onUpdateNotes when edited notes blur", () => {
    const onUpdateNotes = vi.fn();
    renderTodayView({ onUpdateNotes });

    fireEvent.click(screen.getByRole("button", { name: /Add notes/i }));
    const textarea = screen.getByPlaceholderText("Add notes...");
    fireEvent.change(textarea, { target: { value: "Remember the hash map" } });
    fireEvent.blur(textarea);

    expect(onUpdateNotes).toHaveBeenCalledWith("p1", "Remember the hash map");
  });

  it("hides Done today when there are no rows", () => {
    renderTodayView({ reviewEvents: [] });

    expect(screen.queryByText("Done today")).toBeNull();
  });

  it("renders Done today count and confidence rating", () => {
    renderTodayView({ reviewEvents: [makeReviewEvent()] });

    expect(screen.getByText("Done today")).toBeTruthy();
    const doneSection = screen.getByText("Done today").closest("section")!;
    expect(within(doneSection).getByText("1")).toBeTruthy();
    expect(within(doneSection).getByText("rated")).toBeTruthy();
    expect(within(doneSection).getByText("4★")).toBeTruthy();
  });

  it("does not render old Dashboard analytics", () => {
    renderTodayView();

    expect(screen.queryByText("Pattern Confidence")).toBeNull();
    expect(screen.queryByText("Total")).toBeNull();
  });

  it("renders Quick Start when the library is empty", () => {
    renderTodayView({ problems: [] });

    expect(screen.getByText("Welcome to PatternBank")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add Problem/i })).toBeTruthy();
  });

  it("renders From LeetCode only when pending imports exist", () => {
    const onConfirm = vi.fn();
    const onIgnore = vi.fn();
    renderTodayView({
      pendingLeetCodeImports: [makePendingImport()],
      onConfirmLeetCodeImport: onConfirm,
      onIgnoreLeetCodeImport: onIgnore,
    });

    expect(screen.getByText("From LeetCode")).toBeTruthy();
    expect(screen.getByText("Solved on LC today")).toBeTruthy();
    expect(screen.getByText("Number of Islands")).toBeTruthy();
    expect(screen.getByText("BFS")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Import Number of Islands with 4-star confidence" }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Number of Islands" }), 4);

    fireEvent.click(screen.getByRole("button", { name: "Ignore Number of Islands" }));
    expect(onIgnore).toHaveBeenCalledWith(expect.objectContaining({ title: "Number of Islands" }));
  });

  it("renders From LeetCode for already-linked solves with a seeded rating selector", () => {
    const onRate = vi.fn();
    renderTodayView({
      todayLeetCodeItems: [makeTodayLeetCodeItem()],
      leetcodeSubmissions: [makeSubmission()],
      onRateLeetCodeReview: onRate,
    });

    const leetcodeSection = screen.getByText("From LeetCode").closest("section")!;
    const title = within(leetcodeSection).getByRole("heading", { name: "Two Sum" });
    const problemNumber = within(leetcodeSection).getByText("#1");
    const titleRowText = problemNumber.parentElement?.textContent ?? "";
    expect(title).toBeTruthy();
    expect(titleRowText.indexOf("Two Sum")).toBeLessThan(titleRowText.indexOf("#1"));
    expect(title.className).toContain("text-[15px]");
    expect(problemNumber.className).toContain("text-[13px]");
    expect(within(leetcodeSection).getByText("Hash Table").className).toContain("rounded-full");
    expect(within(leetcodeSection).getByText("Hash Table").className).toContain("border");
    expect(within(leetcodeSection).getByText("Easy").className).toContain("border");
    expect(within(leetcodeSection).queryByText("LEETCODE")).toBeNull();
    expect(within(leetcodeSection).queryByText("Review due")).toBeNull();
    expect(within(leetcodeSection).queryByRole("button", { name: "Import Two Sum with 4-star confidence" })).toBeNull();
    expect(within(leetcodeSection).queryByRole("button", { name: "Ignore Two Sum" })).toBeNull();
    expect(within(leetcodeSection).queryByText(/^Solved \d{1,2}:/)).toBeNull();
    expect(within(leetcodeSection).getByText("Rate confidence")).toBeTruthy();
    expect(within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 1-star confidence" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 2-star confidence" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 3-star confidence" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 4-star confidence" }).getAttribute("aria-pressed")).toBe("false");

    const rateButton = within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 4-star confidence" });
    fireEvent.click(rateButton);
    expect(onRate).toHaveBeenCalledWith("sub-db-1", "p1", 4);
    expect((rateButton as HTMLButtonElement).disabled).toBe(true);

    const doneSection = screen.getByText("Done today").closest("section")!;
    expect(within(doneSection).getByText("solved on LC · review due")).toBeTruthy();
  });

  it("fills intermediate known LeetCode stars while previewing a higher confidence", () => {
    renderTodayView({
      todayLeetCodeItems: [makeTodayLeetCodeItem({ confidence: 2 })],
      leetcodeSubmissions: [makeSubmission()],
    });

    const leetcodeSection = screen.getByText("From LeetCode").closest("section")!;
    const thirdStar = within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 3-star confidence" });
    const fourthStar = within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 4-star confidence" });

    fireEvent.mouseEnter(fourthStar);

    expect(thirdStar.className.split(/\s+/)).toContain("text-pb-star");
    expect(fourthStar.className.split(/\s+/)).toContain("text-pb-star");
    expect(fourthStar.className.split(/\s+/)).toContain("h-7");
    expect(fourthStar.className.split(/\s+/)).toContain("w-7");
    expect(fourthStar.className).toContain("text-[19px]");
    expect(fourthStar.className).toContain("border-pb-star");
  });

  it("updates known LeetCode rating copy after first log and later confidence changes", async () => {
    const onRate = vi.fn();
    renderTodayView({
      todayLeetCodeItems: [makeTodayLeetCodeItem({ confidence: 3 })],
      leetcodeSubmissions: [makeSubmission()],
      onRateLeetCodeReview: onRate,
    });

    const leetcodeSection = screen.getByText("From LeetCode").closest("section")!;
    const thirdStar = within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 3-star confidence" });
    const fourthStar = within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 4-star confidence" });

    fireEvent.click(thirdStar);
    expect(within(leetcodeSection).getByText("New confidence logged")).toBeTruthy();
    expect(onRate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect((thirdStar as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(thirdStar);
    expect(within(leetcodeSection).getByText("New confidence logged")).toBeTruthy();
    expect(within(leetcodeSection).queryByText("Confidence updated")).toBeNull();
    expect(onRate).toHaveBeenCalledTimes(1);

    fireEvent.click(fourthStar);
    expect(within(leetcodeSection).getByText("Confidence updated")).toBeTruthy();
    expect(onRate).toHaveBeenCalledWith("sub-db-1", "p1", 4);
    expect(onRate).toHaveBeenCalledTimes(2);
  });

  it("keeps logged known LeetCode rating state after refresh and ignores same-confidence reselects", () => {
    const onRate = vi.fn();
    renderTodayView({
      todayLeetCodeItems: [
        makeTodayLeetCodeItem({
          confidence: 4,
          reviewedTodayConfidence: 4,
        } as Partial<TodayLeetCodeItem>),
      ],
      leetcodeSubmissions: [makeSubmission({ status: "rated" })],
      reviewEvents: [makeReviewEvent({ confidence: 4 })],
      onRateLeetCodeReview: onRate,
    });

    const leetcodeSection = screen.getByText("From LeetCode").closest("section")!;
    const fourthStar = within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 4-star confidence" });
    const fifthStar = within(leetcodeSection).getByRole("button", { name: "Rate Two Sum with 5-star confidence" });

    expect(within(leetcodeSection).getByText("New confidence logged")).toBeTruthy();

    fireEvent.click(fourthStar);
    expect(onRate).not.toHaveBeenCalled();
    expect(within(leetcodeSection).getByText("New confidence logged")).toBeTruthy();

    fireEvent.click(fifthStar);
    expect(onRate).toHaveBeenCalledWith("sub-db-1", "p1", 5);
    expect(within(leetcodeSection).getByText("Confidence updated")).toBeTruthy();
  });

  it("shows missing confidence copy on known LeetCode cards without a matched confidence", () => {
    renderTodayView({
      todayLeetCodeItems: [makeTodayLeetCodeItem({ confidence: null })],
      leetcodeSubmissions: [makeSubmission()],
    });

    const leetcodeSection = screen.getByText("From LeetCode").closest("section")!;
    expect(within(leetcodeSection).getByText("No confidence recorded")).toBeTruthy();
    expect(within(leetcodeSection).getByLabelText("No confidence recorded for Two Sum")).toBeTruthy();
    expect(within(leetcodeSection).queryByRole("button", { name: "Rate Two Sum with 3-star confidence" })).toBeNull();
  });

  it("hides Quick Start when today's LeetCode section has linked activity", () => {
    renderTodayView({
      problems: [],
      todayLeetCodeItems: [makeTodayLeetCodeItem({
        statusLabel: "In library",
        matchedProblemId: null,
      })],
    });

    expect(screen.getByText("From LeetCode")).toBeTruthy();
    expect(screen.queryByText("Welcome to PatternBank")).toBeNull();
  });

  it("shows pending LeetCode imports instead of Quick Start when the library is empty", () => {
    renderTodayView({
      problems: [],
      pendingLeetCodeImports: [makePendingImport({ suggestedPatterns: [] })],
    });

    expect(screen.getByText("From LeetCode")).toBeTruthy();
    expect(screen.queryByText("Welcome to PatternBank")).toBeNull();
  });

  it("shows a Solved on LC today badge on due review cards matched to today's LeetCode solves", () => {
    renderTodayView({
      leetcodeSubmissions: [makeSubmission()],
    });

    const reviewsSection = screen.getByText("Reviews due").closest("section")!;
    expect(within(reviewsSection).getByText("Hash Table").className).toContain("rounded-full");
    expect(within(reviewsSection).getByText("Hash Table").className).toContain("border");
    expect(within(reviewsSection).getByText("Easy").className).toContain("border");
    expect(screen.getByText("Solved on LC today")).toBeTruthy();
  });

  it("renders PatternBank and LeetCode Done today rows together", () => {
    renderTodayView({
      problems: [
        makeProblem({ id: "p1", title: "Two Sum", leetcodeNumber: 1 }),
        makeProblem({
          id: "p2",
          title: "Number of Islands",
          leetcodeNumber: 200,
          difficulty: "Medium",
          nextReviewDate: "2026-05-20",
        }),
        makeProblem({
          id: "p3",
          title: "LRU Cache",
          leetcodeNumber: 146,
          difficulty: "Medium",
          nextReviewDate: "2026-05-20",
        }),
      ],
      reviewEvents: [makeReviewEvent({ problemId: "p1" })],
      leetcodeSubmissions: [
        makeSubmission({
          id: "sub-imported",
          problemId: "p2",
          title: "Number of Islands",
          leetcodeNumber: 200,
          difficulty: "Medium",
          status: "imported",
        }),
        makeSubmission({
          id: "sub-rated",
          problemId: "p3",
          title: "LRU Cache",
          leetcodeNumber: 146,
          difficulty: "Medium",
          status: "rated",
          submittedAt: "2026-05-14T20:00:00.000Z",
        }),
      ],
    });

    const doneSection = screen.getByText("Done today").closest("section")!;
    const importedTitleRow = within(doneSection).getByText("#200").parentElement;
    const importedTitleText = importedTitleRow?.textContent ?? "";
    expect(within(doneSection).getByText("rated")).toBeTruthy();
    expect(within(doneSection).getByText("solved on LC · imported")).toBeTruthy();
    expect(within(doneSection).getByText("solved on LC · rated")).toBeTruthy();
    expect(importedTitleText.indexOf("Number of Islands")).toBeLessThan(importedTitleText.indexOf("#200"));
  });

  it("opens Rate star controls and disables them after selecting a confidence", () => {
    const onRate = vi.fn();
    renderTodayView({
      problems: [makeProblem({ nextReviewDate: "2026-05-14", lastReviewed: null })],
      leetcodeSubmissions: [makeSubmission()],
      onRateLeetCodeReview: onRate,
    });

    fireEvent.click(screen.getByRole("button", { name: "Rate Two Sum" }));
    const rateButton = screen.getByRole("button", { name: "Rate Two Sum with 4-star confidence" });
    fireEvent.click(rateButton);

    expect(onRate).toHaveBeenCalledWith("sub-db-1", "p1", 4);
    expect((rateButton as HTMLButtonElement).disabled).toBe(true);
  });
});
