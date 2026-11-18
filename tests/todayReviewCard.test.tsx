// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodayReviewCard from "../src/components/TodayReviewCard";
import type { Problem } from "../src/types";

function problem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p5",
    title: "Longest Palindromic Substring",
    leetcodeNumber: 5,
    url: "https://leetcode.com/problems/longest-palindromic-substring/",
    difficulty: "Medium",
    patterns: ["DP", "Two Pointers"],
    confidence: 1,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-01-01",
    lastReviewed: "2026-01-02",
    nextReviewDate: "2026-01-03",
    updatedAt: "2026-01-02T09:00:00.000Z",
    ...overrides,
  };
}

function renderCard(overrides: Partial<Problem> = {}) {
  const handlers = { onReview: vi.fn(), onDismiss: vi.fn(), onUpdateNotes: vi.fn() };
  const view = render(<TodayReviewCard problem={problem(overrides)} {...handlers} />);
  return { ...view, ...handlers };
}

describe("TodayReviewCard actions", () => {
  it("keeps the quiet actions together, ahead of the main ones", () => {
    const { container } = renderCard();

    const quiet = container.querySelector<HTMLElement>("[data-card-actions='quiet']");
    const main = container.querySelector<HTMLElement>("[data-card-actions='main']");
    expect(quiet).not.toBeNull();
    expect(main).not.toBeNull();

    expect(within(quiet!).getByRole("button", { name: "Add notes" })).toBeTruthy();
    expect(within(quiet!).getByRole("button", { name: "Dismiss" })).toBeTruthy();
    expect(within(main!).getByRole("link", { name: /Open/ })).toBeTruthy();
    expect(within(main!).getByRole("button", { name: "Review Now" })).toBeTruthy();

    // Quiet first, so they take the left of a narrow card and the main pair the right.
    expect(quiet!.compareDocumentPosition(main!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(quiet!.parentElement).toBe(main!.parentElement);
  });

  it("lays the row out from the card's own width, not the window's", () => {
    const { container } = renderCard();

    // The same card is drawn full width on Today and in a narrow column
    // elsewhere, so its breakpoints have to follow the card.
    expect(container.querySelector("article")!.className).toContain("@container");
    const quiet = container.querySelector<HTMLElement>("[data-card-actions='quiet']")!;
    // A borderless button's padding is invisible; the group is pulled left by
    // that padding so its first label starts on the card's content edge.
    expect(quiet.className).toContain("-ml-2.5");
    for (const button of within(quiet).getAllByRole("button")) {
      expect(button.className).toContain("px-2.5!");
    }
  });

  it("still dismisses, opens notes and starts a review", () => {
    const { onDismiss } = renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledWith("p5");

    fireEvent.click(screen.getByRole("button", { name: "Add notes" }));
    expect(screen.getByPlaceholderText("Add notes...")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add notes" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Review Now" }));
    expect(screen.queryByRole("button", { name: "Review Now" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("keeps only the notes button while rating", () => {
    const { container } = renderCard({ notes: "Expand around each centre." });

    fireEvent.click(screen.getByRole("button", { name: "Review Now" }));

    const quiet = container.querySelector<HTMLElement>("[data-card-actions='quiet']")!;
    expect(within(quiet).getByRole("button", { name: "Show notes" })).toBeTruthy();
    expect(container.querySelector("[data-card-actions='main']")).toBeNull();
  });

  it("leaves no empty action groups behind", () => {
    const { container } = renderCard({ url: null });

    fireEvent.click(screen.getByRole("button", { name: "Add notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Review Now" }));

    expect(container.querySelector("[data-card-actions]")).toBeNull();
  });
});
