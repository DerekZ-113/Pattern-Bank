import { useMemo, useState } from "react";
import { simulateProjection } from "@patternbank/core";
import { INTERVALS } from "@patternbank/core";
import { CONFIDENCE_COLORS, CONFIDENCE_LEVELS } from "../utils/confidence";
import type { Confidence } from "../types";
import type { CSSProperties } from "react";

const SNAPSHOT_LABELS = ["Now", "Day 10", "Day 20", "Day 30"];
const BAR_HEIGHT = 240;

function getRangeTrackStyle(value: number, min: number, max: number): CSSProperties {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(90deg, var(--color-pb-accent-solid) 0%, var(--color-pb-accent-solid) ${pct}%, var(--color-pb-border) ${pct}%, var(--color-pb-border) 100%)`,
  };
}

export default function LandingProjection() {
  const [problemCount, setProblemCount] = useState(50);
  const [dailyGoal, setDailyGoal] = useState(5);
  const [newPerWeek, setNewPerWeek] = useState(2);

  const snapshots = useMemo(
    () => simulateProjection([problemCount, 0, 0, 0, 0], dailyGoal, newPerWeek, 30),
    [problemCount, dailyGoal, newPerWeek],
  );

  const day30 = snapshots[snapshots.length - 1];
  const day30High = day30.distribution[3] + day30.distribution[4];
  const day30Total = day30.distribution.reduce((a, b) => a + b, 0);
  const masteryPct = day30Total > 0 ? Math.round((day30High / day30Total) * 100) : 0;
  const timeEstimate = dailyGoal * 8;
  const maxTotal = Math.max(
    ...snapshots.map((snapshot) => snapshot.distribution.reduce((a, b) => a + b, 0)),
    1,
  );

  return (
    <div className="rounded-xl border border-pb-border-light bg-pb-surface px-5 py-6 md:px-8 md:py-8">
      <div className="grid gap-6 border-b border-pb-border-light pb-6 lg:grid-cols-3 lg:gap-10">
        <SliderControl
          label="Problems in library"
          value={problemCount}
          min={10}
          max={400}
          onChange={setProblemCount}
        />
        <SliderControl
          label="Daily reviews"
          value={dailyGoal}
          min={1}
          max={20}
          onChange={setDailyGoal}
        />
        <SliderControl
          label="New / week"
          value={newPerWeek}
          min={0}
          max={10}
          onChange={setNewPerWeek}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 py-8 md:grid-cols-4 md:gap-9">
        {snapshots.map((snapshot, idx) => {
          const total = snapshot.distribution.reduce((a, b) => a + b, 0);
          const isHighlight = idx === 0 || idx === snapshots.length - 1;

          return (
            <div key={snapshot.day} className="flex min-w-0 flex-col items-center gap-4">
              <div
                className="flex w-full max-w-[150px] flex-col-reverse overflow-hidden rounded-[10px] bg-pb-surface-2"
                style={{ height: BAR_HEIGHT }}
              >
                {snapshot.distribution.map((count, star) => {
                  const height = total > 0 ? (count / maxTotal) * BAR_HEIGHT : 0;
                  const color = CONFIDENCE_COLORS[(star + 1) as Confidence];

                  return (
                    <div
                      key={star}
                      className="relative flex items-center justify-center text-pb-text"
                      style={{
                        height,
                        minHeight: count > 0 ? 3 : 0,
                        background: `color-mix(in oklab, ${color} 30%, var(--color-pb-surface))`,
                        // A full-strength edge keeps neighbouring bands apart where the tints are close.
                        borderTop: count > 0 ? `2px solid ${color}` : undefined,
                        transition: "height 240ms ease",
                      }}
                    >
                      {count > 2 && height > 22 && (
                        <span className="text-xs font-semibold tabular-nums">{count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-center">
                <div
                  className={`text-sm font-semibold ${isHighlight ? "text-pb-text" : "text-pb-text-muted"}`}
                >
                  {SNAPSHOT_LABELS[idx]}
                </div>
                <div className="mt-1 text-sm text-pb-text-muted">
                  <span className="font-semibold tabular-nums text-pb-text">{total}</span> problems
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-pb-border-light pt-5">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          {CONFIDENCE_LEVELS.map((level) => (
            <div key={level} className="flex items-center gap-2 text-sm text-pb-text-muted">
              <span
                className="h-3 w-3 rounded-[3px]"
                style={{ background: CONFIDENCE_COLORS[level] }}
              />
              <span>{level}★ {INTERVALS[level]}d</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-pb-text-muted">
          <span>
            4-5★: <strong className="font-semibold tabular-nums text-pb-text">{day30High}</strong>
          </span>
          <span>
            Total: <strong className="font-semibold tabular-nums text-pb-text">{day30Total}</strong>
          </span>
          <span>
            Mastery: <strong className="font-semibold tabular-nums text-pb-text">{masteryPct}%</strong>
          </span>
          <span>
            Est. time: <strong className="font-semibold tabular-nums text-pb-text">{timeEstimate} min/day</strong>
          </span>
        </div>

        <p className="mx-auto mt-5 max-w-prose text-center text-sm leading-6 text-pb-text-dim">
          Projection assumes each review advances confidence by one star. Actual results depend on
          review quality, imported problems, and what you decide to skip.
        </p>
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-pb-text-muted">{label}</span>
        <span className="min-w-10 rounded-md bg-pb-surface-2 px-2 py-0.5 text-center text-sm font-semibold tabular-nums text-pb-text">
          {value}
        </span>
      </div>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 cursor-pointer appearance-none rounded-full accent-pb-accent-solid"
        style={getRangeTrackStyle(value, min, max)}
      />
    </label>
  );
}
