import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { todayStr, addDays } from "@patternbank/core";
import { getConfidenceDistribution } from "@patternbank/core";
import { simulateProjectionSeries, type ProjectionDistribution } from "@patternbank/core";
import { INTERVALS } from "@patternbank/core";
import { CONFIDENCE_COLORS, CONFIDENCE_LEVELS } from "../utils/confidence";
import type { Problem, ReviewEvent } from "../types";

interface Props {
  problems: Problem[];
  reviewEvents: ReviewEvent[];
}

interface Point {
  x: number;
  y: number;
}

const DAYS = 30;
const DEFAULT_SELECTED_DAY = 18;
const SVG_WIDTH = 660;
const SVG_HEIGHT = 348;
const PLOT = { x0: 38, y0: 32, x1: 610, y1: 312 };
const CURSOR_LABEL_WIDTH = 116;
const CURSOR_LABEL_HALF_WIDTH = CURSOR_LABEL_WIDTH / 2;
// Hard colour stops, not a blend: this paints the filled part of the range track.
function getRangeTrackStyle(value: number, min: number, max: number): CSSProperties {
  const fill = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, var(--color-pb-accent-solid) ${fill}%, var(--color-pb-border) ${fill}%)`,
  };
}

function computeDefaultDailyGoal(reviewEvents: ReviewEvent[]): number {
  if (reviewEvents.length === 0) return 5;
  const today = todayStr();
  const cutoff = addDays(today, -14);
  const recent = reviewEvents.filter((e) => e.date >= cutoff);
  if (recent.length === 0) return 5;
  const activeDays = new Set(recent.map((e) => e.date)).size;
  if (activeDays === 0) return 5;
  return Math.min(Math.round(recent.length / activeDays), 20);
}

function computeDefaultNewPerWeek(problems: Problem[]): number {
  if (problems.length === 0) return 2;
  const today = todayStr();
  const cutoff = addDays(today, -28);
  const recentCount = problems.filter((p) => p.dateAdded >= cutoff).length;
  if (recentCount === 0) return 2;
  return Math.min(Math.round(recentCount / 4), 10);
}

function total(distribution: ProjectionDistribution): number {
  return distribution.reduce((sum, count) => sum + count, 0);
}

function mastered(distribution: ProjectionDistribution): number {
  return distribution[3] + distribution[4];
}

function cumulativeSeries(series: ProjectionDistribution[], starIndex: number): number[] {
  return series.map((distribution) =>
    distribution.slice(0, starIndex + 1).reduce((sum, count) => sum + count, 0),
  );
}

function formatRange(low: number, high: number): string {
  return low === high ? `${high}` : `${low}–${high}`;
}

function formatPercentRange(lowCount: number, highCount: number, totalCount: number): string {
  if (totalCount <= 0) return "0%";
  const lowPct = Math.round((lowCount / totalCount) * 100);
  const highPct = Math.round((highCount / totalCount) * 100);
  return lowPct === highPct ? `${highPct}%` : `${lowPct}–${highPct}%`;
}

function buildLinearPath(points: Point[]): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function buildBandPath(bottom: Point[], top: Point[]): string {
  if (bottom.length === 0 || top.length === 0) return "";
  const topPath = buildLinearPath(top);
  const bottomPath = [...bottom]
    .reverse()
    .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  return `${topPath} ${bottomPath} Z`;
}

function clampDay(day: number): number {
  return Math.max(0, Math.min(DAYS, day));
}

function clampCursorLabelX(cursorX: number): number {
  return Math.max(
    CURSOR_LABEL_HALF_WIDTH,
    Math.min(SVG_WIDTH - CURSOR_LABEL_HALF_WIDTH, cursorX),
  );
}

function formatCursorPointerPoints(offset: number): string {
  return `${offset - 5},22 ${offset + 5},22 ${offset},28`;
}

function buildCaption(day30RealisticMastered: number, day30OptimisticMastered: number): string {
  const rangeSize = day30OptimisticMastered - day30RealisticMastered;
  if (day30OptimisticMastered === 0) {
    return "Consistent daily practice will compound. Start small and build up.";
  }
  if (rangeSize >= 20) {
    return `Strong pace. By Day 30, you could grow your mastered set to ${formatRange(day30RealisticMastered, day30OptimisticMastered)} problems.`;
  }
  return `Steady progress. By Day 30, you're on track to grow your mastered set to ${formatRange(day30RealisticMastered, day30OptimisticMastered)} problems depending on review quality.`;
}

export default function ProjectionCalculator({ problems, reviewEvents }: Props) {
  const reviewable = useMemo(
    () => problems.filter((p) => !p.excludeFromReview),
    [problems],
  );
  const excludedCount = problems.length - reviewable.length;

  const defaultDaily = useMemo(() => computeDefaultDailyGoal(reviewEvents), [reviewEvents]);
  const defaultNewPerWeek = useMemo(() => computeDefaultNewPerWeek(reviewable), [reviewable]);

  const [dailyGoal, setDailyGoal] = useState<number | null>(null);
  const [newPerWeek, setNewPerWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState(DEFAULT_SELECTED_DAY);

  const effectiveDaily = dailyGoal ?? defaultDaily;
  const effectiveNew = newPerWeek ?? defaultNewPerWeek;

  const startDistribution = useMemo(
    () => getConfidenceDistribution(reviewable.map((p) => p.confidence)),
    [reviewable],
  );

  const optimisticSeries = useMemo(
    () =>
      simulateProjectionSeries({
        startDistribution,
        dailyGoal: effectiveDaily,
        newPerWeek: effectiveNew,
        days: DAYS,
        advanceRate: 1,
      }),
    [startDistribution, effectiveDaily, effectiveNew],
  );
  const realisticSeries = useMemo(
    () =>
      simulateProjectionSeries({
        startDistribution,
        dailyGoal: effectiveDaily,
        newPerWeek: effectiveNew,
        days: DAYS,
        advanceRate: 0.7,
      }),
    [startDistribution, effectiveDaily, effectiveNew],
  );

  const optimisticDistributions = useMemo(
    () => optimisticSeries.map((day) => day.distribution),
    [optimisticSeries],
  );
  const realisticDistributions = useMemo(
    () => realisticSeries.map((day) => day.distribution),
    [realisticSeries],
  );

  const maxTotal = useMemo(() => {
    const max = Math.max(
      ...optimisticDistributions.map(total),
      ...realisticDistributions.map(total),
      1,
    );
    return Math.max(50, Math.ceil(max / 50) * 50);
  }, [optimisticDistributions, realisticDistributions]);

  const selectedOptimistic = optimisticSeries[selectedDay];
  const selectedRealistic = realisticSeries[selectedDay];
  const selectedOptimisticTotal = total(selectedOptimistic.distribution);
  const selectedRealisticMastered = mastered(selectedRealistic.distribution);
  const selectedOptimisticMastered = mastered(selectedOptimistic.distribution);
  const day30RealisticMastered = mastered(realisticSeries[DAYS].distribution);
  const day30OptimisticMastered = mastered(optimisticSeries[DAYS].distribution);
  const caption = buildCaption(day30RealisticMastered, day30OptimisticMastered);

  const yLabels = useMemo(() => {
    const step = maxTotal / 4;
    return [step, step * 2, step * 3, maxTotal].map(Math.round);
  }, [maxTotal]);

  const chart = useMemo(() => {
    const width = PLOT.x1 - PLOT.x0;
    const height = PLOT.y1 - PLOT.y0;
    const xFor = (day: number) => PLOT.x0 + (day / DAYS) * width;
    const yFor = (value: number) => PLOT.y1 - (value / maxTotal) * height;
    const xPoints = optimisticSeries.map((day) => xFor(day.day));
    const zero = optimisticSeries.map((_, index) => ({ x: xPoints[index], y: yFor(0) }));
    const optimisticTops = CONFIDENCE_LEVELS.map((_, starIndex) =>
      cumulativeSeries(optimisticDistributions, starIndex).map((value, index) => ({
        x: xPoints[index],
        y: yFor(value),
      })),
    );
    const realisticLowBoundary = cumulativeSeries(realisticDistributions, 2).map(
      (value, index) => ({
        x: xPoints[index],
        y: yFor(value),
      }),
    );
    const optimisticLowBoundary = optimisticTops[2];

    return {
      xFor,
      yFor,
      zero,
      optimisticTops,
      realisticLowBoundary,
      optimisticLowBoundary,
    };
  }, [maxTotal, optimisticSeries, optimisticDistributions, realisticDistributions]);

  const updateSelectedDayFromClientX = useCallback((clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * SVG_WIDTH;
    const plotWidth = PLOT.x1 - PLOT.x0;
    const ratio = Math.max(0, Math.min(1, (svgX - PLOT.x0) / plotWidth));
    setSelectedDay(clampDay(Math.round(ratio * DAYS)));
  }, []);

  const handlePointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      updateSelectedDayFromClientX(event.clientX, event.currentTarget);
    },
    [updateSelectedDayFromClientX],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedDay((day) => clampDay(day - 1));
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedDay((day) => clampDay(day + 1));
    }
    if (event.key === "Home") {
      event.preventDefault();
      setSelectedDay(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      setSelectedDay(DAYS);
    }
  }, []);

  const cursorX = chart.xFor(selectedDay);
  const cursorLabelX = clampCursorLabelX(cursorX);
  const cursorPointerOffset = cursorX - cursorLabelX;
  const cursorTotal = selectedOptimisticTotal;
  const plotHeight = PLOT.y1 - PLOT.y0;

  return (
    <section aria-labelledby="progress-projection" className="flex flex-col gap-3">
      <div className="rounded-xl border border-pb-border bg-pb-surface p-5">
        <div className="mb-5 flex h-6 items-center justify-between gap-4">
          <h2 id="progress-projection" className="text-[15px] font-semibold text-pb-text">
            30-Day Projection
          </h2>
          <span className="text-right text-xs text-pb-text-muted max-sm:hidden">
            See how spaced repetition compounds
          </span>
        </div>

        <div className="flex items-stretch max-lg:flex-col">
          <aside className="flex w-[280px] shrink-0 flex-col max-lg:w-full">
            <div className="pb-5 pr-5 max-lg:pr-0">
              <div className="mb-1 text-[13px] font-medium text-pb-text">
                Inputs
              </div>
              <p className="mb-4 text-xs leading-relaxed text-pb-text-muted">
                Simulation inputs — daily pace defaults to your recent activity,
                not your Settings goal.
              </p>
              <div className="flex flex-col gap-4">
                <SliderControl
                  id="projection-daily-reviews"
                  label="Daily reviews"
                  value={effectiveDaily}
                  min={1}
                  max={20}
                  isDefault={dailyGoal === null || dailyGoal === defaultDaily}
                  onChange={(value) => setDailyGoal(value)}
                />
                <SliderControl
                  id="projection-new-per-week"
                  label="New / week"
                  value={effectiveNew}
                  min={0}
                  max={10}
                  isDefault={newPerWeek === null || newPerWeek === defaultNewPerWeek}
                  onChange={(value) => setNewPerWeek(value)}
                />
              </div>
            </div>

            <div className="mr-5 h-px bg-pb-border-light max-lg:mr-0" />

            <div className="flex flex-1 flex-col pr-5 pt-5 max-lg:pr-0">
              <div className="mb-3 text-[13px] font-medium tabular-nums text-pb-text">
                At day {selectedDay}
              </div>
              <div className="mb-0.5 text-[13px] text-pb-text-muted">Mastered</div>
              <div className="text-[32px] font-semibold leading-tight tabular-nums text-pb-text">
                {formatRange(selectedRealisticMastered, selectedOptimisticMastered)}
              </div>
              <div className="mt-1 text-xs text-pb-text-dim">(4–5★)</div>

              <div className="mt-5 grid grid-cols-[auto_auto] justify-start gap-x-5 gap-y-0.5">
                <StatColumn label="Total" value={`${cursorTotal}`} />
                <StatColumn
                  label="Mastery"
                  value={formatPercentRange(
                    selectedRealisticMastered,
                    selectedOptimisticMastered,
                    cursorTotal,
                  )}
                />
              </div>

              <div className="mt-5 text-xs text-pb-text-dim">
                Drag chart to explore other days
              </div>
            </div>
          </aside>

          <div className="w-px self-stretch bg-pb-border-light max-lg:my-5 max-lg:h-px max-lg:w-full" />

          <div className="flex min-w-0 flex-1 flex-col pl-5 max-lg:pl-0">
            <div
              role="slider"
              aria-label="Explore projection day"
              aria-valuemin={0}
              aria-valuemax={DAYS}
              aria-valuenow={selectedDay}
              tabIndex={0}
              className="rounded-lg"
              onPointerDown={handlePointer}
              onPointerMove={(event) => {
                if (event.buttons === 1) handlePointer(event);
              }}
              onKeyDown={handleKeyDown}
            >
              <svg
                className="block h-auto w-full"
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <pattern
                    id="projection-hatch"
                    patternUnits="userSpaceOnUse"
                    width="8"
                    height="8"
                    patternTransform="rotate(45)"
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="8"
                      style={{ stroke: "var(--color-pb-text-muted)" }}
                      strokeOpacity="0.35"
                      strokeWidth="1"
                    />
                  </pattern>
                  <clipPath id="projection-plot-clip">
                    <rect
                      x={PLOT.x0}
                      y={PLOT.y0}
                      width={PLOT.x1 - PLOT.x0}
                      height={plotHeight}
                    />
                  </clipPath>
                </defs>

                <g
                  style={{ stroke: "var(--color-pb-border)" }}
                  strokeWidth="1"
                  strokeDasharray="2 4"
                >
                  {yLabels.map((label) => (
                    <line
                      key={label}
                      x1={PLOT.x0}
                      y1={chart.yFor(label)}
                      x2={PLOT.x1}
                      y2={chart.yFor(label)}
                    />
                  ))}
                </g>

                <g fontSize="11" style={{ fill: "var(--color-pb-text-dim)" }} textAnchor="end">
                  {yLabels.map((label) => (
                    <text key={label} x="30" y={chart.yFor(label) + 4}>
                      {label}
                    </text>
                  ))}
                </g>

                <g clipPath="url(#projection-plot-clip)">
                  {CONFIDENCE_LEVELS.map((level, index) => {
                    const bottom = index === 0 ? chart.zero : chart.optimisticTops[index - 1];
                    const top = chart.optimisticTops[index];
                    return (
                      <path
                        key={`band-${level}`}
                        d={buildBandPath(bottom, top)}
                        style={{ fill: CONFIDENCE_COLORS[level] }}
                        fillOpacity="0.3"
                      />
                    );
                  })}

                  <path
                    d={buildBandPath(chart.optimisticLowBoundary, chart.realisticLowBoundary)}
                    fill="url(#projection-hatch)"
                  />

                  {CONFIDENCE_LEVELS.map((level, index) => (
                    <path
                      key={`edge-${level}`}
                      d={buildLinearPath(chart.optimisticTops[index])}
                      fill="none"
                      style={{ stroke: CONFIDENCE_COLORS[level] }}
                      strokeOpacity="0.7"
                      strokeWidth="1"
                    />
                  ))}

                  <path
                    d={buildLinearPath(chart.realisticLowBoundary)}
                    fill="none"
                    style={{ stroke: "var(--color-pb-text-muted)" }}
                    strokeWidth="1.5"
                    strokeDasharray="8 4"
                  />
                </g>

                <g fontSize="10" style={{ fill: "var(--color-pb-text-muted)" }}>
                  <line
                    x1={PLOT.x1 - 10}
                    y1={chart.realisticLowBoundary[DAYS].y}
                    x2={PLOT.x1 + 3}
                    y2={chart.realisticLowBoundary[DAYS].y}
                    style={{ stroke: "var(--color-pb-text-muted)" }}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={PLOT.x1 + 6}
                    y={chart.realisticLowBoundary[DAYS].y + 4}
                    textAnchor="start"
                  >
                    Realistic
                  </text>
                </g>

                <line
                  x1={cursorX}
                  y1={PLOT.y0}
                  x2={cursorX}
                  y2={PLOT.y1}
                  style={{ stroke: "var(--color-pb-accent)" }}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                <g fontSize="11" style={{ fill: "var(--color-pb-text-dim)" }}>
                  <text x={PLOT.x0} y="328" textAnchor="middle">
                    Day 0
                  </text>
                  <text x={chart.xFor(10)} y="328" textAnchor="middle">
                    Day 10
                  </text>
                  <text x={chart.xFor(20)} y="328" textAnchor="middle">
                    Day 20
                  </text>
                  <text x={PLOT.x1} y="328" textAnchor="end">
                    Day 30
                  </text>
                </g>

                <g data-testid="projection-cursor-label" transform={`translate(${cursorLabelX}, 6)`}>
                  <g transform="translate(-58, 0)">
                    <rect
                      x="0"
                      y="0"
                      width={CURSOR_LABEL_WIDTH}
                      height="22"
                      rx="11"
                      style={{ fill: "var(--color-pb-surface)", stroke: "var(--color-pb-border-strong)" }}
                    />
                    <text
                      x="58"
                      y="15"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      style={{ fill: "var(--color-pb-text)" }}
                    >
                      Day {selectedDay} · Total {cursorTotal}
                    </text>
                  </g>
                  <polygon
                    points={formatCursorPointerPoints(cursorPointerOffset)}
                    style={{ fill: "var(--color-pb-surface)", stroke: "var(--color-pb-border-strong)" }}
                    strokeLinejoin="miter"
                  />
                </g>
              </svg>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
              {CONFIDENCE_LEVELS.map((level) => (
                <div key={level} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: CONFIDENCE_COLORS[level] }}
                  />
                  <span className="text-xs text-pb-text-muted">
                    {level}★
                    <span className="ml-1 tabular-nums text-pb-text-dim">
                      {INTERVALS[level]}d interval
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-4 max-w-[520px] text-center text-[13px] leading-relaxed text-pb-text-muted">
              {caption}
            </p>
            <p className="mx-auto mt-2 max-w-[560px] text-center text-xs leading-relaxed text-pb-text-dim">
              Range shows realistic (70% advancement) to optimistic (100% advancement) outcomes.
              {excludedCount > 0 && (
                <> {excludedCount} excluded problem{excludedCount !== 1 ? "s" : ""} not shown.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SliderControl({
  id,
  label,
  value,
  min,
  max,
  isDefault,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  isDefault: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] text-pb-text-muted">
          {label}
        </label>
        <span className="text-[15px] font-semibold tabular-nums text-pb-text">
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={getRangeTrackStyle(value, min, max)}
        className="h-1 w-full cursor-pointer appearance-none rounded-full accent-pb-accent-solid [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-pb-accent-solid [&::-moz-range-thumb]:bg-pb-surface [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-pb-accent-solid [&::-webkit-slider-thumb]:bg-pb-surface"
      />
      {isDefault && (
        <span className="mt-2 inline-flex rounded-full bg-pb-accent-subtle px-2 py-0.5 text-xs font-medium text-pb-accent">
          your recent pace
        </span>
      )}
    </div>
  );
}

function StatColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-pb-text-muted">{label}</span>
      <span className="text-base font-semibold tabular-nums text-pb-text">{value}</span>
    </div>
  );
}
