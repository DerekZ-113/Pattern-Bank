// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

import TodayView from "../src/components/TodayView";
import type { Problem, ReviewEvent } from "../src/types";

const TODAY = "2026-05-14";

function due(id: string, overrides: Partial<Problem> = {}): Problem {
  return {
    id,
    title: `Problem ${id}`,
    leetcodeNumber: null,
    url: null,
    difficulty: "Easy",
    patterns: ["Array"],
    confidence: 2,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-05-01",
    lastReviewed: null,
    nextReviewDate: TODAY,
    updatedAt: "2026-05-01T12:00:00.000Z",
    ...overrides,
  };
}

/** A problem rated today: it has left the due list and sits in Done today. */
function reviewed(id: string): { problem: Problem; event: ReviewEvent } {
  return {
    problem: due(id, { lastReviewed: TODAY, nextReviewDate: "2026-05-20", confidence: 4 }),
    event: { date: TODAY, problemId: id, confidence: 4, patterns: ["Array"], timestamp: `${TODAY}T15:00:00.000Z` },
  };
}

type Props = ComponentProps<typeof TodayView>;

function renderToday(overrides: Partial<Props> = {}) {
  const props: Props = {
    problems: [due("a"), due("b"), due("c")],
    reviewEvents: [],
    dailyGoal: 5,
    onReview: vi.fn(),
    onDismiss: vi.fn(),
    onUpdateNotes: vi.fn(),
    onViewAllDue: vi.fn(),
    onAddClick: vi.fn(),
    onBulkAdd: vi.fn(),
    existingProblemNumbers: new Set<number>(),
    today: TODAY,
    ...overrides,
  };
  return { props, ...render(<TodayView {...props} />) };
}

function doneSection(): HTMLElement {
  return screen.getByRole("heading", { name: "Done today" }).closest("section") as HTMLElement;
}

function emptySlots(): Element[] {
  return Array.from(doneSection().querySelectorAll("[data-goal-slot]"));
}

describe("Today goal slots", () => {
  it("shows one empty slot for each review in today's goal before anything is done", () => {
    renderToday();

    // Three are due and the goal is five, so today's real goal is three.
    expect(within(doneSection()).getByText("0 of 3")).toBeTruthy();
    expect(emptySlots().length).toBe(3);
    // One slot on the right for every review card on the left.
    expect(screen.getAllByRole("button", { name: "Review Now" }).length).toBe(3);
  });

  it("caps the slots at the daily goal when more are due", () => {
    renderToday({ problems: ["a", "b", "c", "d", "e", "f", "g"].map((id) => due(id)), dailyGoal: 5 });

    expect(within(doneSection()).getByText("0 of 5")).toBeTruthy();
    expect(emptySlots().length).toBe(5);
  });

  it("fills from the top: done rows first, the remaining slots under them", () => {
    const first = reviewed("a");
    renderToday({ problems: [first.problem, due("b"), due("c")], reviewEvents: [first.event] });

    const section = doneSection();
    expect(within(section).getByText("1 of 3")).toBeTruthy();
    expect(within(section).getByText("Problem a")).toBeTruthy();
    expect(emptySlots().length).toBe(2);
    const row = within(section).getByText("Problem a");
    expect(row.compareDocumentPosition(emptySlots()[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("has no empty slots once the goal is met, and says so", () => {
    const a = reviewed("a");
    const b = reviewed("b");
    renderToday({ problems: [a.problem, b.problem, due("c"), due("d")], reviewEvents: [a.event, b.event], dailyGoal: 2 });

    expect(within(doneSection()).getByText("Goal met · 2")).toBeTruthy();
    expect(emptySlots().length).toBe(0);
  });

  it("keeps empty slots out of the way of screen readers and off narrow screens", () => {
    renderToday();

    for (const slot of emptySlots()) {
      expect(slot.getAttribute("aria-hidden")).toBe("true");
      expect(slot.className).toContain("max-lg:hidden");
    }
    // With nothing done there is nothing to show on a narrow screen at all.
    expect(doneSection().className).toContain("max-lg:hidden");
  });

  it("keeps the section on narrow screens once there is something in it", () => {
    const first = reviewed("a");
    renderToday({ problems: [first.problem, due("b")], reviewEvents: [first.event] });

    expect(doneSection().className ?? "").not.toContain("max-lg:hidden");
  });

  it("tells a signed-out visitor what the slots are for and offers sign-in", () => {
    const onOpenLeetCodeSettings = vi.fn();
    renderToday({ signedIn: false, leetcodeConnected: false, onOpenLeetCodeSettings });

    const section = within(doneSection());
    expect(section.getByText(/Rate a review and it lands here\./)).toBeTruthy();
    fireEvent.click(section.getByRole("button", { name: "Sign in to log LeetCode solves too" }));
    expect(onOpenLeetCodeSettings).toHaveBeenCalledTimes(1);
  });

  it("offers the LeetCode connection to someone signed in without it", () => {
    renderToday({ signedIn: true, leetcodeConnected: false, onOpenLeetCodeSettings: vi.fn() });

    const section = within(doneSection());
    expect(section.getByRole("button", { name: "Connect LeetCode to log solves too" })).toBeTruthy();
    expect(section.queryByRole("button", { name: /Sign in/ })).toBeNull();
  });

  it("only explains, with nothing left to set up, once LeetCode is connected", () => {
    renderToday({ signedIn: true, leetcodeConnected: true, onOpenLeetCodeSettings: vi.fn() });

    const section = within(doneSection());
    expect(section.getByText("Rate a review, or solve on LeetCode, and it lands here.")).toBeTruthy();
    expect(section.queryByRole("button", { name: /LeetCode/ })).toBeNull();
  });

  it("drops the explanation once something is done", () => {
    const first = reviewed("a");
    renderToday({ problems: [first.problem, due("b")], reviewEvents: [first.event], onOpenLeetCodeSettings: vi.fn() });

    expect(within(doneSection()).queryByText(/lands here/)).toBeNull();
  });

  it("shows no slots when nothing is due and nothing is done", () => {
    renderToday({ problems: [due("a", { nextReviewDate: "2026-06-01" })] });

    expect(screen.queryByRole("heading", { name: "Done today" })).toBeNull();
  });

  it("shows no slots on the first-run screen", () => {
    renderToday({ problems: [] });

    expect(screen.queryByRole("heading", { name: "Done today" })).toBeNull();
  });

  it("keeps the column in view while the reviews scroll", () => {
    renderToday();

    const column = doneSection().parentElement as HTMLElement;
    expect(column.className).toContain("lg:sticky");
    expect(column.className).toContain("lg:self-start");
  });
});
