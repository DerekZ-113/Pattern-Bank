// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import Header from "../src/components/Header";
import NavBar from "../src/components/NavBar";
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

describe("Header navigation slot", () => {
  it("hosts the primary nav inside the banner, once", () => {
    const onTabChange = vi.fn();
    render(
      <Header
        {...baseProps}
        nav={<NavBar activeTab="dashboard" onTabChange={onTabChange} />}
      />
    );

    const banner = screen.getByRole("banner");
    const nav = within(banner).getByRole("navigation", { name: "Primary" });
    // One element serves both the phone tab bar and the desktop header tabs,
    // so each destination is announced exactly once.
    expect(within(nav).getAllByRole("button")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Today" })).toHaveLength(1);

    fireEvent.click(within(nav).getByRole("button", { name: "Progress" }));
    expect(onTabChange).toHaveBeenCalledWith("progress");
  });

  it("renders without a nav", () => {
    render(<Header {...baseProps} />);

    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("names the wordmark without adding a second page heading", () => {
    render(<Header {...baseProps} />);

    expect(screen.getByText("PatternBank")).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
