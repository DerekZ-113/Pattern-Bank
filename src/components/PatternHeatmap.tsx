import { useState } from "react";
import { getVisiblePatterns } from "../utils/constants";
import { getProgressHeatmapTint } from "@patternbank/core";
import type { Problem } from "../types";

interface Props {
  problems: Problem[];
  onPatternClick: (pattern: string) => void;
  enabledExtraPatterns?: string[];
}

// Core's empty tint is a fixed dark color; use the theme tokens instead.
const EMPTY_TILE = {
  background: "var(--color-pb-progress-card)",
  border: "var(--color-pb-progress-border)",
  text: "var(--color-pb-progress-text-dim)",
};

export default function PatternHeatmap({ problems, onPatternClick, enabledExtraPatterns }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const allPatterns = getVisiblePatterns(enabledExtraPatterns ?? []);

  // Compute stats per pattern
  const statsMap: Record<string, { count: number; totalConf: number }> = {};
  allPatterns.forEach((p) => {
    statsMap[p] = { count: 0, totalConf: 0 };
  });
  problems.forEach((prob) => {
    prob.patterns.forEach((pat) => {
      if (statsMap[pat]) {
        statsMap[pat].count++;
        statsMap[pat].totalConf += prob.confidence;
      }
    });
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {allPatterns.map((pattern) => {
          const data = statsMap[pattern];
          const avgConf = data.count > 0 ? data.totalConf / data.count : 0;
          const tint = data.count > 0
            ? getProgressHeatmapTint(avgConf, data.count)
            : EMPTY_TILE;
          const isHovered = hovered === pattern;
          const problemLabel = data.count === 1 ? "problem" : "problems";
          const confidenceLabel =
            data.count > 0
              ? `average confidence ${avgConf.toFixed(1)}`
              : "no problems yet";

          return (
            <button
              key={pattern}
              type="button"
              aria-label={`${pattern}: ${data.count} ${problemLabel}, ${confidenceLabel}`}
              onClick={() => onPatternClick(pattern)}
              onMouseEnter={() => setHovered(pattern)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(pattern)}
              onBlur={() => setHovered(null)}
              style={{
                appearance: "none",
                backgroundColor: tint.background,
                border: `1px solid ${isHovered ? "var(--color-pb-progress-border-hover)" : tint.border}`,
                borderRadius: 8,
                padding: "16px 15px 14px",
                cursor: "pointer",
                transition: "transform 0.1s ease, border-color 0.12s ease, box-shadow 0.15s ease",
                minHeight: 86,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                width: "100%",
                fontFamily: "inherit",
                textAlign: "left",
                transform: isHovered ? "translateY(-1px)" : "translateY(0)",
                boxShadow: isHovered
                  ? "0 0 0 1px rgba(124,107,245,0.16)"
                  : "none",
                overflow: "hidden",
              }}
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: data.count > 0
                    ? "var(--color-pb-progress-text)"
                    : "var(--color-pb-progress-text-muted)",
                  lineHeight: 1.25,
                  marginBottom: 12,
                }}
              >
                {pattern}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: data.count > 0
                      ? "var(--color-pb-progress-text-muted)"
                      : "var(--color-pb-progress-text-dim)",
                  }}
                >
                  {data.count > 0 ? `${data.count} ${problemLabel}` : "—"}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    // Full strength in dark; light mode blends toward the text color.
                    color: `color-mix(in srgb, ${tint.text} var(--pb-progress-tint-text-strength, 100%), var(--color-pb-progress-text))`,
                    lineHeight: 1.1,
                    letterSpacing: 0,
                  }}
                >
                  {data.count > 0 ? avgConf.toFixed(1) : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
