export interface ProgressConfidenceTint {
  background: string;
  border: string;
  text: string;
}

export const PROGRESS_EMPTY_CONFIDENCE_TINT: ProgressConfidenceTint = {
  background: "#12121a",
  border: "#23232f",
  text: "#5e5e6e",
};

export const PROGRESS_HEATMAP_CONFIDENCE_TINTS: readonly ProgressConfidenceTint[] = [
  {
    background: "rgba(247,96,96,0.20)",
    border: "rgba(247,96,96,0.55)",
    text: "#ff7a7a",
  },
  {
    background: "rgba(251,146,60,0.22)",
    border: "rgba(251,146,60,0.58)",
    text: "#ffad5c",
  },
  {
    background: "rgba(245,185,66,0.22)",
    border: "rgba(245,185,66,0.58)",
    text: "#ffd35f",
  },
  {
    background: "rgba(96,165,250,0.22)",
    border: "rgba(96,165,250,0.62)",
    text: "#7cbbff",
  },
  {
    background: "rgba(74,222,128,0.22)",
    border: "rgba(74,222,128,0.62)",
    text: "#67ee98",
  },
];

export const PROGRESS_CONFIDENCE_TINTS: readonly ProgressConfidenceTint[] = [
  {
    background: "rgba(247,96,96,0.56)",
    border: "rgba(247,96,96,0.92)",
    text: "#ff8b8b",
  },
  {
    background: "rgba(251,146,60,0.56)",
    border: "rgba(251,146,60,0.92)",
    text: "#ffb871",
  },
  {
    background: "rgba(245,185,66,0.58)",
    border: "rgba(245,185,66,0.94)",
    text: "#ffdc78",
  },
  {
    background: "rgba(96,165,250,0.60)",
    border: "rgba(96,165,250,0.96)",
    text: "#91c8ff",
  },
  {
    background: "rgba(74,222,128,0.60)",
    border: "rgba(74,222,128,0.96)",
    text: "#79f3a4",
  },
];

export function getProgressConfidenceTint(
  avgConfidence: number,
  count: number,
): ProgressConfidenceTint {
  if (count === 0) return PROGRESS_EMPTY_CONFIDENCE_TINT;
  if (avgConfidence < 1.5) return PROGRESS_CONFIDENCE_TINTS[0];
  if (avgConfidence < 2.5) return PROGRESS_CONFIDENCE_TINTS[1];
  if (avgConfidence < 3.5) return PROGRESS_CONFIDENCE_TINTS[2];
  if (avgConfidence < 4.5) return PROGRESS_CONFIDENCE_TINTS[3];
  return PROGRESS_CONFIDENCE_TINTS[4];
}

export function getProgressHeatmapTint(
  avgConfidence: number,
  count: number,
): ProgressConfidenceTint {
  if (count === 0) return PROGRESS_EMPTY_CONFIDENCE_TINT;
  if (avgConfidence < 1.5) return PROGRESS_HEATMAP_CONFIDENCE_TINTS[0];
  if (avgConfidence < 2.5) return PROGRESS_HEATMAP_CONFIDENCE_TINTS[1];
  if (avgConfidence < 3.5) return PROGRESS_HEATMAP_CONFIDENCE_TINTS[2];
  if (avgConfidence < 4.5) return PROGRESS_HEATMAP_CONFIDENCE_TINTS[3];
  return PROGRESS_HEATMAP_CONFIDENCE_TINTS[4];
}
