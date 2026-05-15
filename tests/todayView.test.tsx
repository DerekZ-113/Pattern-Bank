// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodayView from "../src/components/TodayView";
import type { Confidence, LeetCodeProblem, Problem, ReviewEvent } from "../src/types";

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

function renderTodayView(overrides: {
  problems?: Problem[];
  reviewEvents?: ReviewEvent[];
  onReview?: (id: string, confidence: Confidence) => void;
  onDismiss?: (id: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onBulkAdd?: (problems: LeetCodeProblem[], patternMap?: Map<number, string[]> | null) => void;
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

  it("renders real due problems in Reviews due", () => {
    renderTodayView({ problems: [makeProblem({ title: "Binary Search" })] });

    expect(screen.getByText("Reviews due")).toBeTruthy();
    expect(screen.getByText("Binary Search")).toBeTruthy();
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
});
