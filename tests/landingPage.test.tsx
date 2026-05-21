// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "../src/LandingPage";

type ObserverCallback = (
  entries: Array<{ isIntersecting: boolean; target: Element }>,
  observer: unknown,
) => void;

class IntersectionObserverMock {
  private readonly callback: ObserverCallback;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
  }

  observe = (target: Element) => {
    this.callback(
      [{ isIntersecting: true, target }],
      this,
    );
  };

  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = () => [];
}

vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Claude landing sections and LeetCode Sync story", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    expect(screen.getByText("Remember what")).toBeTruthy();
    const practicedText = screen.getByText("you practiced.");
    expect(practicedText).toBeTruthy();
    expect(practicedText.className).not.toContain("text-[#5e5e6e]");
    expect(screen.getByText("Now with LeetCode Sync")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Paste your username. Watch it fill." }),
    ).toBeTruthy();
    expect(screen.getByText(/No password, no token, no extension/i)).toBeTruthy();
    expect(screen.getByText("Connect your username")).toBeTruthy();
    expect(screen.getByText("Solves appear automatically")).toBeTruthy();
    expect(screen.getByText("Rate confidence to schedule review")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Spaced repetition compounds." }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Everything you need. Nothing you don't." }),
    ).toBeTruthy();
  });

  it("keeps Open app calls wired to the existing callback", () => {
    const onOpenApp = vi.fn();
    render(<LandingPage onOpenApp={onOpenApp} />);

    const openButtons = screen.getAllByRole("button", { name: /Open app/i });
    fireEvent.click(openButtons[0]);
    fireEvent.click(openButtons[openButtons.length - 1]);

    expect(onOpenApp).toHaveBeenCalledTimes(2);
  });

  it("opens and closes the App Store QR popover", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: /App Store/i })[0]);

    expect(screen.getByText("Get PatternBank on iOS")).toBeTruthy();
    expect(screen.getByAltText("App Store QR Code")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close App Store QR code" }));

    expect(screen.queryByText("Get PatternBank on iOS")).toBeNull();
  });

  it("renders V2 landing projection intervals and updates sliders", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    const mathSection = screen
      .getByRole("heading", { name: "Spaced repetition compounds." })
      .closest("section");
    expect(mathSection).not.toBeNull();

    const section = within(mathSection as HTMLElement);
    for (const label of ["1★ 1d", "2★ 2d", "3★ 5d", "4★ 10d", "5★ 30d"]) {
      expect(section.getAllByText((_, node) => node?.textContent === label).length).toBeGreaterThan(0);
    }

    const dailyReviews = section.getByLabelText("Daily reviews") as HTMLInputElement;
    fireEvent.change(dailyReviews, { target: { value: "8" } });

    expect(dailyReviews.value).toBe("8");
    expect(section.getByText("8")).toBeTruthy();
  });
});
