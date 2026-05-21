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

  it("renders redesigned projection controls and range copy", () => {
    renderProgress();

    expect(screen.getByText("INPUTS")).toBeTruthy();
    expect(screen.getByLabelText("Daily reviews")).toBeTruthy();
    expect(screen.getByLabelText("New / week")).toBeTruthy();
    expect(screen.getByText(/AT DAY 18/i)).toBeTruthy();
    expect(screen.getByText("Mastered")).toBeTruthy();
    expect(screen.getByText(/Range shows realistic \(70% advancement\) to optimistic \(100% advancement\) outcomes/i)).toBeTruthy();

    const dailySlider = screen.getByLabelText("Daily reviews") as HTMLInputElement;
    expect(dailySlider.max).toBe("20");
    fireEvent.change(dailySlider, { target: { value: "7" } });

    expect(dailySlider.value).toBe("7");
  });

  it("lets keyboard users explore another projection day", () => {
    renderProgress();

    const dayControl = screen.getByRole("slider", {
      name: "Explore projection day",
    });
    expect(dayControl.getAttribute("aria-valuenow")).toBe("18");

    fireEvent.keyDown(dayControl, { key: "ArrowLeft" });

    expect(dayControl.getAttribute("aria-valuenow")).toBe("17");
    expect(screen.getByText(/AT DAY 17/i)).toBeTruthy();
  });

  it("maps pointer exploration to the plotted projection area", () => {
    renderProgress();

    const dayControl = screen.getByRole("slider", {
      name: "Explore projection day",
    });
    vi.spyOn(dayControl, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 0,
      left: 100,
      top: 0,
      right: 760,
      bottom: 348,
      width: 660,
      height: 348,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(dayControl, { clientX: 138 });
    expect(dayControl.getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByText(/AT DAY 0/i)).toBeTruthy();
    expect(screen.getByTestId("projection-cursor-label").getAttribute("transform")).toBe(
      "translate(58, 6)",
    );

    fireEvent.pointerDown(dayControl, { clientX: 710 });
    expect(dayControl.getAttribute("aria-valuenow")).toBe("30");
    expect(screen.getByText(/AT DAY 30/i)).toBeTruthy();
    expect(screen.getByTestId("projection-cursor-label").getAttribute("transform")).toBe(
      "translate(602, 6)",
    );
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
