// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import TodayEarlierLeetCodeActivity from "../src/components/TodayEarlierLeetCodeActivity";
import { formatDisplayDate, type EarlierLeetCodeActivityDay } from "@patternbank/core";

function makeDay(overrides: Partial<EarlierLeetCodeActivityDay> = {}): EarlierLeetCodeActivityDay {
  return {
    date: "2026-05-13",
    rows: [
      {
        id: "sub-1",
        titleSlug: "two-sum",
        title: "Two Sum",
        leetcodeNumber: 1,
        difficulty: "Easy",
        submittedAt: "2026-05-13T15:30:00.000Z",
        problemId: "p1",
        confidence: null,
      },
    ],
    ...overrides,
  };
}

describe("TodayEarlierLeetCodeActivity", () => {
  it("renders nothing when there are no days", () => {
    const { container } = render(<TodayEarlierLeetCodeActivity days={[]} />);

    expect(container.childElementCount).toBe(0);
  });

  it("is collapsed by default and expands on toggle", () => {
    render(<TodayEarlierLeetCodeActivity days={[makeDay()]} />);

    const toggle = screen.getByRole("button", { name: "Show" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Two Sum")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe("today-earlier-leetcode-panel");
    expect(screen.getByText("Two Sum")).toBeTruthy();
    expect(screen.getByText(formatDisplayDate("2026-05-13"))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByText("Two Sum")).toBeNull();
  });

  it("shows the total row count in the section header", () => {
    const secondDay = makeDay({
      date: "2026-05-12",
      rows: [
        {
          id: "sub-2",
          titleSlug: "add-two-numbers",
          title: "Add Two Numbers",
          leetcodeNumber: 2,
          difficulty: "Medium",
          submittedAt: "2026-05-12T10:00:00.000Z",
          problemId: null,
          confidence: null,
        },
      ],
    });
    render(<TodayEarlierLeetCodeActivity days={[makeDay(), secondDay]} />);

    expect(screen.getByText("Earlier LeetCode activity")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("shows stars on rated rows and plain copy on unrated rows", () => {
    const day = makeDay({
      rows: [
        { ...makeDay().rows[0], confidence: 4 },
        {
          id: "sub-2",
          titleSlug: "add-two-numbers",
          title: "Add Two Numbers",
          leetcodeNumber: 2,
          difficulty: "Medium",
          submittedAt: "2026-05-13T10:00:00.000Z",
          problemId: "p2",
          confidence: null,
        },
      ],
    });
    render(<TodayEarlierLeetCodeActivity days={[day]} />);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(screen.getByText("4★")).toBeTruthy();
    expect(screen.getByText("rated")).toBeTruthy();
    expect(screen.getByText("solved on LC")).toBeTruthy();
  });

  it("omits the number and difficulty badge when unknown", () => {
    const day = makeDay({
      rows: [
        {
          id: "sub-3",
          titleSlug: "mystery",
          title: "Mystery Problem",
          leetcodeNumber: null,
          difficulty: null,
          submittedAt: "2026-05-13T09:00:00.000Z",
          problemId: null,
          confidence: null,
        },
      ],
    });
    render(<TodayEarlierLeetCodeActivity days={[day]} />);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(screen.getByText("Mystery Problem")).toBeTruthy();
    expect(screen.queryByText(/^#/)).toBeNull();
    expect(screen.queryByText("EASY")).toBeNull();
    expect(screen.queryByText("MEDIUM")).toBeNull();
  });

  it("makes titles clickable only with a problemId and a callback", () => {
    const onOpenProblemDetails = vi.fn();
    const day = makeDay({
      rows: [
        makeDay().rows[0],
        {
          id: "sub-2",
          titleSlug: "gone",
          title: "Gone Problem",
          leetcodeNumber: null,
          difficulty: null,
          submittedAt: "2026-05-13T09:00:00.000Z",
          problemId: null,
          confidence: null,
        },
      ],
    });
    render(<TodayEarlierLeetCodeActivity days={[day]} onOpenProblemDetails={onOpenProblemDetails} />);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    fireEvent.click(screen.getByRole("button", { name: "Two Sum" }));
    expect(onOpenProblemDetails).toHaveBeenCalledWith("p1");
    expect(screen.queryByRole("button", { name: "Gone Problem" })).toBeNull();
  });

  it("renders titles as plain text without the callback", () => {
    render(<TodayEarlierLeetCodeActivity days={[makeDay()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(screen.getByText("Two Sum")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Two Sum" })).toBeNull();
  });
});
