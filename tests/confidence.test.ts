import { getProgressConfidenceTint, PROGRESS_CONFIDENCE_TINTS } from "@patternbank/core";
import css from "../src/index.css?raw";
import {
  CONFIDENCE_COLORS,
  CONFIDENCE_LEVELS,
  CONFIDENCE_TEXT_COLORS,
  confidenceColor,
  confidenceLevel,
  confidenceTextColor,
  confidenceTileStyle,
} from "../src/utils/confidence";

describe("confidenceLevel", () => {
  it("rounds halves up onto the 1–5 scale", () => {
    expect(confidenceLevel(1)).toBe(1);
    expect(confidenceLevel(1.49)).toBe(1);
    expect(confidenceLevel(1.5)).toBe(2);
    expect(confidenceLevel(2.5)).toBe(3);
    expect(confidenceLevel(3.5)).toBe(4);
    expect(confidenceLevel(4.49)).toBe(4);
    expect(confidenceLevel(4.5)).toBe(5);
    expect(confidenceLevel(5)).toBe(5);
  });

  it("clamps out-of-range and non-finite averages instead of indexing off the scale", () => {
    expect(confidenceLevel(0)).toBe(1);
    expect(confidenceLevel(-3)).toBe(1);
    expect(confidenceLevel(9)).toBe(5);
    expect(confidenceLevel(Number.NaN)).toBe(1);
  });

  // Web paints with its own theme-aware colours, but must bin averages exactly
  // where core (and therefore mobile) does, or the two apps would disagree
  // about which patterns are strong.
  it("bins every average the same way core's progress tints do", () => {
    for (let average = 1; average <= 5; average += 0.05) {
      const coreIndex = PROGRESS_CONFIDENCE_TINTS.indexOf(getProgressConfidenceTint(average, 1));
      expect(confidenceLevel(average), `average ${average.toFixed(2)}`).toBe(coreIndex + 1);
    }
  });
});

describe("confidenceColor", () => {
  it("gives each level its own theme variable", () => {
    const colors = CONFIDENCE_LEVELS.map((level) => CONFIDENCE_COLORS[level]);
    expect(new Set(colors).size).toBe(5);
    expect(colors.every((color) => /^var\(--color-pb-conf-[1-5]\)$/.test(color))).toBe(true);
  });

  it("colours an average by its level", () => {
    expect(confidenceColor(3.2)).toBe(CONFIDENCE_COLORS[3]);
    expect(confidenceColor(4.6)).toBe(CONFIDENCE_COLORS[5]);
  });
});

describe("confidence text colours", () => {
  it("has a text-safe variant of every level", () => {
    const colors = CONFIDENCE_LEVELS.map((level) => CONFIDENCE_TEXT_COLORS[level]);
    expect(new Set(colors).size).toBe(5);
    expect(colors.every((color) => /^var\(--color-pb-conf-text-[1-5]\)$/.test(color))).toBe(true);
  });

  it("picks the text colour by level", () => {
    expect(confidenceTextColor(1.2)).toBe(CONFIDENCE_TEXT_COLORS[1]);
    expect(confidenceTextColor(3.9)).toBe(CONFIDENCE_TEXT_COLORS[4]);
  });
});

describe("confidenceTileStyle", () => {
  it("tints the fill and the edge with the level's colour", () => {
    const style = confidenceTileStyle(4.2);

    expect(style.backgroundColor).toContain(CONFIDENCE_COLORS[4]);
    expect(style.borderColor).toContain(CONFIDENCE_COLORS[4]);
    // A wash over the card surface, so it follows the theme.
    expect(style.backgroundColor).toContain("var(--color-pb-surface)");
  });

  it("gives each level a different tile", () => {
    const fills = CONFIDENCE_LEVELS.map((level) => confidenceTileStyle(level).backgroundColor);
    expect(new Set(fills).size).toBe(5);
  });
});

describe("confidence tokens", () => {
  // Every level needs a fill and a text colour in both themes; a missing one
  // would silently paint nothing.
  it("defines each fill and text variable for dark and light", () => {
    for (const level of CONFIDENCE_LEVELS) {
      for (const name of [`--color-pb-conf-${level}`, `--color-pb-conf-text-${level}`]) {
        expect(css.split(`${name}:`).length - 1, name).toBe(2);
      }
    }
  });
});
