/**
 * Design tokens: the app's colours, as plain JSON-serialisable data.
 *
 * Source of truth for the palette. src/index.css is the web rendering of the
 * same values; tests/designTokens.test.ts fails if the two ever differ. A
 * Swift generator reads DESIGN_TOKENS to produce the iOS colour code.
 *
 * Keys in `colors` are the CSS variable name without the `--color-pb-`
 * prefix. Keys in `patterns` are the slug in `--color-pattern-<slug>-text`
 * and `-bg`.
 */

export interface PatternColorPair {
  text: string;
  background: string;
}

export interface DesignPalette {
  colors: Record<string, string>;
  patterns: Record<string, PatternColorPair>;
}

export const DESIGN_TOKENS: {
  readonly dark: DesignPalette;
  readonly light: DesignPalette;
} = {
  dark: {
    colors: {
      "bg": "#121116",
      "surface": "#1a181f",
      "surface-2": "#211f28",
      "surface-hover": "#272430",
      "border-light": "#27242e",
      "border": "#353140",
      "border-strong": "#4b4658",
      "text": "#efedf3",
      "text-muted": "#aba6b7",
      "text-dim": "#8a8597",
      "accent": "#9a8cfa",
      "accent-hover": "#b3a8fc",
      "accent-solid": "#6a57ee",
      "accent-solid-hover": "#7867f0",
      "accent-subtle": "rgba(138, 122, 250, 0.14)",
      "conf-1": "#f76060",
      "conf-2": "#fb923c",
      "conf-3": "#f5b942",
      "conf-4": "#60a5fa",
      "conf-5": "#4ade80",
      "conf-text-1": "#ff7a7a",
      "conf-text-2": "#ffad5c",
      "conf-text-3": "#ffd35f",
      "conf-text-4": "#7cbbff",
      "conf-text-5": "#67ee98",
      "star": "#e8b84a",
      "star-empty": "#3f3a4b",
      "easy": "#3fc9b0",
      "medium": "#f0a440",
      "hard": "#f4707f",
      "success": "#4cc985",
      "warning": "#f0a440",
      "error": "#f4707f",
      "shadow": "rgba(0, 0, 0, 0.55)",
      "heatmap-empty": "rgba(75, 70, 88, 0.3)",
    },
    patterns: {
      "array": { text: "#7ee2e8", background: "rgba(126,226,232,0.12)" },
      "math": { text: "#ab7ee8", background: "rgba(171,126,232,0.12)" },
      "two-pointers": { text: "#7ee8c7", background: "rgba(126,232,199,0.12)" },
      "hash-table": { text: "#e8a87e", background: "rgba(232,168,126,0.12)" },
      "sliding-window": { text: "#7ecbe8", background: "rgba(126,203,232,0.12)" },
      "binary-search": { text: "#e8c77e", background: "rgba(232,199,126,0.12)" },
      "sorting": { text: "#a0a8e8", background: "rgba(160,168,232,0.12)" },
      "linked-list": { text: "#48d4b8", background: "rgba(72,212,184,0.12)" },
      "stack": { text: "#7ea8e8", background: "rgba(126,168,232,0.12)" },
      "queue": { text: "#8eaee8", background: "rgba(142,174,232,0.12)" },
      "tree": { text: "#7ee89c", background: "rgba(126,232,156,0.12)" },
      "bfs": { text: "#e87e7e", background: "rgba(232,126,126,0.12)" },
      "dfs": { text: "#e8607e", background: "rgba(232,96,126,0.12)" },
      "heap": { text: "#e8987e", background: "rgba(232,152,126,0.12)" },
      "greedy": { text: "#b8e87e", background: "rgba(184,232,126,0.12)" },
      "backtracking": { text: "#e8e07e", background: "rgba(232,224,126,0.12)" },
      "graph": { text: "#e87eb8", background: "rgba(232,126,184,0.12)" },
      "union-find": { text: "#d4a8e8", background: "rgba(212,168,232,0.12)" },
      "trie": { text: "#8ce87e", background: "rgba(140,232,126,0.12)" },
      "dp": { text: "#c57ee8", background: "rgba(197,126,232,0.12)" },
      "intervals": { text: "#e88ea8", background: "rgba(232,142,168,0.12)" },
      "mono-stack": { text: "#8b8ee8", background: "rgba(139,142,232,0.12)" },
      "prefix-sum": { text: "#e87ed8", background: "rgba(232,126,216,0.12)" },
      "bit": { text: "#d8e87e", background: "rgba(216,232,126,0.12)" },
      "system-design": { text: "#78b8a8", background: "rgba(120,184,168,0.12)" },
      "ood": { text: "#c89078", background: "rgba(200,144,120,0.12)" },
      "database": { text: "#a3b8cc", background: "rgba(163,184,204,0.12)" },
    },
  },
  light: {
    colors: {
      "bg": "#f6f5f9",
      "surface": "#ffffff",
      "surface-2": "#faf9fc",
      "surface-hover": "#f0eef5",
      "border-light": "#eae8f0",
      "border": "#dbd8e3",
      "border-strong": "#bcb7ca",
      "text": "#1c1a22",
      "text-muted": "#5b5769",
      "text-dim": "#6c6980",
      "accent": "#5a45de",
      "accent-hover": "#4733c4",
      "accent-solid": "#5a45de",
      "accent-solid-hover": "#4733c4",
      "accent-subtle": "rgba(90, 69, 222, 0.09)",
      "conf-1": "#dc4545",
      "conf-2": "#df741a",
      "conf-3": "#c4900e",
      "conf-4": "#3b82f6",
      "conf-5": "#22a35a",
      "conf-text-1": "#b42318",
      "conf-text-2": "#a34a00",
      "conf-text-3": "#7a5600",
      "conf-text-4": "#1d4ed8",
      "conf-text-5": "#146c36",
      "star": "#b97f0a",
      "star-empty": "#d3cfdd",
      "easy": "#0a7968",
      "medium": "#99590a",
      "hard": "#cc2f47",
      "success": "#177a43",
      "warning": "#99590a",
      "error": "#cc2f47",
      "shadow": "rgba(28, 26, 34, 0.12)",
      "heatmap-empty": "rgba(188, 183, 202, 0.35)",
    },
    patterns: {
      "array": { text: "#148490", background: "rgba(20,132,144,0.08)" },
      "math": { text: "#6b3ac0", background: "rgba(107,58,192,0.08)" },
      "two-pointers": { text: "#0f7b6f", background: "rgba(15,123,111,0.08)" },
      "hash-table": { text: "#a85d2a", background: "rgba(168,93,42,0.08)" },
      "sliding-window": { text: "#1a7a9e", background: "rgba(26,122,158,0.08)" },
      "binary-search": { text: "#9e7a1a", background: "rgba(158,122,26,0.08)" },
      "sorting": { text: "#4a52b0", background: "rgba(74,82,176,0.08)" },
      "linked-list": { text: "#1a8a74", background: "rgba(26,138,116,0.08)" },
      "stack": { text: "#2a5ea8", background: "rgba(42,94,168,0.08)" },
      "queue": { text: "#3a62a0", background: "rgba(58,98,160,0.08)" },
      "tree": { text: "#1a8a3e", background: "rgba(26,138,62,0.08)" },
      "bfs": { text: "#b83a3a", background: "rgba(184,58,58,0.08)" },
      "dfs": { text: "#b82a52", background: "rgba(184,42,82,0.08)" },
      "heap": { text: "#a85a2a", background: "rgba(168,90,42,0.08)" },
      "greedy": { text: "#5a8a1a", background: "rgba(90,138,26,0.08)" },
      "backtracking": { text: "#8a7a1a", background: "rgba(138,122,26,0.08)" },
      "graph": { text: "#a82a72", background: "rgba(168,42,114,0.08)" },
      "union-find": { text: "#7a4aa0", background: "rgba(122,74,160,0.08)" },
      "trie": { text: "#2a8a1a", background: "rgba(42,138,26,0.08)" },
      "dp": { text: "#8a2ab0", background: "rgba(138,42,176,0.08)" },
      "intervals": { text: "#a83a5e", background: "rgba(168,58,94,0.08)" },
      "mono-stack": { text: "#3a3eb0", background: "rgba(58,62,176,0.08)" },
      "prefix-sum": { text: "#a82a8a", background: "rgba(168,42,138,0.08)" },
      "bit": { text: "#7a8a1a", background: "rgba(122,138,26,0.08)" },
      "system-design": { text: "#2a7a68", background: "rgba(42,122,104,0.08)" },
      "ood": { text: "#8a5a3a", background: "rgba(138,90,58,0.08)" },
      "database": { text: "#4b6377", background: "rgba(75,99,119,0.08)" },
    },
  },
};

/**
 * Maps a pattern display name (e.g. "Two Pointers", "DP") to its token slug
 * ("two-pointers", "dp"), or null when the name has no colour token (custom
 * patterns). The rule is lower-case with spaces turned into hyphens.
 */
export function patternTokenSlug(patternName: string): string | null {
  const slug = patternName.trim().toLowerCase().replace(/\s+/g, "-");
  return Object.prototype.hasOwnProperty.call(DESIGN_TOKENS.dark.patterns, slug)
    ? slug
    : null;
}
