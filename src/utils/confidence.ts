import type { CSSProperties } from "react";
import type { Confidence } from "../types";

/**
 * The one confidence scale, weak to strong: red, orange, amber, blue, green.
 * Every surface that colours by confidence — pattern tiles, the spread bars,
 * the projection chart — reads from here, so a 2 is the same orange and a 5
 * the same green wherever it appears. The values are CSS variables, so they
 * follow the theme.
 */
export const CONFIDENCE_COLORS: Record<Confidence, string> = {
  1: "var(--color-pb-conf-1)",
  2: "var(--color-pb-conf-2)",
  3: "var(--color-pb-conf-3)",
  4: "var(--color-pb-conf-4)",
  5: "var(--color-pb-conf-5)",
};

/**
 * The same hues tuned to be read as text. Use these for a number or label in
 * a confidence colour; the fills above do not clear 4.5:1 in every theme.
 */
export const CONFIDENCE_TEXT_COLORS: Record<Confidence, string> = {
  1: "var(--color-pb-conf-text-1)",
  2: "var(--color-pb-conf-text-2)",
  3: "var(--color-pb-conf-text-3)",
  4: "var(--color-pb-conf-text-4)",
  5: "var(--color-pb-conf-text-5)",
};

export const CONFIDENCE_LEVELS: readonly Confidence[] = [1, 2, 3, 4, 5];

/**
 * Bins an average onto the 1–5 scale. Halves round up (1.5 → 2), matching the
 * thresholds core uses for its own progress tints.
 */
export function confidenceLevel(average: number): Confidence {
  if (!Number.isFinite(average)) return 1;
  return Math.min(5, Math.max(1, Math.round(average))) as Confidence;
}

export function confidenceColor(average: number): string {
  return CONFIDENCE_COLORS[confidenceLevel(average)];
}

export function confidenceTextColor(average: number): string {
  return CONFIDENCE_TEXT_COLORS[confidenceLevel(average)];
}

/**
 * A tile tinted by confidence: a soft wash of the colour with an edge in the
 * same hue. Shared by the Progress pattern grid and the landing page's sample
 * of it. The element needs a `border` class for the edge to show.
 */
export function confidenceTileStyle(average: number): CSSProperties {
  const color = confidenceColor(average);
  return {
    backgroundColor: `color-mix(in oklab, ${color} 20%, var(--color-pb-surface))`,
    borderColor: `color-mix(in oklab, ${color} 58%, transparent)`,
  };
}
