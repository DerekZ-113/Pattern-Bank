// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CORE_PATTERNS, PROBLEM_LISTS } from "@patternbank/core";
import LandingPage from "../src/LandingPage";

const APP_STORE_URL = "https://apps.apple.com/app/patternbank/id6759760762";

/** A laptop: a pointer that hovers. A phone has neither. */
function stubPointer(fine: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: fine,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function sectionOf(headingName: string | RegExp): HTMLElement {
  const section = screen.getByRole("heading", { name: headingName }).closest("section");
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubPointer(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens with the headline and says what the app does in plain words", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline.textContent).toBe("Remember whatyou practiced.");
    // One-colour headline: no accent-coloured or gradient word.
    expect(headline.innerHTML).not.toMatch(/text-pb-accent|bg-clip-text|bg-gradient/);
    expect(
      screen.getByText(/brings each LeetCode problem back just before you would forget it/i),
    ).toBeTruthy();
    expect(screen.getByText("Free. No account needed to start.")).toBeTruthy();
    // LeetCode sync is no longer news.
    expect(screen.queryByText(/Now with LeetCode Sync/i)).toBeNull();
  });

  it("has five sections, each said once", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "How it works",
      "Start with what you have already done",
      "See which patterns need work",
      "Good to know",
      "Start remembering what you already solved.",
    ]);
  });

  it("keeps our own vocabulary off the page", () => {
    const { container } = render(<LandingPage onOpenApp={vi.fn()} />);

    expect(container.textContent).not.toMatch(
      /\bV2\b|\bSRS\b|OAuth|server-side|local-first|account-backed|tint language|No ceremony/i,
    );
  });

  it("explains the loop with the review gaps the scheduler really uses", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    const how = within(sectionOf("How it works"));
    expect(how.getByRole("heading", { name: "Add what you have solved" })).toBeTruthy();
    expect(how.getByRole("heading", { name: "Rate how it went" })).toBeTruthy();
    expect(how.getByRole("heading", { name: "Review what is due" })).toBeTruthy();
    expect(how.getByText(/1, 2, 5, 10 or 30 days away/)).toBeTruthy();
  });

  it("names every curated list the app can import", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    const start = within(sectionOf("Start with what you have already done"));
    for (const list of PROBLEM_LISTS) {
      expect(start.getByText(list.name)).toBeTruthy();
    }
    expect(start.getByText(/No password, no browser extension/)).toBeTruthy();
  });

  it("shows the Today screen first, as a picture built from the app's own cards", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    const today = screen.getByRole("img", { name: /Sample of the Today screen/i });
    expect(today.textContent).toContain("3 of 5 done");
    expect(today.textContent).toContain("Longest Palindromic Substring");
    expect(today.textContent).toContain("Review Now");
  });

  it("uses the app's pattern names in the Progress sample", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    const sample = screen.getByRole("img", { name: /Sample of pattern confidence/i });
    for (const pattern of CORE_PATTERNS) {
      expect(within(sample).getAllByText(pattern, { ignore: "script,style" }).length).toBeGreaterThan(0);
    }
    expect(sample.textContent).not.toMatch(/Arrays|Trees|Graphs/);
  });

  it("leaves nothing in a sample that can be focused or pressed", () => {
    const { container } = render(<LandingPage onOpenApp={vi.fn()} />);

    const samples = container.querySelectorAll("[data-landing-sample]");
    expect(samples.length).toBe(3);
    for (const sample of samples) {
      for (const control of sample.querySelectorAll("button, a, input, textarea, [tabindex]")) {
        expect(control.closest("[inert]")).not.toBeNull();
      }
    }
    // The only controls a visitor can reach are real ones.
    for (const control of container.querySelectorAll("button, a, input")) {
      if (control.closest("[inert]")) continue;
      const isRealLink = control.tagName === "A" && control.getAttribute("href");
      const isRealInput = control.tagName === "INPUT";
      const isRealButton =
        control.tagName === "BUTTON" && /Open (the )?app/i.test(control.textContent ?? "");
      expect(isRealLink || isRealInput || isRealButton).toBeTruthy();
    }
  });

  it("is complete when it loads, with nothing waiting to fade in", () => {
    const { container } = render(<LandingPage onOpenApp={vi.fn()} />);

    for (const element of container.querySelectorAll<HTMLElement>("[style]")) {
      expect(element.style.opacity === "" || element.style.opacity === "1").toBe(true);
    }
  });

  it("keeps Open app calls wired to the existing callback", () => {
    const onOpenApp = vi.fn();
    render(<LandingPage onOpenApp={onOpenApp} />);

    const openButtons = screen.getAllByRole("button", { name: /Open (the )?app/i });
    expect(openButtons.length).toBe(3);
    fireEvent.click(openButtons[0]);
    fireEvent.click(openButtons[openButtons.length - 1]);

    expect(onOpenApp).toHaveBeenCalledTimes(2);
  });

  it("shows the App Store QR code on a laptop and closes it again", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    const links = screen.getAllByRole("link", { name: /Get the iPhone app/i });
    expect(links.length).toBe(2);
    for (const link of links) expect(link.getAttribute("href")).toBe(APP_STORE_URL);

    fireEvent.click(links[0]);

    const dialog = screen.getByRole("dialog", { name: "Get PatternBank on iPhone" });
    expect(within(dialog).getByAltText("App Store QR code")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(links[1]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("goes straight to the App Store on a phone", () => {
    stubPointer(false);
    render(<LandingPage onOpenApp={vi.fn()} />);

    const link = screen.getAllByRole("link", { name: /Get the iPhone app/i })[0];
    const notPrevented = fireEvent.click(link);

    expect(notPrevented).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the 30-day calculator, with labels a visitor can read", () => {
    render(<LandingPage onOpenApp={vi.fn()} />);

    const section = within(sectionOf("See which patterns need work"));
    for (const label of ["1★ 1d", "2★ 2d", "3★ 5d", "4★ 10d", "5★ 30d"]) {
      expect(section.getAllByText((_, node) => node?.textContent === label).length).toBeGreaterThan(0);
    }
    expect(section.getByLabelText("New problems per week")).toBeTruthy();
    expect(section.getByText(/Rated 4 or 5 stars/)).toBeTruthy();
    expect(section.getByText(/minutes a day/)).toBeTruthy();
    expect(section.queryByText(/Mastery|Est\. time/)).toBeNull();

    const dailyReviews = section.getByLabelText("Daily reviews") as HTMLInputElement;
    fireEvent.change(dailyReviews, { target: { value: "8" } });

    expect(dailyReviews.value).toBe("8");
    expect(section.getByText("8")).toBeTruthy();
  });
});
