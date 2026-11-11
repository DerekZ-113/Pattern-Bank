import type { Confidence } from "../types";

/**
 * The one confidence scale. Every surface that colours by confidence — pattern
 * tiles, the spread bars, the projection chart — reads from here, so a 2 is
 * the same violet and a 5 the same green wherever it appears. The values are
 * CSS variables, so they follow the theme.
 */
export const CONFIDENCE_COLORS: Record<Confidence, string> = {
  1: "var(--color-pb-conf-1)",
  2: "var(--color-pb-conf-2)",
  3: "var(--color-pb-conf-3)",
  4: "var(--color-pb-conf-4)",
  5: "var(--color-pb-conf-5)",
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
