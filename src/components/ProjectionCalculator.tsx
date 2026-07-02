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
import { simulateProjectionSeries, type Distribution } from "../utils/projectionEngine";
import { INTERVALS } from "@patternbank/core";
import type { Problem, ReviewEvent, Confidence } from "../types";

interface Props {
  problems: Problem[];
  reviewEvents: ReviewEvent[];
}

interface Point {
  x: number;
  y: number;
}

interface ChartTint {
  fill: string;
  stroke: string;
  solid: string;
}

const DAYS = 30;
const DEFAULT_SELECTED_DAY = 18;
const SVG_WIDTH = 660;
const SVG_HEIGHT = 348;
const PLOT = { x0: 38, y0: 32, x1: 610, y1: 312 };
const CURSOR_LABEL_WIDTH = 116;
const CURSOR_LABEL_HALF_WIDTH = CURSOR_LABEL_WIDTH / 2;
const CHART_TINTS: readonly ChartTint[] = [
  { fill: "rgba(247,96,96,0.32)", stroke: "rgba(247,96,96,0.62)", solid: "#ef4444" },
  { fill: "rgba(251,146,60,0.32)", stroke: "rgba(251,146,60,0.62)", solid: "#fb923c" },
  { fill: "rgba(245,185,66,0.32)", stroke: "rgba(245,185,66,0.62)", solid: "#f5b942" },
  { fill: "rgba(96,165,250,0.32)", stroke: "rgba(96,165,250,0.62)", solid: "#60a5fa" },
  { fill: "rgba(74,222,128,0.32)", stroke: "rgba(74,222,128,0.62)", solid: "#4ade80" },
];

function getRangeTrackStyle(value: number, min: number, max: number): CSSProperties {
  const fill = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, #7c6bf5 0%, #7c6bf5 ${fill}%, #20202c ${fill}%, #20202c 100%)`,
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

function total(distribution: Distribution): number {
  return distribution.reduce((sum, count) => sum + count, 0);
}

function mastered(distribution: Distribution): number {
  return distribution[3] + distribution[4];
}

function cumulativeSeries(series: Distribution[], starIndex: number): number[] {
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
    const optimisticTops = CHART_TINTS.map((_, starIndex) =>
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
      <div className="rounded-[10px] border border-[#23232f] bg-[#12121a] px-[22px] py-[22px]">
        <div className="mb-[18px] flex h-6 items-center justify-between gap-4">
          <h2 id="progress-projection" className="text-[15px] font-semibold tracking-normal text-[#ededf2]">
            30-Day Projection
          </h2>
          <span className="text-right text-xs text-[#5e5e6e] max-sm:hidden">
            See how spaced repetition compounds
          </span>
        </div>

        <div className="flex items-stretch max-lg:flex-col">
          <aside className="flex w-[280px] shrink-0 flex-col max-lg:w-full">
            <div className="pr-[18px] pb-[18px] max-lg:pr-0">
              <div className="mb-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5e5e6e]">
                INPUTS
              </div>
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

            <div className="mr-[18px] h-px bg-[#1a1a24] max-lg:mr-0" />

            <div className="flex flex-1 flex-col pr-[18px] pt-[18px] max-lg:pr-0">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#b6abff]">
                AT DAY {selectedDay}
              </div>
              <div className="mb-0.5 text-[13px] text-[#8a8a99]">Mastered</div>
              <div className="text-[32px] font-semibold leading-tight tracking-[-0.01em] tabular-nums text-[#ededf2]">
                {formatRange(selectedRealisticMastered, selectedOptimisticMastered)}
              </div>
              <div className="mt-1 text-[11px] text-[#5e5e6e]">(4–5★)</div>

              <div className="mt-5 grid grid-cols-[auto_auto] justify-start gap-x-3 gap-y-0.5">
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

              <div className="mt-[18px] text-[11px] italic text-[#5e5e6e]">
                Drag chart to explore other days
              </div>
            </div>
          </aside>

          <div className="w-px self-stretch bg-[#1a1a24] max-lg:my-5 max-lg:h-px max-lg:w-full" />

          <div className="flex min-w-0 flex-1 flex-col pl-[22px] max-lg:pl-0">
            <div
              role="slider"
              aria-label="Explore projection day"
              aria-valuemin={0}
              aria-valuemax={DAYS}
              aria-valuenow={selectedDay}
              tabIndex={0}
              className="outline-none focus-visible:ring-2 focus-visible:ring-[#7c6bf5]/70"
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
                      stroke="rgba(124,107,245,0.28)"
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

                <g stroke="rgba(35,35,47,0.62)" strokeWidth="1" strokeDasharray="2 4">
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

                <g fontSize="11" fill="#5e5e6e" textAnchor="end">
                  {yLabels.map((label) => (
                    <text key={label} x="30" y={chart.yFor(label) + 4}>
                      {label}
                    </text>
                  ))}
                </g>

                <g clipPath="url(#projection-plot-clip)">
                  {CHART_TINTS.map((tint, index) => {
                    const bottom = index === 0 ? chart.zero : chart.optimisticTops[index - 1];
                    const top = chart.optimisticTops[index];
                    return (
                      <path
                        key={tint.fill}
                        d={buildBandPath(bottom, top)}
                        fill={tint.fill}
                      />
                    );
                  })}

                  <path
                    d={buildBandPath(chart.optimisticLowBoundary, chart.realisticLowBoundary)}
                    fill="url(#projection-hatch)"
                  />

                  {CHART_TINTS.map((tint, index) => (
                    <path
                      key={tint.stroke}
                      d={buildLinearPath(chart.optimisticTops[index])}
                      fill="none"
                      stroke={tint.stroke}
                      strokeWidth="1"
                    />
                  ))}

                  <path
                    d={buildLinearPath(chart.realisticLowBoundary)}
                    fill="none"
                    stroke="rgba(237,237,242,0.72)"
                    strokeWidth="1.5"
                    strokeDasharray="8 4"
                  />
                </g>

                <g fontSize="10" fill="#8a8a99">
                  <line
                    x1={PLOT.x1 - 10}
                    y1={chart.realisticLowBoundary[DAYS].y}
                    x2={PLOT.x1 + 3}
                    y2={chart.realisticLowBoundary[DAYS].y}
                    stroke="rgba(237,237,242,0.55)"
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
                  stroke="rgba(124,107,245,0.58)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                <g fontSize="11">
                  <text x={PLOT.x0} y="328" textAnchor="middle" fill="#5e5e6e">
                    Day 0
                  </text>
                  <text x={chart.xFor(10)} y="328" textAnchor="middle" fill="#8a8a99">
                    Day 10
                  </text>
                  <text x={chart.xFor(20)} y="328" textAnchor="middle" fill="#8a8a99">
                    Day 20
                  </text>
                  <text x={PLOT.x1} y="328" textAnchor="end" fill="#5e5e6e">
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
                      fill="#1c1838"
                      stroke="rgba(124,107,245,0.45)"
                    />
                    <text
                      x="58"
                      y="15"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill="#b6abff"
                    >
                      Day {selectedDay} · Total {cursorTotal}
                    </text>
                  </g>
                  <polygon
                    points={formatCursorPointerPoints(cursorPointerOffset)}
                    fill="#1c1838"
                    stroke="rgba(124,107,245,0.45)"
                    strokeLinejoin="miter"
                  />
                </g>
              </svg>
            </div>

            <div className="mt-3.5 flex flex-wrap justify-center gap-x-[18px] gap-y-2">
              {CHART_TINTS.map((tint, index) => (
                <div key={tint.solid} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-[3px]"
                    style={{ backgroundColor: tint.solid }}
                  />
                  <span className="text-[11px] font-medium text-[#8a8a99]">
                    {index + 1}★
                    <span className="ml-1 text-[#5e5e6e]">
                      {INTERVALS[(index + 1) as Confidence]}d interval
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-3.5 max-w-[520px] text-center text-xs leading-relaxed text-[#8a8a99]">
              {caption}
            </p>
            <p className="mx-auto mt-3 max-w-[560px] text-center text-[11px] leading-relaxed text-[#5e5e6e]">
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
        <label htmlFor={id} className="text-xs text-[#8a8a99]">
          {label}
        </label>
        <span className="text-[15px] font-semibold tabular-nums text-[#ededf2]">
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
        className="h-1 w-full cursor-pointer appearance-none rounded-full outline-none accent-[#7c6bf5] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
      />
      {isDefault && (
        <span className="mt-2 inline-flex rounded-full border border-[#7c6bf5]/30 bg-[#1c1838] px-2.5 py-1 text-[10px] font-semibold leading-none text-[#b6abff]">
          your pace
        </span>
      )}
    </div>
  );
}

function StatColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-[#8a8a99]">{label}</span>
      <span className="text-base font-semibold tabular-nums text-[#ededf2]">{value}</span>
    </div>
  );
}
