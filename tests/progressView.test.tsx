// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProgressView from "../src/components/ProgressView";
import type { Problem, ReviewEvent, ReviewLogEntry } from "../src/types";

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

function buildProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "problem-1",
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
    updatedAt: "2026-05-14T10:00:00.000Z",
    ...overrides,
  };
}

const reviewLog: ReviewLogEntry[] = [
  { date: "2026-05-12" },
  { date: "2026-05-13" },
];

const reviewEvents: ReviewEvent[] = [
  {
    date: "2026-05-12",
    problemId: "problem-1",
    confidence: 3,
    patterns: ["Hash Table"],
    timestamp: "2026-05-12T10:00:00.000Z",
  },
  {
    date: "2026-05-13",
    problemId: "problem-2",
    confidence: 4,
    patterns: ["DP"],
    timestamp: "2026-05-13T10:00:00.000Z",
  },
];

function renderProgress({
  problems = [
    buildProblem(),
    buildProblem({
      id: "problem-2",
      title: "Longest Increasing Subsequence",
      leetcodeNumber: 300,
      difficulty: "Medium",
      patterns: ["DP"],
      confidence: 4,
    }),
  ],
  onPatternClick = vi.fn(),
}: {
  problems?: Problem[];
  onPatternClick?: (pattern: string) => void;
} = {}) {
  render(
    <ProgressView
      problems={problems}
      reviewLog={reviewLog}
      reviewEvents={reviewEvents}
      enabledExtraPatterns={[]}
      onPatternClick={onPatternClick}
    />,
  );
  return { onPatternClick };
}

describe("ProgressView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the V2 Progress header and overview stats", () => {
    renderProgress();

    expect(
      screen.getByRole("heading", { name: "Progress", level: 1 }),
    ).toBeTruthy();
    expect(
      screen.getByText("Patterns, streaks, and review history"),
    ).toBeTruthy();
    expect(screen.getByText("Total Problems")).toBeTruthy();
    expect(screen.getByText("Total Reviews")).toBeTruthy();
    expect(screen.getByText("Active Days")).toBeTruthy();
    expect(screen.getByText("Current Streak")).toBeTruthy();
    expect(screen.getByText("Avg Confidence")).toBeTruthy();

    const overview = screen.getByLabelText("Progress overview");
    expect(Array.from(overview.children)).toHaveLength(5);
  });

  it("renders Patterns heatmap and preserves pattern click behavior", () => {
    const { onPatternClick } = renderProgress();

    expect(
      screen.getByRole("heading", { name: "Patterns", level: 2 }),
    ).toBeTruthy();

    const section = screen
      .getByRole("heading", { name: "Patterns" })
      .closest("section");
    expect(section).not.toBeNull();

    const hashTableCell = within(section as HTMLElement).getByRole("button", {
      name: /Hash Table.*1 problem.*average confidence 3\.0/i,
    });
    fireEvent.click(hashTableCell);

    expect(onPatternClick).toHaveBeenCalledWith("Hash Table");
  });

  it("keeps the existing analytics sections visible", () => {
    renderProgress();

    expect(screen.getByText("Review Activity")).toBeTruthy();
    expect(screen.getByText("Confidence Trend")).toBeTruthy();
    expect(screen.getByText("30-Day Projection")).toBeTruthy();
    expect(screen.getByText("Confidence Spread")).toBeTruthy();
    expect(screen.getByText("Top Patterns")).toBeTruthy();
    expect(screen.getAllByText(/1★/).some((el) => el.textContent?.includes("1d interval"))).toBe(true);
    expect(screen.getAllByText(/2★/).some((el) => el.textContent?.includes("2d interval"))).toBe(true);
    expect(screen.getAllByText(/5★/).some((el) => el.textContent?.includes("30d interval"))).toBe(true);
  });

  it("renders the Progress empty state when there are no problems", () => {
    renderProgress({ problems: [] });

    expect(screen.getByText("No progress yet")).toBeTruthy();
    expect(
      screen.getByText(
        "Add problems and complete reviews to see patterns, streaks, and trends.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Patterns")).toBeNull();
  });
});
