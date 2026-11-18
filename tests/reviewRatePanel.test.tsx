// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import ReviewRatePanel from "../src/components/ReviewRatePanel";
import type { Problem } from "../src/types";

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
    nextReviewDate: "2026-05-01",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ReviewRatePanel", () => {
  it("seeds the picker from the problem's current confidence", () => {
    render(<ReviewRatePanel problem={makeProblem()} onDone={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByRole("radiogroup", { name: "Rate Two Sum confidence" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "3 stars" }).getAttribute("aria-checked")).toBe("true");
  });

  it("reports the picked confidence on Done", () => {
    const onDone = vi.fn();
    render(<ReviewRatePanel problem={makeProblem()} onDone={onDone} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    expect(screen.getByRole("radio", { name: "5 stars" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "3 stars" }).getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onDone).toHaveBeenCalledWith(5);
  });

  it("reports the unchanged confidence on Done — a re-confirm is still a review", () => {
    const onDone = vi.fn();
    render(<ReviewRatePanel problem={makeProblem()} onDone={onDone} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onDone).toHaveBeenCalledWith(3);
  });

  it("calls onBack without reporting a review", () => {
    const onDone = vi.fn();
    const onBack = vi.fn();
    render(<ReviewRatePanel problem={makeProblem()} onDone={onDone} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("says what the selected rating will schedule, using the real intervals", () => {
    render(<ReviewRatePanel problem={makeProblem()} onDone={vi.fn()} onBack={vi.fn()} />);

    // Seeded at 3 stars: a 5-day interval.
    expect(screen.getByText("Next review in 5 days")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "1 star" }));
    expect(screen.getByText("Next review tomorrow")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(screen.getByText("Next review in 10 days")).toBeTruthy();
  });

  it("previews the schedule of a hovered star before it is picked", () => {
    const onDone = vi.fn();
    render(<ReviewRatePanel problem={makeProblem()} onDone={onDone} onBack={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole("radio", { name: "5 stars" }));
    expect(screen.getByText("Next review in 30 days")).toBeTruthy();

    // Hovering is not choosing.
    fireEvent.mouseLeave(screen.getByRole("radiogroup"));
    expect(screen.getByText("Next review in 5 days")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledWith(3);
  });

  it("shows the graduated interval for a repeated five-star review", () => {
    // Already at five stars once: the next five-star review graduates to 60 days.
    render(
      <ReviewRatePanel
        problem={makeProblem({ confidence: 5, fiveStarStreak: 1 })}
        onDone={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Next review in 60 days")).toBeTruthy();
  });

  it("offers an Open link only when the problem has a URL", () => {
    const { unmount } = render(<ReviewRatePanel problem={makeProblem()} onDone={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("https://leetcode.com/problems/two-sum/");
    unmount();

    render(<ReviewRatePanel problem={makeProblem({ url: "" })} onDone={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByRole("link", { name: "Open" })).toBeNull();
  });
});
