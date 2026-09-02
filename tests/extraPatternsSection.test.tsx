// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import ExtraPatternsSection from "../src/components/ExtraPatternsSection";
import { EXTRA_PATTERNS } from "../src/utils/constants";

describe("ExtraPatternsSection", () => {
  it("renders a toggle for every extra pattern, including Database", () => {
    render(<ExtraPatternsSection enabledExtraPatterns={[]} onToggle={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(EXTRA_PATTERNS.length);
    expect(screen.getByRole("button", { name: "Database" })).toBeTruthy();
  });

  it("reports toggles through onToggle", () => {
    const onToggle = vi.fn();
    render(<ExtraPatternsSection enabledExtraPatterns={[]} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "Database" }));

    expect(onToggle).toHaveBeenCalledWith("Database");
  });

  it("shows the switch as on only for enabled patterns", () => {
    render(<ExtraPatternsSection enabledExtraPatterns={["Database"]} onToggle={vi.fn()} />);

    const database = screen.getByRole("button", { name: "Database" });
    const intervals = screen.getByRole("button", { name: "Intervals" });
    expect(database.querySelector(".bg-pb-accent")).not.toBeNull();
    expect(intervals.querySelector(".bg-pb-accent")).toBeNull();
  });
});
