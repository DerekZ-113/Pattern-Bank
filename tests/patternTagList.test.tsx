// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import PatternTag from "../src/components/PatternTag";
import PatternTagList from "../src/components/PatternTagList";
import css from "../src/index.css?raw";
import { CORE_PATTERNS, EXTRA_PATTERNS, PATTERN_COLORS } from "../src/utils/constants";

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
  it("has a colour row for every core and extra pattern", () => {
    for (const pattern of [...CORE_PATTERNS, ...EXTRA_PATTERNS]) {
      expect(PATTERN_COLORS[pattern], pattern).toBeDefined();
    }
  });

  // A row that points at a variable nobody defined renders an invisible chip,
  // and nothing else would notice. Each variable must exist for both themes.
  it("only references variables that index.css defines for dark and light", () => {
    for (const [pattern, color] of Object.entries(PATTERN_COLORS)) {
      for (const value of [color.text, color.bg]) {
        const name = value.match(/^var\((--color-pattern-[a-z-]+)\)$/)?.[1];
        expect(name, `${pattern}: ${value}`).toBeDefined();
        expect(css.split(`${name}:`).length - 1, `${pattern}: ${name}`).toBe(2);
      }
    }
  });
});

describe("PatternTag", () => {
  it("wears the pattern's own colour", () => {
    render(<PatternTag name="Hash Table" />);

    const chip = screen.getByText("Hash Table");
    expect(chip.style.color).toBe(PATTERN_COLORS["Hash Table"].text);
    expect(chip.style.backgroundColor).toBe(PATTERN_COLORS["Hash Table"].bg);
  });

  it("gives every pattern a colour of its own", () => {
    const patterns = [...CORE_PATTERNS, ...EXTRA_PATTERNS];
    render(
      <div>
        {patterns.map((pattern) => (
          <PatternTag key={pattern} name={pattern} />
        ))}
      </div>
    );

    const colors = patterns.map((pattern) => screen.getByText(pattern).style.color);
    expect(new Set(colors).size).toBe(patterns.length);
  });

  it("falls back to the accent for a pattern it has no colour for", () => {
    render(<PatternTag name="My Custom Pattern" />);

    const chip = screen.getByText("My Custom Pattern");
    expect(chip.getAttribute("style")).toBeNull();
    expect(chip.className).toContain("text-pb-accent");
  });
});
