import { useState, useMemo, type CSSProperties } from "react";
import { todayStr, addDays } from "../utils/dateHelpers";
import { getConfidenceDistribution } from "../utils/progressUtils";
import { PROGRESS_CONFIDENCE_TINTS } from "../utils/progressVisuals";
import { simulateProjection } from "../utils/projectionEngine";
import { INTERVALS } from "../utils/spacedRepetition";
import type { Problem, ReviewEvent, Confidence } from "../types";

interface Props {
  problems: Problem[];
  reviewEvents: ReviewEvent[];
}

const SNAPSHOT_LABELS = ["Now", "Day 10", "Day 20", "Day 30"];
const BAR_HEIGHT = 200;

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
  return Math.min(Math.round(recent.length / activeDays), 15);
}

function computeDefaultNewPerWeek(problems: Problem[]): number {
  if (problems.length === 0) return 2;
  const today = todayStr();
  const cutoff = addDays(today, -28);
  const recentCount = problems.filter((p) => p.dateAdded >= cutoff).length;
  if (recentCount === 0) return 2;
  return Math.min(Math.round(recentCount / 4), 10);
}

function getDominantProjectionTint(distribution: number[]) {
  let dominantIndex = 0;
  distribution.forEach((count, index) => {
    if (count > distribution[dominantIndex]) {
      dominantIndex = index;
    }
  });
  return PROGRESS_CONFIDENCE_TINTS[dominantIndex];
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

  const effectiveDaily = dailyGoal ?? defaultDaily;
  const effectiveNew = newPerWeek ?? defaultNewPerWeek;

  const startDistribution = useMemo(
    () => getConfidenceDistribution(reviewable.map((p) => p.confidence)),
    [reviewable],
  );

  const snapshots = useMemo(
    () => simulateProjection(startDistribution, effectiveDaily, effectiveNew, 30),
    [startDistribution, effectiveDaily, effectiveNew],
  );

  // Check mastery edge case
  const highConfCount = startDistribution[3] + startDistribution[4];
  const totalReviewable = reviewable.length;
  const isMastered = totalReviewable > 0 && highConfCount / totalReviewable >= 0.85;

  // Summary stats
  const day0 = snapshots[0];
  const day30 = snapshots[snapshots.length - 1];
  const day0High = day0.distribution[3] + day0.distribution[4];
  const day30High = day30.distribution[3] + day30.distribution[4];
  const day30Total = day30.distribution.reduce((a, b) => a + b, 0);
  const masteryPct = day30Total > 0 ? Math.round((day30High / day30Total) * 100) : 0;
  const highDelta = day30High - day0High;

  const maxTotal = Math.max(...snapshots.map((s) => s.distribution.reduce((a, b) => a + b, 0)), 1);

  return (
    <section aria-labelledby="progress-projection" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 id="progress-projection" className="text-[15px] font-semibold text-[#ededf2]">
          30-Day Projection
        </h2>
        <span className="ml-auto text-right text-xs text-[#5e5e6e] max-sm:hidden">
          See how spaced repetition compounds
        </span>
      </div>
      <div className="rounded-[10px] border border-[#23232f] bg-[#12121a] px-[22px] py-5">

      {isMastered ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="text-2xl">🏆</span>
          <p className="text-[15px] font-semibold text-[#ededf2]">
            You've mastered most of your library
          </p>
          <p className="text-[13px] text-[#8a8a99]">
            {highConfCount} of {totalReviewable} reviewable problems are at 4–5 stars.
            Keep reviewing to maintain your edge.
          </p>
        </div>
      ) : (
        <>
          {/* Sliders */}
          <div className="grid gap-x-7 gap-y-5 border-b border-[#23232f] pb-[22px] md:grid-cols-2">
            <SliderControl
              label="Daily reviews"
              value={effectiveDaily}
              min={1}
              max={15}
              isDefault={dailyGoal === null || dailyGoal === defaultDaily}
              onChange={(v) => setDailyGoal(v)}
            />
            <SliderControl
              label="New / week"
              value={effectiveNew}
              min={0}
              max={10}
              isDefault={newPerWeek === null || newPerWeek === defaultNewPerWeek}
              onChange={(v) => setNewPerWeek(v)}
            />
          </div>

          {/* Stacked bar chart */}
          <div className="mt-[22px] grid grid-cols-4 items-end gap-4 md:gap-[22px]">
            {snapshots.map((snapshot, idx) => {
              const total = snapshot.distribution.reduce((a, b) => a + b, 0);
              const columnTint = getDominantProjectionTint(snapshot.distribution);
              return (
                <div
                  key={snapshot.day}
                  className="flex min-w-0 flex-col items-center"
                >
                  {/* Stacked bar */}
                  <div
                    className="flex w-full max-w-[130px] flex-col-reverse overflow-hidden rounded-lg"
                    style={{
                      height: BAR_HEIGHT,
                      border: `1px solid ${columnTint.border}`,
                      boxShadow: `0 0 0 1px ${columnTint.background}`,
                      boxSizing: "border-box",
                    }}
                  >
                    {snapshot.distribution.map((count, star) => {
                      const height = total > 0 ? (count / maxTotal) * BAR_HEIGHT : 0;
                      const segment = PROGRESS_CONFIDENCE_TINTS[star];
                      return (
                        <div
                          key={star}
                          className="relative flex items-center justify-center"
                          style={{
                            height,
                            backgroundColor: segment.background,
                            borderTop: count > 0 ? `1px solid ${segment.border}` : undefined,
                            boxSizing: "border-box",
                            color: segment.text,
                            transition: "height 0.3s ease",
                          }}
                        >
                          {count > 2 && height > 16 && (
                            <span className="text-[10px] font-bold">
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Label */}
                  <div className="mt-3 flex flex-col items-center gap-0.5 text-xs text-[#8a8a99]">
                    <span className={idx === 0 || idx === snapshots.length - 1 ? "font-semibold text-[#7c6bf5]" : ""}>
                      {SNAPSHOT_LABELS[idx]}
                    </span>
                    <span>
                      <span className="font-semibold text-[#ededf2]">{total}</span>{" "}
                      <span className="text-[#5e5e6e]">
                        problem{total !== 1 ? "s" : ""}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-[22px] flex flex-wrap items-center justify-center gap-x-[18px] gap-y-2 border-t border-[#23232f] pt-[18px]">
            {PROGRESS_CONFIDENCE_TINTS.map((style, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="rounded-[3px] border"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: style.background,
                    borderColor: style.border,
                  }}
                />
                <span className="text-xs text-[#8a8a99]">
                  {i + 1}★ <span className="text-[#5e5e6e]">{INTERVALS[(i + 1) as Confidence]}d interval</span>
                </span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs">
            <span className="text-[#8a8a99]">
              4–5 ★:{" "}
              <span className="font-semibold text-[#ededf2]">{day30High}</span>
              {highDelta > 0 && (
                <span className="ml-1 text-[#4ade80]">(+{highDelta})</span>
              )}
            </span>
            <span className="text-[#8a8a99]">
              Total:{" "}
              <span className="font-semibold text-[#ededf2]">{day30Total}</span>
            </span>
            <span className="text-[#8a8a99]">
              Mastery:{" "}
              <span className="font-semibold text-[#ededf2]">{masteryPct}%</span>
            </span>
          </div>

          {/* Contextual message */}
          <p className="mt-3 text-center text-xs text-[#5e5e6e]">
            {masteryPct >= 70
              ? "Great pace — you're on track to master most of your library."
              : masteryPct >= 40
                ? "Steady progress. Consider increasing daily reviews to accelerate."
                : "Consistent daily practice will compound. Start small and build up."}
          </p>
        </>
      )}

      {/* Footnote */}
      <p className="mt-3 text-center text-xs leading-relaxed text-[#5e5e6e]">
        Projection assumes each review advances confidence by one star (optimistic).
        Actual results depend on review quality.
        {excludedCount > 0 && (
          <> {excludedCount} excluded problem{excludedCount !== 1 ? "s" : ""} not shown.</>
        )}
      </p>
      </div>
    </section>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  isDefault,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  isDefault: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 max-sm:grid-cols-[1fr_auto]">
      <span className="text-[13px] text-[#8a8a99] max-sm:col-span-2">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={getRangeTrackStyle(value, min, max)}
        className="h-1 cursor-pointer appearance-none rounded-full outline-none accent-[#7c6bf5] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(124,107,245,0.55),0_2px_6px_rgba(0,0,0,0.4)]"
      />
      <span className="min-w-7 text-right text-[13px] font-semibold tabular-nums text-[#ededf2]">
        {value}
      </span>
      {isDefault && (
        <span className="shrink-0 rounded-full border border-[#7c6bf5]/30 bg-[#1c1838] px-2 py-0.5 text-[10px] font-semibold text-[#b6abff] max-sm:hidden">
          your pace
        </span>
      )}
    </div>
  );
}
