// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("../src/utils/supabaseData", () => ({
  submitFeedback: vi.fn().mockResolvedValue({ error: null }),
}));

import SettingsModal from "../src/components/SettingsModal";
import { DEFAULT_PREFERENCES } from "../src/utils/constants";

type Props = ComponentProps<typeof SettingsModal>;

function renderSettings(overrides: Partial<Props> = {}) {
  const props: Props = {
    isOpen: true,
    onClose: vi.fn(),
    preferences: { ...DEFAULT_PREFERENCES, dailyReviewGoal: 5 },
    onUpdatePreferences: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
    onBulkAdd: vi.fn(),
    problemCount: 3,
    existingProblemNumbers: new Set<number>(),
    user: null,
    leetcodeActivity: {
      connection: null,
      loading: false,
      actionLoading: false,
      error: null,
      connect: vi.fn(),
      syncNow: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as Props["leetcodeActivity"],
    onSignInGoogle: vi.fn().mockResolvedValue({ error: null }),
    onSignInGitHub: vi.fn().mockResolvedValue({ error: null }),
    onSignInApple: vi.fn().mockResolvedValue({ error: null }),
    onSignOut: vi.fn().mockResolvedValue(undefined),
    onSetAllDue: vi.fn(),
    onRequestClearData: vi.fn(),
    upcomingScheduleInfo: null,
    onRequestRespread: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<SettingsModal {...props} />) };
}

/** The card a control sits in. */
function groupOf(element: HTMLElement): HTMLElement {
  const group = element.closest("[data-settings-group]");
  expect(group).not.toBeNull();
  return group as HTMLElement;
}

describe("SettingsModal", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light");
  });

  afterEach(() => {
    document.documentElement.classList.remove("light");
  });

  it("lays the settings out as titled groups, in the same order as the iPhone app", () => {
    renderSettings();

    const dialog = screen.getByRole("dialog", { name: "Settings" });
    const titles = within(dialog)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual([
      "Account",
      "LeetCode Activity",
      "Appearance",
      "Daily review goal",
      "Review",
      "iPhone app",
      "About",
    ]);
    // Seven titled groups, and four that need no title: additional patterns,
    // adding problems, data and feedback, and the danger zone.
    expect(dialog.querySelectorAll("[data-settings-group]").length).toBe(11);
  });

  it("spells the sign-in buttons out", () => {
    const { props } = renderSettings();

    const apple = screen.getByRole("button", { name: "Sign in with Apple" });
    expect(apple.textContent).toBe("Sign in with Apple");
    expect(screen.getByRole("button", { name: "Sign in with Google" }).textContent).toBe("Sign in with Google");
    expect(screen.getByRole("button", { name: "Sign in with GitHub" }).textContent).toBe("Sign in with GitHub");
    expect(within(groupOf(apple)).getByText("Sign in to sync your data across devices.")).toBeTruthy();

    fireEvent.click(apple);
    expect(props.onSignInApple).toHaveBeenCalledTimes(1);
  });

  it("shows who is signed in, with a way out", () => {
    const { props } = renderSettings({
      user: { id: "u1", email: "ada@example.com", user_metadata: { full_name: "Ada Lovelace" } } as unknown as Props["user"],
    });

    const signOut = screen.getByRole("button", { name: "Sign Out" });
    expect(within(groupOf(signOut)).getByText("Ada Lovelace")).toBeTruthy();
    expect(within(groupOf(signOut)).getByText("ada@example.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Sign in with/ })).toBeNull();

    fireEvent.click(signOut);
    expect(props.onSignOut).toHaveBeenCalledTimes(1);
  });

  it("puts the theme choice on one row and switches it", () => {
    renderSettings();

    const dark = screen.getByRole("button", { name: "Dark" });
    const light = screen.getByRole("button", { name: "Light" });
    expect(within(groupOf(dark)).getByText("Theme")).toBeTruthy();
    expect(dark.getAttribute("aria-pressed")).toBe("true");
    expect(light.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(light);

    expect(screen.getByRole("button", { name: "Light" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("puts the daily goal on a row with its stepper, and explains it underneath", () => {
    const { props } = renderSettings();

    const input = screen.getByLabelText<HTMLInputElement>(/daily review goal/i);
    const group = within(groupOf(input));
    expect(input.value).toBe("5");
    expect(group.getByText("Reviews per day")).toBeTruthy();
    expect(group.getByText(/Caps how many reviews appear on Today each day/)).toBeTruthy();

    fireEvent.click(group.getByRole("button", { name: "Increase daily goal" }));
    expect(props.onUpdatePreferences).toHaveBeenCalledWith({ dailyReviewGoal: 6 });
  });

  it("names the hide-patterns switch by what it does", () => {
    const { props } = renderSettings();

    const toggle = screen.getByRole("switch", { name: "Hide patterns during review" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(within(groupOf(toggle)).getByText(/Test your pattern recognition/)).toBeTruthy();

    fireEvent.click(toggle);
    expect(props.onUpdatePreferences).toHaveBeenCalledWith({ hidePatternsDuringReview: true });
  });

  it("keeps the longer sections closed until their row is pressed", () => {
    const { props } = renderSettings();

    for (const name of ["Additional patterns", "Import problem list", "Bulk add", "Data", "Feedback", "Danger zone"]) {
      expect(screen.getByRole("button", { name }).getAttribute("aria-expanded")).toBe("false");
    }
    expect(screen.queryByRole("button", { name: "Clear all data" })).toBeNull();

    const danger = screen.getByRole("button", { name: "Danger zone" });
    fireEvent.click(danger);
    expect(danger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(within(groupOf(danger)).getByRole("button", { name: "Clear all data" }));
    expect(props.onRequestClearData).toHaveBeenCalledTimes(1);

    const data = screen.getByRole("button", { name: "Data" });
    fireEvent.click(data);
    expect(within(groupOf(data)).getByRole("button", { name: /Import Backup/ })).toBeTruthy();
    // Data and Feedback share a group, as they do on iPhone.
    expect(groupOf(data)).toBe(groupOf(screen.getByRole("button", { name: "Feedback" })));
    expect(groupOf(screen.getByRole("button", { name: "Import problem list" }))).toBe(
      groupOf(screen.getByRole("button", { name: "Bulk add" })),
    );
  });

  it("turns an additional pattern on from its row", () => {
    const { props } = renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Additional patterns" }));
    fireEvent.click(screen.getByRole("button", { name: "Intervals" }));

    expect(props.onUpdatePreferences).toHaveBeenCalledWith({ enabledExtraPatterns: ["Intervals"] });
  });

  it("points to the iPhone app and says who built this", () => {
    renderSettings();

    const groups = screen.getAllByRole("heading", { level: 3 });
    const iphone = groupOf(groups.find((heading) => heading.textContent === "iPhone app") as HTMLElement);
    expect(within(iphone).getAllByText("Get PatternBank for iPhone").length).toBeGreaterThan(0);
    expect(within(iphone).getByText("Your data syncs automatically when signed in.")).toBeTruthy();

    const builtBy = screen.getByRole("link", { name: /Built by Derek Zhang/ });
    expect(builtBy.getAttribute("href")).toBe("https://linkedin.com/in/derekz113");
  });

  it("closes on Escape and from its close button", () => {
    const { props } = renderSettings();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));

    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it("renders nothing while closed", () => {
    renderSettings({ isOpen: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
