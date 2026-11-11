import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import { getVisiblePatterns } from "../utils/constants";
import { calculateStreak } from "../utils/storage";
import { todayStr, addDays, formatLocalDate } from "@patternbank/core";
import {
  calculateLongestStreak,
  buildReviewCountMap,
  getWeekStart,
  groupEventsByWeek,
  getConfidenceDistribution,
  getTopPatterns,
} from "@patternbank/core";
import { CONFIDENCE_COLORS, CONFIDENCE_LEVELS } from "../utils/confidence";
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

const PROGRESS_CARD = "rounded-xl border border-pb-border bg-pb-surface";
const SECTION_TITLE_CLASS = "text-[15px] font-semibold text-pb-text";
const SECTION_SUB_CLASS = "ml-auto text-right text-xs text-pb-text-muted max-sm:hidden";
const CARD_FOOTER_CLASS = "border-t border-pb-border-light text-xs text-pb-text-muted";

// ── Helpers ──────────────────────────────────────────────

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Activity strengths 1–4, mixed into the card surface so they hold in both themes.
const ACTIVITY_STRENGTHS = [30, 50, 75, 100];

function activityColor(level: number): string {
  if (level <= 0) return "var(--color-pb-heatmap-empty)";
  const pct = ACTIVITY_STRENGTHS[Math.min(level, ACTIVITY_STRENGTHS.length) - 1];
  return `color-mix(in oklab, var(--color-pb-success) ${pct}%, var(--color-pb-surface))`;
}

function getCellColor(count: number): string {
  if (count === 0) return activityColor(0);
  if (count <= 2) return activityColor(1);
  if (count <= 4) return activityColor(2);
  if (count <= 6) return activityColor(3);
  return activityColor(4);
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

  const stats = [
    {
      label: "Total Problems",
      value: problems.length,
      meta: "",
    },
    {
      label: "Total Reviews",
      value: totalReviews,
      meta: "",
    },
    {
      label: "Active Days",
      value: activeDays,
      meta: activeDays > 0 ? "review days" : "",
    },
    {
      label: "Current Streak",
      value: `${streak}d`,
      meta: bestStreak > 0 ? `best: ${bestStreak}d` : "",
    },
    {
      label: "Avg Confidence",
      value: avgConf > 0 ? avgConf.toFixed(1) : "—",
      meta: problems.length > 0 ? `${problems.length} problems` : "",
    },
  ];

  // gap-px over a hairline-coloured background draws the dividers; the last
  // cell spans both columns on small screens so no empty slot shows through.
  return (
    <div
      aria-label="Progress overview"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-pb-border bg-pb-border-light sm:grid-cols-5"
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`flex flex-col bg-pb-surface px-5 py-4 ${
            i === stats.length - 1 ? "max-sm:col-span-2" : ""
          }`}
        >
          <div className="text-[28px] font-semibold leading-none tabular-nums text-pb-text">
            {s.value}
          </div>
          <div className="mt-2 text-[13px] text-pb-text-muted">{s.label}</div>
          {s.meta && (
            <div className="mt-0.5 text-xs tabular-nums text-pb-text-dim">{s.meta}</div>
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
          <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-pb-surface-2 px-2 text-xs font-medium tabular-nums text-pb-text-muted">
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

  const legendColors = [0, 1, 2, 3, 4].map(activityColor);

  return (
    <section aria-labelledby="progress-review-activity" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 id="progress-review-activity" className={SECTION_TITLE_CLASS}>
          Review Activity
        </h2>
        <span className={SECTION_SUB_CLASS}>Last 12 months</span>
      </div>

      <div className={`${PROGRESS_CARD} p-5`}>

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
                    return (
                      <div
                        key={colIdx}
                        title={`${cell.date}: ${cell.count} review${cell.count !== 1 ? "s" : ""}`}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          borderRadius: 2,
                          backgroundColor: bg,
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
      <div className={`${CARD_FOOTER_CLASS} mt-4 flex items-center justify-between pt-3 max-sm:flex-col max-sm:items-start max-sm:gap-3`}>
        <div className="flex gap-4">
          <span>
            Current streak:{" "}
            <span className="font-semibold tabular-nums text-pb-text">
              {currentStreak}d
            </span>
          </span>
          <span>
            Longest streak:{" "}
            <span className="font-semibold tabular-nums text-pb-text">
              {longestStreak}d
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-0.5 text-pb-text-dim">Less</span>
          {legendColors.map((c, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: c,
              }}
            />
          ))}
          <span className="ml-0.5 text-pb-text-dim">More</span>
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

  const lineColor = "var(--color-pb-accent)";

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
          className="ml-3 cursor-pointer appearance-none rounded-lg border border-pb-border bg-pb-surface px-2.5 py-1.5 text-xs text-pb-text outline-none hover:border-pb-border-strong focus:border-pb-accent max-sm:ml-auto"
        >
          <option value="all">All Patterns</option>
          {availablePatterns.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className={`${PROGRESS_CARD} px-5 pb-3 pt-5`}>

      {!hasEnoughData ? (
        <div className="py-6 text-center text-[13px] text-pb-text-muted">
          Not enough data yet
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: "100%", height: 240, display: "block" }}
        >
          {/* Y-axis grid lines */}
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line
                x1={padL}
                y1={toY(v)}
                x2={svgW - padR}
                y2={toY(v)}
                style={{ stroke: "var(--color-pb-border)" }}
                strokeDasharray="4 4"
                strokeWidth={0.5}
              />
              <text
                x={padL - 6}
                y={toY(v) + 3.5}
                textAnchor="end"
                style={{ fill: "var(--color-pb-text-dim)" }}
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
                style={{ fill: "var(--color-pb-text-dim)" }}
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
            return <path d={areaPath} style={{ fill: lineColor }} fillOpacity={0.08} />;
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
                style={{ stroke: lineColor }}
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
                style={{ fill: "var(--color-pb-surface)", stroke: lineColor }}
                strokeWidth={2}
              />
            ) : null,
          )}
        </svg>
      )}

      <div className={`${CARD_FOOTER_CLASS} mt-1 flex flex-wrap items-center gap-x-5 gap-y-2 pt-3`}>
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-pb-accent" />
          Avg confidence
        </span>
        {trendDelta !== null && (
          <span className={trendDelta >= 0 ? "text-pb-success" : "text-pb-error"}>
            {trendDelta >= 0 ? "↑" : "↓"}{" "}
            <strong className="font-semibold tabular-nums">{Math.abs(trendDelta).toFixed(1)}</strong>{" "}
            <span className="text-pb-text-muted">vs first week</span>
          </span>
        )}
        <span className="ml-auto">
          Current{" "}
          <strong className="font-semibold tabular-nums text-pb-text">
            {currentAvg !== null ? currentAvg.toFixed(1) : "—"}
          </strong>
        </span>
      </div>

      {showInfoBanner && (
        <div className="mt-3 rounded-lg bg-pb-surface-2 px-3 py-2 text-xs text-pb-text-muted">
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
      <div className={`${PROGRESS_CARD} px-5 py-5`}>
        <div className="flex flex-col gap-3">
        {counts.map((count, i) => {
          const color = CONFIDENCE_COLORS[CONFIDENCE_LEVELS[i]];
          const pct = count > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div
              key={i}
              className="grid grid-cols-[30px_1fr_36px] items-center gap-3"
            >
              <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-pb-text-muted">
                {i + 1}
                <span aria-hidden="true" style={{ color }}>★</span>
              </span>
              <span className="relative h-3 overflow-hidden rounded bg-pb-surface-2">
                <span
                  className="absolute inset-y-0 left-0 rounded"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </span>
              <span className="text-right text-[13px] font-semibold tabular-nums text-pb-text">
                {count}
              </span>
            </div>
          );
        })}
        </div>
        <div className={`${CARD_FOOTER_CLASS} mt-4 flex items-center justify-between pt-4 max-sm:flex-col max-sm:items-start max-sm:gap-2`}>
          <span>
            <strong className="font-semibold tabular-nums text-pb-text">{highConfidence}</strong>{" "}
            at 4–5★ <span className="text-pb-text-dim">· {masteredPct}% mastered</span>
          </span>
          <span>
            <strong className="font-semibold tabular-nums text-pb-text">{lowConfidence}</strong>{" "}
            at 1–2★ <span className="text-pb-text-dim">· need work</span>
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
      <div className={`${PROGRESS_CARD} px-5 py-5`}>
        {patternCounts.length === 0 ? (
          <div className="py-4 text-center text-[13px] text-pb-text-muted">
            No patterns yet
          </div>
        ) : (
          <div className="flex flex-col gap-3">
          {patternCounts.map(([pattern, count], index) => {
            const pct = (count / maxCount) * 100;
            return (
              <div key={pattern} className="grid grid-cols-[18px_1fr_1fr_36px] items-center gap-3 max-sm:grid-cols-[18px_1fr_36px]">
                <span className="text-xs tabular-nums text-pb-text-dim">
                  {index + 1}
                </span>
                <span className="truncate text-[13px] font-medium text-pb-text">
                  {pattern}
                </span>
                <div className="relative h-2 overflow-hidden rounded-full bg-pb-surface-2 max-sm:hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: "var(--color-pb-text-dim)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <span className="w-[28px] shrink-0 text-right text-[13px] font-semibold tabular-nums text-pb-text">
                  {count}
                </span>
              </div>
            );
          })}
          </div>
        )}
        <div className={`${CARD_FOOTER_CLASS} mt-4 flex items-center justify-between pt-4`}>
          <span>Showing {patternCounts.length} patterns</span>
          <span className="text-pb-text-dim">Use heatmap to filter</span>
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
          <h1 className="m-0 text-[30px] font-semibold leading-tight text-pb-text">
            Progress
          </h1>
          <p className="mt-1 text-sm text-pb-text-muted">
            Patterns, streaks, and review history
          </p>
        </header>

        <div className={`${PROGRESS_CARD} px-6 py-12 text-center`}>
          <h2 className="mb-2 text-lg font-semibold text-pb-text">
            No progress yet
          </h2>
          <p className="mx-auto max-w-md text-sm text-pb-text-muted">
            Add problems and complete reviews to see patterns, streaks, and trends.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 pb-8 pt-6 md:px-8">
      <header>
        <h1 className="m-0 text-[30px] font-semibold leading-tight text-pb-text">
          Progress
        </h1>
        <p className="mt-1 text-sm text-pb-text-muted">
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
