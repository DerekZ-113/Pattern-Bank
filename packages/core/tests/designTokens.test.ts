import { CORE_PATTERNS, EXTRA_PATTERNS } from "../src/constants";
import { DESIGN_TOKENS, patternTokenSlug } from "../src/designTokens";

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;
const RGBA = /^rgba\(\s*\d+,\s*\d+,\s*\d+,\s*(0|1|0?\.\d+)\s*\)$/;
const isColour = (v: string) => HEX.test(v) || RGBA.test(v);

describe("DESIGN_TOKENS", () => {
  it("has identical key sets in both palettes", () => {
    expect(Object.keys(DESIGN_TOKENS.light.colors).sort()).toEqual(
      Object.keys(DESIGN_TOKENS.dark.colors).sort(),
    );
    expect(Object.keys(DESIGN_TOKENS.light.patterns).sort()).toEqual(
      Object.keys(DESIGN_TOKENS.dark.patterns).sort(),
    );
  });

  it("holds only hex or rgba() colour literals", () => {
    for (const theme of ["dark", "light"] as const) {
      const p = DESIGN_TOKENS[theme];
      for (const [k, v] of Object.entries(p.colors)) {
        expect(isColour(v), `${theme} colors.${k} = ${v}`).toBe(true);
      }
      for (const [k, pair] of Object.entries(p.patterns)) {
        expect(isColour(pair.text), `${theme} patterns.${k}.text`).toBe(true);
        expect(isColour(pair.background), `${theme} patterns.${k}.background`).toBe(true);
      }
    }
  });

  it("is JSON round-trippable", () => {
    expect(JSON.parse(JSON.stringify(DESIGN_TOKENS))).toEqual(DESIGN_TOKENS);
  });

  it("patternTokenSlug resolves every constant pattern name in both palettes", () => {
    for (const name of [...CORE_PATTERNS, ...EXTRA_PATTERNS]) {
      const slug = patternTokenSlug(name);
      expect(slug, name).not.toBeNull();
      expect(DESIGN_TOKENS.dark.patterns).toHaveProperty(slug!);
      expect(DESIGN_TOKENS.light.patterns).toHaveProperty(slug!);
    }
    expect(patternTokenSlug("DP")).toBe("dp");
    expect(patternTokenSlug("Custom Thing")).toBeNull();
  });
});
