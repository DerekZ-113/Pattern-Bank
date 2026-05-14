import { useState, useRef, useEffect, useMemo } from "react";
import { PATTERN_COLORS, getVisiblePatterns } from "../utils/constants";
import { calculateStreak } from "../utils/storage";
import { todayStr, addDays, formatLocalDate } from "../utils/dateHelpers";
import {
  calculateLongestStreak,
  buildReviewCountMap,
  getWeekStart,
  groupEventsByWeek,
  getConfidenceDistribution,
  getTopPatterns,
  CONFIDENCE_BAR_COLORS,
} from "../utils/progressUtils";
import ProjectionCalculator from "./ProjectionCalculator";
import type { Problem, ReviewLogEntry, ReviewEvent } from "../types";

interface Props {
  problems: Problem[];
  reviewLog: ReviewLogEntry[];
  reviewEvents: ReviewEvent[];
  enabledExtraPatterns: string[];
}

// ── Helpers ──────────────────────────────────────────────

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCellColor(count: number): string {
  if (count === 0) return "transparent";
  if (count <= 2) return "rgba(63,185,80,0.25)";
  if (count <= 4) return "rgba(63,185,80,0.45)";
  if (count <= 6) return "rgba(63,185,80,0.65)";
  return "rgba(63,185,80,0.88)";
}

// ── Stats Row ────────────────────────────────────────────

function StatsRow({
  problems,
  reviewEvents,
  reviewLog,
}: {
  problems: Problem[];
  reviewEvents: ReviewEvent[];
  reviewLog: ReviewLogEntry[];
}) {
  const totalReviews =
    reviewEvents.length > 0 ? reviewEvents.length : reviewLog.length;
  const activeDays = new Set(reviewLog.map((e) => e.date)).size;
  const streak = calculateStreak();
  const avgConf =
    problems.length > 0
      ? problems.reduce((s, p) => s + p.confidence, 0) / problems.length
      : 0;

  const avgConfColor =
    avgConf === 0
      ? "text-pb-text-muted"
      : avgConf < 2.5
        ? "text-pb-hard"
        : avgConf < 3.5
          ? "text-pb-medium"
          : "text-pb-success";

  const stats = [
    {
      label: "Total Reviews",
      value: totalReviews,
      color: "text-pb-text",
    },
    {
      label: "Active Days",
      value: activeDays,
      color: activeDays > 0 ? "text-pb-accent" : "text-pb-text-muted",
    },
    {
      label: "Streak",
      value: `${streak}d`,
      color: streak > 0 ? "text-pb-accent" : "text-pb-text-muted",
    },
    {
      label: "Avg Confidence",
      value: avgConf > 0 ? avgConf.toFixed(1) : "—",
      color: avgConfColor,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-pb-border bg-pb-surface px-2 py-2.5 text-center"
        >
          <div className={`text-lg font-bold leading-tight ${s.color}`}>
            {s.value}
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-pb-text-muted">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Streak Heatmap ───────────────────────────────────────

function StreakHeatmap({
  reviewLog,
  reviewEvents,
}: {
  reviewLog: ReviewLogEntry[];
  reviewEvents: ReviewEvent[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(12);

  const countMap = useMemo(
    () => buildReviewCountMap(reviewEvents, reviewLog),
    [reviewEvents, reviewLog],
  );

  // Build date range: 52 weeks ending this Saturday
  const today = todayStr();
  const todayDate = new Date(today + "T00:00:00");
  const todayDay = todayDate.getDay();
  const endDate = new Date(todayDate);
  endDate.setDate(endDate.getDate() + (6 - todayDay));
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 52 * 7 + 1);

  type CellData = { date: string; count: number; isFuture: boolean };

  // Build month blocks with split transition weeks
  interface MonthBlock {
    label: string;
    columns: (CellData | null)[][]; // each column is 7 slots (Sun=0..Sat=6)
  }

  const monthBlocks = useMemo(() => {
    const blocks: MonthBlock[] = [];
    let currentBlock: MonthBlock | null = null;
    let currentCol: (CellData | null)[] = Array(7).fill(null);
    let prevMonth = -1;

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = formatLocalDate(cursor);
      const dayOfWeek = cursor.getDay(); // 0=Sun
      const month = cursor.getMonth();
      const isFuture = dateStr > today;

      // Month changed — finalize previous column and block
      if (month !== prevMonth) {
        if (currentBlock) {
          // Push partial column (end of old month) if it has any cells
          if (currentCol.some((c) => c !== null)) {
            currentBlock.columns.push(currentCol);
          }
          blocks.push(currentBlock);
        }
        // Start new block with a fresh column
        currentCol = Array(7).fill(null) as (CellData | null)[];
        currentBlock = {
          label: cursor.toLocaleDateString("en-US", { month: "short" }),
          columns: [],
        };
        prevMonth = month;
      }

      // If we're at Sunday and column has data, push it and start new
      if (dayOfWeek === 0 && currentCol.some((c) => c !== null)) {
        currentBlock!.columns.push(currentCol);
        currentCol = Array(7).fill(null) as (CellData | null)[];
      }

      currentCol[dayOfWeek] = {
        date: dateStr,
        count: countMap.get(dateStr) ?? 0,
        isFuture,
      };

      cursor.setDate(cursor.getDate() + 1);
    }

    // Push final column and block
    if (currentBlock) {
      if (currentCol.some((c) => c !== null)) {
        currentBlock.columns.push(currentCol);
      }
      blocks.push(currentBlock);
    }

    return blocks;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countMap, today]);

  // Count total columns for cell size calculation
  const totalColumns = monthBlocks.reduce((s, b) => s + b.columns.length, 0);
  const monthGapCount = Math.max(0, monthBlocks.length - 1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const dayLabelWidth = 28;
      const gap = 2;
      const monthGap = 6;
      const available = el.clientWidth - dayLabelWidth;
      const totalGaps = Math.max(0, totalColumns - 1) * gap
        - monthGapCount * gap + monthGapCount * monthGap; // replace inter-cell gaps at month boundaries with month gaps
      const size = Math.floor((available - totalGaps) / totalColumns);
      setCellSize(Math.max(8, Math.min(14, size)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [totalColumns, monthGapCount]);

  const gap = 2;
  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
  const currentStreak = calculateStreak();
  const longestStreak = calculateLongestStreak(reviewLog);

  const legendColors = [
    "transparent",
    "rgba(63,185,80,0.25)",
    "rgba(63,185,80,0.45)",
    "rgba(63,185,80,0.65)",
    "rgba(63,185,80,0.88)",
  ];

  return (
    <div className="rounded-xl border border-pb-border bg-pb-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-pb-text">
          Review Activity
        </h3>
        <span className="text-[13px] text-pb-text-dim">Last 12 months</span>
      </div>

      <div ref={containerRef} className="overflow-x-auto">
        <div className="flex">
          {/* Day labels column */}
          <div style={{ flexShrink: 0, paddingTop: 18 }}>
            {dayLabels.map((label, i) => (
              <div
                key={i}
                style={{
                  width: 24,
                  height: cellSize,
                  marginTop: i > 0 ? gap : 0,
                  fontSize: 10,
                  color: "var(--color-pb-text-muted)",
                  textAlign: "right",
                  paddingRight: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Month blocks */}
          {monthBlocks.map((block, blockIdx) => (
            <div key={blockIdx} style={{ marginLeft: blockIdx > 0 ? 6 : 4, flexShrink: 0 }}>
              {/* Month label */}
              <div style={{ fontSize: 10, color: "var(--color-pb-text-muted)", marginBottom: 4, height: 14 }}>
                {block.label}
              </div>
              {/* 7 rows */}
              {Array.from({ length: 7 }).map((_, rowIdx) => (
                <div key={rowIdx} className="flex" style={{ marginTop: rowIdx > 0 ? gap : 0 }}>
                  {block.columns.map((col, colIdx) => {
                    const cell = col[rowIdx];
                    if (!cell) {
                      return (
                        <div
                          key={colIdx}
                          style={{
                            width: cellSize,
                            height: cellSize,
                            marginLeft: colIdx > 0 ? gap : 0,
                          }}
                        />
                      );
                    }
                    const bg = cell.isFuture ? "transparent" : getCellColor(cell.count);
                    const border =
                      cell.isFuture || cell.count > 0
                        ? "none"
                        : "1px solid var(--color-pb-border-light)";
                    return (
                      <div
                        key={colIdx}
                        title={`${cell.date}: ${cell.count} review${cell.count !== 1 ? "s" : ""}`}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          borderRadius: 2,
                          backgroundColor: bg,
                          border,
                          flexShrink: 0,
                          marginLeft: colIdx > 0 ? gap : 0,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-pb-border-light pt-3 text-[11px]">
        <div className="flex gap-4 text-pb-text-muted">
          <span>
            Current streak:{" "}
            <span className="font-semibold text-pb-text">
              {currentStreak}d
            </span>
          </span>
          <span>
            Longest streak:{" "}
            <span className="font-semibold text-pb-text">
              {longestStreak}d
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-pb-text-dim">Less</span>
          {legendColors.map((c, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: c,
                border:
                  i === 0
                    ? "1px solid var(--color-pb-border-light)"
                    : "none",
              }}
            />
          ))}
          <span className="text-pb-text-dim">More</span>
        </div>
      </div>
    </div>
  );
}

// ── Confidence Trend ─────────────────────────────────────

function ConfidenceTrend({
  reviewEvents,
  problems,
  enabledExtraPatterns,
}: {
  reviewEvents: ReviewEvent[];
  problems: Problem[];
  enabledExtraPatterns: string[];
}) {
  const [selectedPattern, setSelectedPattern] = useState("all");

  // Patterns the user actually has problems for
  const availablePatterns = useMemo(() => {
    const visible = getVisiblePatterns(enabledExtraPatterns);
    const userPatterns = new Set(problems.flatMap((p) => p.patterns));
    return visible.filter((p) => userPatterns.has(p));
  }, [problems, enabledExtraPatterns]);

  // Filter events by pattern
  const filteredEvents = useMemo(() => {
    if (selectedPattern === "all") return reviewEvents;
    return reviewEvents.filter((e) => e.patterns.includes(selectedPattern));
  }, [reviewEvents, selectedPattern]);

  // Group by week (last 12 weeks)
  const weekData = useMemo(() => {
    const twelveWeeksAgo = addDays(todayStr(), -12 * 7);
    return groupEventsByWeek(filteredEvents, 12, twelveWeeksAgo).map((w) => ({
      ...w,
      label: formatWeekLabel(w.weekStart),
    }));
  }, [filteredEvents]);

  const dataPoints = weekData.filter((w) => w.avg !== null) as {
    weekStart: string;
    label: string;
    avg: number;
  }[];

  const lineColor =
    selectedPattern !== "all" && PATTERN_COLORS[selectedPattern]
      ? PATTERN_COLORS[selectedPattern].text
      : "#7c6bf5";

  const hasEnoughData = dataPoints.length >= 2;
  const showInfoBanner =
    reviewEvents.length === 0 ||
    new Set(reviewEvents.map((e) => getWeekStart(e.date))).size < 2;

  // SVG dimensions
  const svgW = 560;
  const svgH = 150;
  const padL = 28;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const toX = (i: number) =>
    padL + (i / (weekData.length - 1)) * chartW;
  const toY = (conf: number) =>
    padT + chartH - ((conf - 1) / 4) * chartH;

  return (
    <div className="rounded-xl border border-pb-border bg-pb-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-pb-text">
          Confidence Trend
        </h3>
        <select
          value={selectedPattern}
          onChange={(e) => setSelectedPattern(e.target.value)}
          className="cursor-pointer appearance-none rounded-lg border border-pb-border bg-pb-bg px-2.5 py-1.5 text-[12px] text-pb-text outline-none focus:border-pb-accent"
        >
          <option value="all">All Patterns</option>
          {availablePatterns.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {!hasEnoughData ? (
        <div className="flex h-[150px] items-center justify-center text-[13px] text-pb-text-dim">
          Not enough data yet
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: "100%", display: "block" }}
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines */}
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line
                x1={padL}
                y1={toY(v)}
                x2={svgW - padR}
                y2={toY(v)}
                stroke="var(--color-pb-border)"
                strokeDasharray="4 4"
                strokeWidth={0.5}
              />
              <text
                x={padL - 6}
                y={toY(v) + 3.5}
                textAnchor="end"
                fill="var(--color-pb-text-dim)"
                fontSize={10}
              >
                {v}
              </text>
            </g>
          ))}

          {/* X-axis labels (every other week) */}
          {weekData.map((w, i) =>
            i % 2 === 0 ? (
              <text
                key={i}
                x={toX(i)}
                y={svgH - 4}
                textAnchor="middle"
                fill="var(--color-pb-text-dim)"
                fontSize={9}
              >
                {w.label}
              </text>
            ) : null,
          )}

          {/* Area fill */}
          {(() => {
            // Build path only through data points with their actual indices
            const pts = weekData
              .map((w, i) => (w.avg !== null ? { x: toX(i), y: toY(w.avg) } : null))
              .filter(Boolean) as { x: number; y: number }[];
            if (pts.length < 2) return null;
            const areaPath = `M${pts[0].x},${pts[0].y} ${pts.map((p) => `L${p.x},${p.y}`).join(" ")} L${pts[pts.length - 1].x},${toY(1)} L${pts[0].x},${toY(1)} Z`;
            return <path d={areaPath} fill="url(#trendFill)" />;
          })()}

          {/* Line */}
          {(() => {
            const pts = weekData
              .map((w, i) => (w.avg !== null ? { x: toX(i), y: toY(w.avg) } : null))
              .filter(Boolean) as { x: number; y: number }[];
            if (pts.length < 2) return null;
            const linePath = `M${pts.map((p) => `${p.x},${p.y}`).join(" L")}`;
            return (
              <path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })()}

          {/* Data points */}
          {weekData.map((w, i) =>
            w.avg !== null ? (
              <circle
                key={i}
                cx={toX(i)}
                cy={toY(w.avg)}
                r={3}
                fill="var(--color-pb-bg)"
                stroke={lineColor}
                strokeWidth={2}
              />
            ) : null,
          )}
        </svg>
      )}

      {showInfoBanner && (
        <div className="mt-3 rounded-md bg-pb-accent-subtle px-3 py-2 text-[11px] text-pb-text-dim">
          Trend data is collected from reviews going forward.
        </div>
      )}
    </div>
  );
}

// ── Confidence Spread ────────────────────────────────────

function ConfidenceSpread({ problems }: { problems: Problem[] }) {
  const counts = getConfidenceDistribution(problems.map((p) => p.confidence));
  const maxCount = Math.max(...counts, 1);
  const barHeight = 100;

  return (
    <div className="rounded-xl border border-pb-border bg-pb-surface p-5">
      <h3 className="mb-4 text-[15px] font-semibold text-pb-text">
        Confidence Spread
      </h3>
      <div className="flex items-end justify-around" style={{ height: barHeight + 40 }}>
        {counts.map((count, i) => {
          const height = count > 0 ? (count / maxCount) * barHeight : 2;
          const color = CONFIDENCE_BAR_COLORS[i];
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1"
              style={{ width: 36 }}
            >
              <span
                className="text-[11px] font-semibold tabular-nums"
                style={{ color: count > 0 ? color : "var(--color-pb-text-dim)" }}
              >
                {count}
              </span>
              <div
                style={{
                  width: 24,
                  height,
                  borderRadius: 4,
                  backgroundColor: color,
                  opacity: count > 0 ? 1 : 0.15,
                  transition: "height 0.3s ease",
                }}
              />
              <span className="text-[10px] text-pb-text-dim">
                {i + 1} ★
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top Patterns ─────────────────────────────────────────

function TopPatterns({ problems }: { problems: Problem[] }) {
  const patternCounts = useMemo(
    () => getTopPatterns(problems.map((p) => p.patterns), 5),
    [problems],
  );

  const maxCount = patternCounts.length > 0 ? patternCounts[0][1] : 1;

  return (
    <div className="rounded-xl border border-pb-border bg-pb-surface p-5">
      <h3 className="mb-4 text-[15px] font-semibold text-pb-text">
        Top Patterns
      </h3>
      {patternCounts.length === 0 ? (
        <div className="py-4 text-center text-[13px] text-pb-text-dim">
          No patterns yet
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {patternCounts.map(([pattern, count]) => {
            const color =
              PATTERN_COLORS[pattern]?.text ?? "#8b949e";
            const pct = (count / maxCount) * 100;
            return (
              <div key={pattern} className="flex items-center gap-2.5">
                <span
                  className="w-[90px] shrink-0 truncate text-[13px] font-medium"
                  style={{ color }}
                >
                  {pattern}
                </span>
                <div className="relative h-[18px] flex-1 overflow-hidden rounded bg-pb-border-light">
                  <div
                    className="absolute inset-y-0 left-0 rounded"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      opacity: 0.6,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <span className="w-[28px] shrink-0 text-right text-[12px] font-semibold tabular-nums text-pb-text-muted">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main View ────────────────────────────────────────────

export default function ProgressView({
  problems,
  reviewLog,
  reviewEvents,
  enabledExtraPatterns,
}: Props) {
  if (problems.length === 0) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-pb-border bg-pb-surface px-6 py-12 text-center">
          <div className="mb-2 text-2xl">📊</div>
          <h2 className="mb-2 text-lg font-semibold text-pb-text">
            No data yet
          </h2>
          <p className="text-sm text-pb-text-muted">
            Start adding problems to see your progress here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <StatsRow
        problems={problems}
        reviewEvents={reviewEvents}
        reviewLog={reviewLog}
      />

      <StreakHeatmap reviewLog={reviewLog} reviewEvents={reviewEvents} />

      <ConfidenceTrend
        reviewEvents={reviewEvents}
        problems={problems}
        enabledExtraPatterns={enabledExtraPatterns}
      />

      <ProjectionCalculator problems={problems} reviewEvents={reviewEvents} />

      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <ConfidenceSpread problems={problems} />
        <TopPatterns problems={problems} />
      </div>
    </div>
  );
}
