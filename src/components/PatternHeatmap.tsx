import { useState } from "react";
import { getVisiblePatterns } from "../utils/constants";
import type { Problem } from "../types";

interface Props {
  problems: Problem[];
  onPatternClick: (pattern: string) => void;
  enabledExtraPatterns?: string[];
}

// 9-stop color scale: confidence → flat tinted background + border
function getCellStyle(avgConf: number, count: number): { background: string; border: string } {
  if (count === 0)
    return { background: "var(--color-pb-heatmap-empty)", border: "var(--color-pb-border)" };

  if (avgConf < 1.5)
    return { background: "rgba(248,81,73,0.12)", border: "rgba(248,81,73,0.25)" };
  if (avgConf < 2.0)
    return { background: "rgba(240,136,62,0.12)", border: "rgba(240,136,62,0.25)" };
  if (avgConf < 2.5)
    return { background: "rgba(240,136,62,0.14)", border: "rgba(240,136,62,0.28)" };
  if (avgConf < 3.0)
    return { background: "rgba(210,153,34,0.14)", border: "rgba(210,153,34,0.28)" };
  if (avgConf < 3.5)
    return { background: "rgba(210,153,34,0.16)", border: "rgba(210,153,34,0.30)" };
  if (avgConf < 4.0)
    return { background: "rgba(130,190,60,0.14)", border: "rgba(130,190,60,0.28)" };
  if (avgConf < 4.5)
    return { background: "rgba(63,185,80,0.16)", border: "rgba(63,185,80,0.30)" };

  return { background: "rgba(63,185,80,0.20)", border: "rgba(63,185,80,0.35)" };
}

function getConfTextColor(avgConf: number, count: number): string {
  if (count === 0) return "var(--color-pb-border)";
  if (avgConf < 2.5) return "var(--color-pb-hard)";
  if (avgConf < 3.5) return "var(--color-pb-medium)";
  return "var(--color-pb-easy)";
}

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
      {/* 6-column grid on desktop, 3-column on narrow */}
      <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-6">
        {allPatterns.map((pattern) => {
          const data = statsMap[pattern];
          const avgConf = data.count > 0 ? data.totalConf / data.count : 0;
          const cell = getCellStyle(avgConf, data.count);
          const isHovered = hovered === pattern;
          const confColor = getConfTextColor(avgConf, data.count);
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
                backgroundColor: cell.background,
                border: `1px solid ${isHovered ? "#7c6bf5" : cell.border}`,
                borderRadius: 10,
                padding: "14px 12px",
                cursor: "pointer",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                minHeight: 72,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                width: "100%",
                fontFamily: "inherit",
                textAlign: "left",
                boxShadow: isHovered
                  ? "0 0 0 1px rgba(124,107,245,0.3)"
                  : "none",
                overflow: "hidden",
              }}
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: data.count > 0 ? "var(--color-pb-text)" : "var(--color-pb-border)",
                  lineHeight: 1.3,
                  marginBottom: 8,
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
                    fontSize: 11,
                    color: data.count > 0 ? "var(--color-pb-text-muted)" : "var(--color-pb-border-light)",
                  }}
                >
                  {data.count > 0 ? `${data.count} solved` : "—"}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: confColor,
                    lineHeight: 1,
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
