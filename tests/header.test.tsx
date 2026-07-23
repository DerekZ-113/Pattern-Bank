// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import Header from "../src/components/Header";
import { formatLastSynced } from "../src/utils/format";

const baseProps = {
  onSettingsClick: vi.fn(),
  onHelpClick: vi.fn(),
  syncStatus: "idle" as const,
};

describe("Header LeetCode sync button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders no sync button without the leetcodeSync prop", () => {
    render(<Header {...baseProps} />);

    expect(screen.queryByRole("button", { name: "Sync LeetCode activity" })).toBeNull();
    expect(screen.getByRole("button", { name: "Help" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
  });

  it("renders the sync button with a last-synced tooltip", () => {
    const lastSyncedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    render(
      <Header
        {...baseProps}
        leetcodeSync={{ syncing: false, lastSyncedAt, onSyncNow: vi.fn() }}
      />
    );

    const button = screen.getByRole("button", { name: "Sync LeetCode activity" });
    expect(button.getAttribute("title")).toBe(formatLastSynced(lastSyncedAt));
  });

  it("fires onSyncNow when clicked", () => {
    const onSyncNow = vi.fn();
    render(
      <Header
        {...baseProps}
        leetcodeSync={{ syncing: false, lastSyncedAt: null, onSyncNow }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Sync LeetCode activity" }));
    expect(onSyncNow).toHaveBeenCalledTimes(1);
  });

  it("disables the button while syncing", () => {
    const onSyncNow = vi.fn();
    render(
      <Header
        {...baseProps}
        leetcodeSync={{ syncing: true, lastSyncedAt: null, onSyncNow }}
      />
    );

    const button = screen.getByRole("button", { name: "Sync LeetCode activity" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(onSyncNow).not.toHaveBeenCalled();
  });
});
