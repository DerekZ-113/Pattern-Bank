import css from "../src/index.css?raw";
import {
  CORE_PATTERNS,
  DESIGN_TOKENS,
  EXTRA_PATTERNS,
  PATTERN_CATEGORIES,
  patternTokenSlug,
} from "@patternbank/core";
import { PATTERN_COLORS } from "../src/utils/constants";

// Variables intentionally absent from DESIGN_TOKENS (not plain hex/rgba).
// None today; add the variable name here, with a reason, if one appears.
const ALLOWED_OMISSIONS: readonly string[] = [];

function blockAfter(opener: RegExp): string {
  const start = css.search(opener);
  if (start < 0) throw new Error(`no block matching ${opener}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  return css.slice(open + 1, close);
}

function parseVars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--color-((?:pb|pattern)-[a-z0-9-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

// Flatten a palette to CSS variable names (without the --color- prefix).
function flatten(p: { colors: Record<string, string>; patterns: Record<string, { text: string; background: string }> }) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.colors)) out[`pb-${k}`] = v;
  for (const [slug, pair] of Object.entries(p.patterns)) {
    out[`pattern-${slug}-text`] = pair.text;
    out[`pattern-${slug}-bg`] = pair.background;
  }
  return out;
}

const darkCss = parseVars(blockAfter(/^@theme\s*\{/m));
const lightOverrides = parseVars(blockAfter(/^html\.light\s*\{/m));
const lightCss = { ...darkCss, ...lightOverrides };

describe("design tokens match src/index.css", () => {
  const allowed = new Set(ALLOWED_OMISSIONS);
  const expectedDark = Object.fromEntries(Object.entries(darkCss).filter(([k]) => !allowed.has(k)));
  const expectedLight = Object.fromEntries(Object.entries(lightCss).filter(([k]) => !allowed.has(k)));

  it("dark palette equals the @theme block, variable for variable", () => {
    expect(Object.keys(darkCss).length).toBeGreaterThan(50);
    expect(flatten(DESIGN_TOKENS.dark)).toEqual(expectedDark);
  });

  it("light palette equals the dark block with html.light overrides applied", () => {
    expect(Object.keys(lightOverrides).length).toBeGreaterThan(20);
    expect(flatten(DESIGN_TOKENS.light)).toEqual(expectedLight);
  });

  it("light overrides only touch variables that exist in the dark block", () => {
    for (const k of Object.keys(lightOverrides)) expect(darkCss).toHaveProperty(k);
  });

  it("both palettes have identical key sets", () => {
    expect(Object.keys(DESIGN_TOKENS.light.colors).sort()).toEqual(
      Object.keys(DESIGN_TOKENS.dark.colors).sort(),
    );
    expect(Object.keys(DESIGN_TOKENS.light.patterns).sort()).toEqual(
      Object.keys(DESIGN_TOKENS.dark.patterns).sort(),
    );
  });
});

describe("pattern tokens cover every pattern the web colours", () => {
  const names = [
    ...new Set([
      ...CORE_PATTERNS,
      ...EXTRA_PATTERNS,
      ...PATTERN_CATEGORIES.structures,
      ...PATTERN_CATEGORIES.strategies,
    ]),
  ];

  it.each(names)("%s has a colour pair in both palettes", (name) => {
    const slug = patternTokenSlug(name);
    expect(slug).not.toBeNull();
    expect(DESIGN_TOKENS.dark.patterns).toHaveProperty(slug!);
    expect(DESIGN_TOKENS.light.patterns).toHaveProperty(slug!);
  });

  it("patternTokenSlug agrees with the web PATTERN_COLORS variable names", () => {
    for (const name of names) {
      const web = PATTERN_COLORS[name];
      expect(web, `web has no colour for ${name}`).toBeDefined();
      const slug = patternTokenSlug(name);
      expect(web.text).toBe(`var(--color-pattern-${slug}-text)`);
      expect(web.bg).toBe(`var(--color-pattern-${slug}-bg)`);
    }
  });

  it("every pattern token slug belongs to a known pattern name", () => {
    const slugs = new Set(names.map(patternTokenSlug));
    for (const slug of Object.keys(DESIGN_TOKENS.dark.patterns)) {
      expect(slugs.has(slug), `orphan token ${slug}`).toBe(true);
    }
  });

  it("returns null for names with no token", () => {
    expect(patternTokenSlug("Not A Pattern")).toBeNull();
    expect(patternTokenSlug("")).toBeNull();
  });
});
