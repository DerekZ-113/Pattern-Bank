import { useState } from "react";
import { PATTERNS } from "../utils/constants";

// 9-stop color scale: confidence → radial gradient + border + glow
function getHeatGradient(avgConf, count) {
  if (count === 0)
    return {
      background:
        "radial-gradient(ellipse at 80% 80%, rgba(48,54,61,0.4) 0%, rgba(13,17,23,0.2) 70%)",
      border: "rgba(48,54,61,0.5)",
      glow: "none",
    };

  if (avgConf < 1.5)
    return {
      background:
        "radial-gradient(ellipse at 75% 75%, rgba(248,81,73,0.30) 0%, rgba(248,81,73,0.08) 50%, rgba(13,17,23,0.1) 100%)",
      border: "rgba(248,81,73,0.30)",
      glow: "inset 0 0 20px rgba(248,81,73,0.08)",
    };

  if (avgConf < 2.0)
    return {
      background:
        "radial-gradient(ellipse at 75% 75%, rgba(248,81,73,0.25) 0%, rgba(240,136,62,0.10) 50%, rgba(13,17,23,0.1) 100%)",
      border: "rgba(248,81,73,0.25)",
      glow: "inset 0 0 20px rgba(248,81,73,0.06)",
    };

  if (avgConf < 2.5)
    return {
      background:
        "radial-gradient(ellipse at 75% 75%, rgba(240,136,62,0.25) 0%, rgba(210,153,34,0.10) 50%, rgba(13,17,23,0.1) 100%)",
      border: "rgba(240,136,62,0.25)",
      glow: "inset 0 0 20px rgba(240,136,62,0.06)",
    };

  if (avgConf < 3.0)
    return {
      background:
        "radial-gradient(ellipse at 75% 75%, rgba(210,153,34,0.25) 0%, rgba(210,153,34,0.08) 50%, rgba(13,17,23,0.1) 100%)",
      border: "rgba(210,153,34,0.25)",
      glow: "inset 0 0 20px rgba(210,153,34,0.06)",
    };

  if (avgConf < 3.5)
    return {
      background:
        "radial-gradient(ellipse at 75% 75%, rgba(210,153,34,0.30) 0%, rgba(187,176,48,0.10) 50%, rgba(13,17,23,0.1) 100%)",
      border: "rgba(210,153,34,0.30)",
      glow: "inset 0 0 20px rgba(210,153,34,0.08)",
    };

  if (avgConf < 4.0)
    return {
      background:
        "radial-gradient(ellipse at 75% 75%, rgba(130,190,60,0.25) 0%, rgba(63,185,80,0.08) 50%, rgba(13,17,23,0.1) 100%)",
      border: "rgba(130,190,60,0.25)",
      glow: "inset 0 0 20px rgba(130,190,60,0.06)",
    };

  if (avgConf < 4.5)
    return {
      background:
        "radial-gradient(ellipse at 75% 75%, rgba(63,185,80,0.28) 0%, rgba(63,185,80,0.10) 50%, rgba(13,17,23,0.1) 100%)",
      border: "rgba(63,185,80,0.30)",
      glow: "inset 0 0 20px rgba(63,185,80,0.08)",
    };

  return {
    background:
      "radial-gradient(ellipse at 75% 75%, rgba(63,185,80,0.35) 0%, rgba(46,210,96,0.12) 50%, rgba(13,17,23,0.1) 100%)",
    border: "rgba(63,185,80,0.40)",
    glow: "inset 0 0 24px rgba(63,185,80,0.12)",
  };
}

function getConfTextColor(avgConf, count) {
  if (count === 0) return "#30363d";
  if (avgConf < 2.0) return "#f85149";
  if (avgConf < 2.5) return "#f0883e";
  if (avgConf < 3.0) return "#d29922";
  if (avgConf < 3.5) return "#d4a72c";
  if (avgConf < 4.0) return "#8fbd3a";
  return "#3fb950";
}

export default function PatternHeatmap({ problems, onPatternClick }) {
  const [hovered, setHovered] = useState(null);

  // Compute stats per pattern
  const statsMap = {};
  PATTERNS.forEach((p) => {
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

  // Legend color swatches
  const legendStops = [
    "rgba(235,75,70,0.70)",
    "rgba(230,115,55,0.67)",
    "rgba(218,150,45,0.64)",
    "rgba(190,170,50,0.62)",
    "rgba(140,180,55,0.64)",
    "rgba(85,185,65,0.67)",
    "rgba(55,185,80,0.72)",
  ];

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 flex items-center gap-1">
        <span className="mr-1 text-[11px] text-pb-text-dim">Weak</span>
        {legendStops.map((c, i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 10,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${c}, rgba(13,17,23,0.3))`,
            }}
          />
        ))}
        <span className="ml-1 text-[11px] text-pb-text-dim">Strong</span>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-1.5 max-[480px]:grid-cols-2">
        {PATTERNS.map((pattern) => {
          const data = statsMap[pattern];
          const avgConf = data.count > 0 ? data.totalConf / data.count : 0;
          const heat = getHeatGradient(avgConf, data.count);
          const isHovered = hovered === pattern;
          const confColor = getConfTextColor(avgConf, data.count);

          return (
            <div
              key={pattern}
              onClick={() => onPatternClick(pattern)}
              onMouseEnter={() => setHovered(pattern)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: heat.background,
                border: `1px solid ${isHovered ? "#7c6bf5" : heat.border}`,
                borderRadius: 10,
                padding: "14px 12px",
                cursor: "pointer",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                minHeight: 72,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: isHovered
                  ? `0 0 0 1px rgba(124,107,245,0.3), ${heat.glow}`
                  : heat.glow,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: data.count > 0 ? "#e6edf3" : "#30363d",
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
                    color: data.count > 0 ? "#8b949e" : "#21262d",
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
                    letterSpacing: -0.5,
                  }}
                >
                  {data.count > 0 ? avgConf.toFixed(1) : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
