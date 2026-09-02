// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import PatternSelector from "../src/components/PatternSelector";

function section(name: string): HTMLElement {
  const heading = screen.getByText(name);
  return heading.parentElement as HTMLElement;
}

describe("PatternSelector", () => {
  it("renders Data Structures and Strategies section labels", () => {
    render(<PatternSelector selected={[]} onChange={vi.fn()} />);

    expect(screen.getByText("Data Structures")).toBeTruthy();
    expect(screen.getByText("Strategies")).toBeTruthy();
  });

  it("places Array under Data Structures and Math under Strategies", () => {
    render(<PatternSelector selected={[]} onChange={vi.fn()} />);

    expect(within(section("Data Structures")).getByRole("button", { name: "Array" })).toBeTruthy();
    expect(within(section("Strategies")).getByRole("button", { name: "Math" })).toBeTruthy();
    expect(within(section("Data Structures")).queryByRole("button", { name: "Math" })).toBeNull();
  });

  it("renders enabled extras inside their natural section, not a separate block", () => {
    render(<PatternSelector selected={[]} onChange={vi.fn()} enabledExtraPatterns={["Intervals"]} />);

    expect(within(section("Strategies")).getByRole("button", { name: "Intervals" })).toBeTruthy();
  });

  it("renders Database under Strategies when enabled", () => {
    render(<PatternSelector selected={[]} onChange={vi.fn()} enabledExtraPatterns={["Database"]} />);

    expect(within(section("Strategies")).getByRole("button", { name: "Database" })).toBeTruthy();
  });

  it("hides Database until it is enabled", () => {
    render(<PatternSelector selected={[]} onChange={vi.fn()} enabledExtraPatterns={[]} />);

    expect(screen.queryByRole("button", { name: "Database" })).toBeNull();
  });

  it("still renders a selected extra that is no longer enabled (edit case)", () => {
    render(<PatternSelector selected={["Mono Stack"]} onChange={vi.fn()} enabledExtraPatterns={[]} />);

    expect(within(section("Strategies")).getByRole("button", { name: "Mono Stack" })).toBeTruthy();
  });

  it("renders a selected unknown pattern in a trailing custom group", () => {
    render(<PatternSelector selected={["My Custom Thing"]} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "My Custom Thing" })).toBeTruthy();
  });

  it("toggles patterns through onChange", () => {
    const onChange = vi.fn();
    render(<PatternSelector selected={["Array"]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Math" }));
    expect(onChange).toHaveBeenCalledWith(["Array", "Math"]);

    fireEvent.click(screen.getByRole("button", { name: "Array" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("renders the error message", () => {
    render(<PatternSelector selected={[]} onChange={vi.fn()} error="Pick at least one" />);

    expect(screen.getByText("Pick at least one")).toBeTruthy();
  });
});
