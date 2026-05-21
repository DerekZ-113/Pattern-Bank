// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { User } from "@supabase/supabase-js";
import LeetCodeActivitySection from "../src/components/LeetCodeActivitySection";
import type { LeetCodeConnection } from "../src/types";

const user = { id: "user-1" } as User;

function renderSection(overrides: Partial<ComponentProps<typeof LeetCodeActivitySection>> = {}) {
  const props: ComponentProps<typeof LeetCodeActivitySection> = {
    user,
    connection: null,
    loading: false,
    actionLoading: false,
    error: null,
    onConnect: vi.fn(),
    onSyncNow: vi.fn(),
    onDisconnect: vi.fn(),
    ...overrides,
  };
  render(<LeetCodeActivitySection {...props} />);
  return props;
}

describe("LeetCodeActivitySection", () => {
  it("renders signed-out copy", () => {
    renderSection({ user: null });

    expect(screen.getByText("LeetCode Username")).toBeTruthy();
    expect(screen.getByText("Sign in before connecting with your LeetCode username.")).toBeTruthy();
  });

  it("renders not-connected username form", () => {
    renderSection();

    expect(screen.getByText("Track recent accepted submissions from your public LeetCode profile.")).toBeTruthy();
    expect(screen.getByLabelText("Public LeetCode username")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Track activity" })).toBeTruthy();
  });

  it("submits the username to onConnect", () => {
    const onConnect = vi.fn();
    renderSection({ onConnect });

    fireEvent.change(screen.getByLabelText("Public LeetCode username"), {
      target: { value: "derek113" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Track activity" }));

    expect(onConnect).toHaveBeenCalledWith("derek113");
  });

  it("renders connected state and action buttons", () => {
    const connection: LeetCodeConnection = {
      userId: "user-1",
      leetcodeUsername: "derek113",
      syncStatus: "synced",
      lastSyncedAt: "2026-05-15T09:00:00.000Z",
    };
    renderSection({ connection });

    expect(screen.getByText("Connected as derek113")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sync now" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
  });

  it("shows no-visible-submissions guidance", () => {
    const connection: LeetCodeConnection = {
      userId: "user-1",
      leetcodeUsername: "derek113",
      syncStatus: "no_visible_submissions",
      syncError: "No visible recent accepted submissions.",
    };
    renderSection({ connection });

    expect(
      screen.getByText(
        "We could not see recent accepted submissions. Check that recent submissions are visible on your public LeetCode profile.",
      ),
    ).toBeTruthy();
  });

  it("shows sanitized error text", () => {
    renderSection({ error: "LeetCode activity sync failed. Try again later." });

    expect(screen.getByText("LeetCode activity sync failed. Try again later.")).toBeTruthy();
  });
});
