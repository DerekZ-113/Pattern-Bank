import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
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
} from "../utils/progressUtils";
import PatternHeatmap from "./PatternHeatmap";
import ProjectionCalculator from "./ProjectionCalculator";
import type { Problem, ReviewLogEntry, ReviewEvent } from "../types";

interface Props {
  problems: Problem[];
  reviewLog: ReviewLogEntry[];
  reviewEvents: ReviewEvent[];
  enabledExtraPatterns: string[];
  onPatternClick: (pattern: string) => void;
}

const PROGRESS_CARD =
  "rounded-[10px] border border-[#23232f] bg-[#12121a]";
const PROGRESS_CARD_PADDED = `${PROGRESS_CARD} p-[18px]`;
const SECTION_TITLE_CLASS = "text-[15px] font-semibold text-[#ededf2]";
const SECTION_SUB_CLASS = "ml-auto text-right text-xs text-[#5e5e6e] max-sm:hidden";
const PROGRESS_CONFIDENCE_COLORS = [
  "#f76060",
  "#fb923c",
  "#f5b942",
  "#60a5fa",
  "#4ade80",
];

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
  const activeDays = new Set([
    ...reviewLog.map((e) => e.date),
    ...reviewEvents.map((e) => e.date),
  ]).size;
  const streak = calculateStreak();
  const bestStreak = calculateLongestStreak(reviewLog);
  const avgConf =
    problems.length > 0
      ? problems.reduce((s, p) => s + p.confidence, 0) / problems.length
      : 0;

  const avgConfColor =
    avgConf === 0
      ? "text-[#8a8a99]"
      : avgConf < 2.5
        ? "text-[#f76060]"
        : avgConf < 3.5
          ? "text-[#f5b942]"
          : "text-[#4ade80]";

  const stats = [
    {
      label: "Total Problems",
      value: problems.length,
      color: problems.length > 0 ? "text-[#ededf2]" : "text-[#8a8a99]",
      meta: "",
    },
    {
      label: "Total Reviews",
      value: totalReviews,
      color: "text-[#ededf2]",
      meta: "",
    },
    {
      label: "Active Days",
      value: activeDays,
      color: activeDays > 0 ? "text-[#7c6bf5]" : "text-[#8a8a99]",
      meta: activeDays > 0 ? "review days" : "",
    },
    {
      label: "Current Streak",
      value: `${streak}d`,
      color: streak > 0 ? "text-[#7c6bf5]" : "text-[#8a8a99]",
      meta: bestStreak > 0 ? `best: ${bestStreak}d` : "",
    },
    {
      label: "Avg Confidence",
      value: avgConf > 0 ? avgConf.toFixed(1) : "—",
      color: avgConfColor,
      meta: problems.length > 0 ? `${problems.length} problems` : "",
    },
  ];

  return (
    <div
      aria-label="Progress overview"
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className={`${PROGRESS_CARD} flex min-h-[92px] flex-col justify-center px-5 py-[18px]`}
        >
          <div className={`text-[28px] font-semibold leading-none tracking-normal tabular-nums ${s.color}`}>
            {s.value}
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e5e6e]">
            {s.label}
          </div>
          {s.meta && (
            <div className="mt-1 text-[11px] text-[#8a8a99]">{s.meta}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Section Shell ────────────────────────────────────────

function ProgressSection({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count?: number;
  children: ReactNode;
}) {
  const headingId = `progress-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-2.5">
        <h2 id={headingId} className={SECTION_TITLE_CLASS}>
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full border border-[#23232f] bg-[#12121a] px-2 text-[11px] font-semibold text-[#8a8a99]">
            {count}
          </span>
        )}
        <p className={SECTION_SUB_CLASS}>{subtitle}</p>
      </div>
      {children}
    </section>
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
    <section aria-labelledby="progress-review-activity" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 id="progress-review-activity" className={SECTION_TITLE_CLASS}>
          Review Activity
        </h2>
        <span className={SECTION_SUB_CLASS}>Last 12 months</span>
      </div>

      <div className={PROGRESS_CARD_PADDED}>

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
      <div className="mt-4 flex items-center justify-between border-t border-[#23232f] pt-3 text-[11px] max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div className="flex gap-4 text-[#8a8a99]">
          <span>
            Current streak:{" "}
            <span className="font-semibold text-[#ededf2]">
              {currentStreak}d
            </span>
          </span>
          <span>
            Longest streak:{" "}
            <span className="font-semibold text-[#ededf2]">
              {longestStreak}d
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#5e5e6e]">Less</span>
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
          <span className="text-[#5e5e6e]">More</span>
        </div>
      </div>
      </div>
    </section>
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
  const firstAvg = dataPoints.length > 0 ? dataPoints[0].avg : null;
  const currentAvg =
    dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].avg : null;
  const trendDelta =
    firstAvg !== null && currentAvg !== null ? currentAvg - firstAvg : null;

  // SVG dimensions
  const svgW = 1100;
  const svgH = 240;
  const padL = 36;
  const padR = 24;
  const padT = 18;
  const padB = 32;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const toX = (i: number) =>
    padL + (i / (weekData.length - 1)) * chartW;
  const toY = (conf: number) =>
    padT + chartH - ((conf - 1) / 4) * chartH;

  return (
    <section aria-labelledby="progress-confidence-trend" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 id="progress-confidence-trend" className={SECTION_TITLE_CLASS}>
          Confidence Trend
        </h2>
        <span className={SECTION_SUB_CLASS}>Last 12 weeks</span>
        <select
          value={selectedPattern}
          onChange={(e) => setSelectedPattern(e.target.value)}
          className="ml-3 cursor-pointer appearance-none rounded-lg border border-[#23232f] bg-[#0a0a0f] px-2.5 py-1.5 text-xs text-[#ededf2] outline-none focus:border-[#7c6bf5] max-sm:ml-auto"
        >
          <option value="all">All Patterns</option>
          {availablePatterns.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className={`${PROGRESS_CARD} px-[18px] pb-2 pt-[18px]`}>

      {!hasEnoughData ? (
        <div className="flex h-[240px] items-center justify-center text-[13px] text-[#5e5e6e]">
          Not enough data yet
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: "100%", height: 240, display: "block" }}
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
                stroke="#22222d"
                strokeDasharray="4 4"
                strokeWidth={0.5}
              />
              <text
                x={padL - 6}
                y={toY(v) + 3.5}
                textAnchor="end"
                fill="#5e5e6e"
                fontSize={11}
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
                fill="#5e5e6e"
                fontSize={11}
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
                fill="#12121a"
                stroke={lineColor}
                strokeWidth={2}
              />
            ) : null,
          )}
        </svg>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#23232f] px-1 pb-1 pt-3 text-xs text-[#8a8a99]">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#7c6bf5]" />
          Avg confidence
        </span>
        {trendDelta !== null && (
          <span className={trendDelta >= 0 ? "text-[#4ade80]" : "text-[#f76060]"}>
            {trendDelta >= 0 ? "↑" : "↓"}{" "}
            <strong>{Math.abs(trendDelta).toFixed(1)}</strong>{" "}
            <span className="text-[#8a8a99]">vs first week</span>
          </span>
        )}
        <span className="ml-auto">
          <span className="text-[#8a8a99]">Current</span>{" "}
          <strong className="font-semibold text-[#ededf2]">
            {currentAvg !== null ? currentAvg.toFixed(1) : "—"}
          </strong>
        </span>
      </div>

      {showInfoBanner && (
        <div className="mt-3 rounded-md bg-[#1c1838] px-3 py-2 text-[11px] text-[#8a8a99]">
          Trend data is collected from reviews going forward.
        </div>
      )}
      </div>
    </section>
  );
}

// ── Confidence Spread ────────────────────────────────────

function ConfidenceSpread({ problems }: { problems: Problem[] }) {
  const counts = getConfidenceDistribution(problems.map((p) => p.confidence));
  const maxCount = Math.max(...counts, 1);
  const highConfidence = counts[3] + counts[4];
  const lowConfidence = counts[0] + counts[1];
  const masteredPct =
    problems.length > 0 ? Math.round((highConfidence / problems.length) * 100) : 0;

  return (
    <section aria-labelledby="progress-confidence-spread" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 id="progress-confidence-spread" className={SECTION_TITLE_CLASS}>
          Confidence Spread
        </h2>
        <span className={SECTION_SUB_CLASS}>{problems.length} problems</span>
      </div>
      <div className={`${PROGRESS_CARD} px-5 py-[18px]`}>
        <div className="flex flex-col gap-3">
        {counts.map((count, i) => {
          const color = PROGRESS_CONFIDENCE_COLORS[i];
          const pct = count > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div
              key={i}
              className="grid grid-cols-[58px_1fr_36px] items-center gap-3"
            >
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-[#8a8a99]">
                <span style={{ color }}>{"★".repeat(i + 1)}</span>
                <span className="text-[#5e5e6e]">{i + 1}</span>
              </span>
              <span className="relative h-3.5 overflow-hidden rounded bg-[#15151e]">
                <span
                  className="absolute inset-y-0 left-0 rounded"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}55, ${color})`,
                  }}
                />
              </span>
              <span className="text-right text-[13px] font-semibold tabular-nums text-[#ededf2]">
                {count}
              </span>
            </div>
          );
        })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#23232f] pt-4 text-xs text-[#8a8a99] max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <span>
            <strong className="font-semibold text-[#ededf2]">{highConfidence}</strong>{" "}
            at 4–5★ <span className="text-[#5e5e6e]">· {masteredPct}% mastered</span>
          </span>
          <span>
            <strong className="font-semibold text-[#ededf2]">{lowConfidence}</strong>{" "}
            at 1–2★ <span className="text-[#5e5e6e]">· need work</span>
          </span>
        </div>
      </div>
    </section>
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
    <section aria-labelledby="progress-top-patterns" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 id="progress-top-patterns" className={SECTION_TITLE_CLASS}>
          Top Patterns
        </h2>
        <span className={SECTION_SUB_CLASS}>By problem count</span>
      </div>
      <div className={`${PROGRESS_CARD} px-5 py-[18px]`}>
        {patternCounts.length === 0 ? (
          <div className="py-4 text-center text-[13px] text-[#5e5e6e]">
            No patterns yet
          </div>
        ) : (
          <div className="flex flex-col gap-[11px]">
          {patternCounts.map(([pattern, count], index) => {
            const color =
              PATTERN_COLORS[pattern]?.text ?? "#8b949e";
            const pct = (count / maxCount) * 100;
            return (
              <div key={pattern} className="grid grid-cols-[18px_1fr_1fr_36px] items-center gap-3 max-sm:grid-cols-[18px_1fr_36px]">
                <span className="text-[11px] font-semibold tabular-nums text-[#5e5e6e]">
                  {index + 1}
                </span>
                <span className="truncate text-[13px] font-medium text-[#ededf2]">
                  {pattern}
                </span>
                <div className="relative h-2 overflow-hidden rounded-full bg-[#15151e] max-sm:hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}66, #7c6bf5)`,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <span className="w-[28px] shrink-0 text-right text-[13px] font-semibold tabular-nums text-[#ededf2]">
                  {count}
                </span>
              </div>
            );
          })}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-[#23232f] pt-4 text-xs text-[#8a8a99]">
          <span>Showing {patternCounts.length} patterns</span>
          <span className="font-medium text-[#7c6bf5]">Use heatmap to filter</span>
        </div>
      </div>
    </section>
  );
}

// ── Main View ────────────────────────────────────────────

export default function ProgressView({
  problems,
  reviewLog,
  reviewEvents,
  enabledExtraPatterns,
  onPatternClick,
}: Props) {
  const visiblePatternCount = getVisiblePatterns(enabledExtraPatterns).length;

  if (problems.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-5 pb-8 pt-6 md:px-8">
        <header>
          <h1 className="m-0 text-[30px] font-semibold leading-tight tracking-normal text-[#ededf2]">
            Progress
          </h1>
          <p className="mt-1 text-sm text-[#8a8a99]">
            Patterns, streaks, and review history
          </p>
        </header>

        <div className={`${PROGRESS_CARD} px-6 py-12 text-center`}>
          <h2 className="mb-2 text-lg font-semibold text-[#ededf2]">
            No progress yet
          </h2>
          <p className="mx-auto max-w-md text-sm text-[#8a8a99]">
            Add problems and complete reviews to see patterns, streaks, and trends.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 pb-8 pt-6 md:px-8">
      <header>
        <h1 className="m-0 text-[30px] font-semibold leading-tight tracking-normal text-[#ededf2]">
          Progress
        </h1>
        <p className="mt-1 text-sm text-[#8a8a99]">
          Patterns, streaks, and review history
        </p>
      </header>

      <StatsRow
        problems={problems}
        reviewEvents={reviewEvents}
        reviewLog={reviewLog}
      />

      <ProgressSection
        title="Patterns"
        count={visiblePatternCount}
        subtitle={`Confidence across ${visiblePatternCount} algorithmic patterns`}
      >
        <PatternHeatmap
          problems={problems}
          onPatternClick={onPatternClick}
          enabledExtraPatterns={enabledExtraPatterns}
        />
      </ProgressSection>

      <StreakHeatmap reviewLog={reviewLog} reviewEvents={reviewEvents} />

      <ConfidenceTrend
        reviewEvents={reviewEvents}
        problems={problems}
        enabledExtraPatterns={enabledExtraPatterns}
      />

      <ProjectionCalculator problems={problems} reviewEvents={reviewEvents} />

      <div className="grid grid-cols-[1.05fr_1fr] gap-3 max-md:grid-cols-1">
        <ConfidenceSpread problems={problems} />
        <TopPatterns problems={problems} />
      </div>
    </main>
  );
}
