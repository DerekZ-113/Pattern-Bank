// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import ActivityRow, { RatedStars } from "../src/components/ActivityRow";

const timestamp = "2026-05-14T15:30:00.000Z";

describe("ActivityRow", () => {
  it("shows the problem, its number, difficulty, status line and time", () => {
    const { container } = render(
      <ActivityRow kind="review" title="Two Sum" leetcodeNumber={1} difficulty="Easy" timestamp={timestamp}>
        <span>rated</span>
      </ActivityRow>
    );

    expect(screen.getByText("Two Sum")).toBeTruthy();
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getByText("Easy")).toBeTruthy();
    expect(screen.getByText("rated")).toBeTruthy();
    expect(container.querySelector("time")!.getAttribute("datetime")).toBe(timestamp);
  });

  it("makes the title a button only when the row can open details", () => {
    const onOpen = vi.fn();
    const { rerender } = render(
      <ActivityRow kind="solve" title="Two Sum" timestamp={timestamp}>
        <span>solved on LC</span>
      </ActivityRow>
    );
    expect(screen.queryByRole("button", { name: "Two Sum" })).toBeNull();

    rerender(
      <ActivityRow kind="solve" title="Two Sum" timestamp={timestamp} onOpen={onOpen}>
        <span>solved on LC</span>
      </ActivityRow>
    );
    fireEvent.click(screen.getByRole("button", { name: "Two Sum" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("omits the number and difficulty when they are unknown", () => {
    render(
      <ActivityRow kind="solve" title="Custom problem" leetcodeNumber={null} difficulty={null} timestamp={timestamp}>
        <span>solved on LC</span>
      </ActivityRow>
    );

    expect(screen.queryByText(/^#/)).toBeNull();
    expect(screen.queryByText(/Easy|Medium|Hard/)).toBeNull();
  });
});

describe("RatedStars", () => {
  it("reads as a rating out of five", () => {
    render(<RatedStars confidence={4} />);

    expect(screen.getByRole("img", { name: "4 out of 5 stars" }).textContent).toBe("4★");
  });
});
