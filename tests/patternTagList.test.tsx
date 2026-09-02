// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import PatternTagList from "../src/components/PatternTagList";
import { PATTERN_COLORS } from "../src/utils/constants";

function renderedLabels(container: HTMLElement): string[] {
  // Pills and dividers in DOM order; dividers render as "|" placeholders.
  return [...container.querySelectorAll("span")]
    .filter((el) => el.textContent !== "" || el.dataset.testid === "pattern-group-divider")
    .filter((el) => !el.querySelector("span"))
    .map((el) => (el.dataset.testid === "pattern-group-divider" ? "|" : el.textContent!.trim()));
}

describe("PatternTagList", () => {
  it("renders pills grouped structures | strategies | custom with dividers between non-empty groups", () => {
    const { container } = render(
      <div>
        <PatternTagList patterns={["DP", "Array", "Custom X", "Tree"]} />
      </div>
    );

    expect(renderedLabels(container)).toEqual(["Array", "Tree", "|", "DP", "|", "Custom X"]);
  });

  it("renders no divider when all patterns fall in one group", () => {
    render(
      <div>
        <PatternTagList patterns={["DP", "Two Pointers"]} />
      </div>
    );

    expect(screen.queryAllByTestId("pattern-group-divider")).toHaveLength(0);
  });

  it("renders one divider between two non-empty groups", () => {
    render(
      <div>
        <PatternTagList patterns={["Array", "DP"]} />
      </div>
    );

    const dividers = screen.getAllByTestId("pattern-group-divider");
    expect(dividers).toHaveLength(1);
    expect(dividers[0].getAttribute("aria-hidden")).toBe("true");
  });

  it("preserves stored order within groups without mutating the input", () => {
    const patterns = Object.freeze(["Trie", "Math", "Array"]) as unknown as string[];
    const { container } = render(
      <div>
        <PatternTagList patterns={patterns} />
      </div>
    );

    expect(renderedLabels(container)).toEqual(["Trie", "Array", "|", "Math"]);
    expect(patterns).toEqual(["Trie", "Math", "Array"]);
  });

  it("files the opt-in Database pattern under strategies", () => {
    const { container } = render(
      <div>
        <PatternTagList patterns={["Database", "Array"]} />
      </div>
    );

    expect(renderedLabels(container)).toEqual(["Array", "|", "Database"]);
  });

  it("renders nothing for an empty pattern list", () => {
    const { container } = render(
      <div data-testid="wrap">
        <PatternTagList patterns={[]} />
      </div>
    );

    expect(container.querySelector("[data-testid='wrap']")!.childElementCount).toBe(0);
  });
});

describe("PATTERN_COLORS", () => {
  it("has entries for the new Array and Math patterns", () => {
    expect(PATTERN_COLORS["Array"]).toBeDefined();
    expect(PATTERN_COLORS["Math"]).toBeDefined();
  });

  it("has an entry for the opt-in Database pattern", () => {
    expect(PATTERN_COLORS["Database"]).toBeDefined();
  });
});
