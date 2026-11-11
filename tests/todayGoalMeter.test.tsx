// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import TodayGoalMeter from "../src/components/TodayGoalMeter";

function tiles(container: HTMLElement) {
  const all = [...container.querySelectorAll("[data-done]")];
  return {
    total: all.length,
    done: all.filter((tile) => tile.getAttribute("data-done") === "true").length,
  };
}

describe("TodayGoalMeter", () => {
  // Same wording as the toast a review shows ("2 of 5 done"), so the count
  // the user just saw in the toast is the count they find on the page.
  it("draws one tile per review in the goal and fills the ones done", () => {
    const { container } = render(<TodayGoalMeter reviewedToday={2} effectiveGoal={5} totalDueCount={3} />);

    expect(tiles(container)).toEqual({ total: 5, done: 2 });
    expect(screen.getByRole("img", { name: "2 of 5 reviews done today" })).toBeTruthy();
    expect(container.textContent).toContain("2 of 5 done today.");
  });

  it("mentions due problems the goal will not reach", () => {
    // 3 slots left in the goal, 9 due: 6 are beyond it.
    const { container } = render(<TodayGoalMeter reviewedToday={2} effectiveGoal={5} totalDueCount={9} />);

    expect(container.textContent).toContain("6 more due beyond today’s goal.");
  });

  it("says nothing about extra due problems when the goal covers them all", () => {
    const { container } = render(<TodayGoalMeter reviewedToday={2} effectiveGoal={5} totalDueCount={3} />);

    expect(container.textContent).not.toContain("more due");
  });

  it("celebrates a met goal and offers what is still due", () => {
    const { container } = render(<TodayGoalMeter reviewedToday={5} effectiveGoal={5} totalDueCount={4} />);

    expect(tiles(container)).toEqual({ total: 5, done: 5 });
    expect(container.textContent).toContain("Goal met, 5 done today.");
    expect(container.textContent).toContain("4 more due if you want to keep going.");
  });

  it("never draws more filled tiles than the goal when reviews exceed it", () => {
    const { container } = render(<TodayGoalMeter reviewedToday={8} effectiveGoal={5} totalDueCount={0} />);

    expect(tiles(container)).toEqual({ total: 5, done: 5 });
    expect(screen.getByRole("img", { name: "5 of 5 reviews done today" })).toBeTruthy();
    expect(container.textContent).toContain("Goal met, 8 done today.");
  });

  it("renders nothing when there is no goal to show", () => {
    const { container } = render(<TodayGoalMeter reviewedToday={0} effectiveGoal={0} totalDueCount={0} />);

    expect(container.firstChild).toBeNull();
  });
});
