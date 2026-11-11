import { getProgressConfidenceTint, PROGRESS_CONFIDENCE_TINTS } from "@patternbank/core";
import { CONFIDENCE_COLORS, CONFIDENCE_LEVELS, confidenceColor, confidenceLevel } from "../src/utils/confidence";

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
