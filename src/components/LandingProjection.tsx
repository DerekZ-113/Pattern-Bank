import { useMemo, useState } from "react";
import { simulateProjection } from "@patternbank/core";
import { PROGRESS_CONFIDENCE_TINTS } from "@patternbank/core";
import { INTERVALS } from "@patternbank/core";
import type { Confidence } from "../types";
import type { CSSProperties } from "react";

const SNAPSHOT_LABELS = ["Now", "Day 10", "Day 20", "Day 30"];
const BAR_HEIGHT = 240;

function getDominantProjectionTint(distribution: number[]) {
  let dominantIndex = 0;
  let dominantCount = -1;

  distribution.forEach((count, index) => {
    if (count > dominantCount) {
      dominantCount = count;
      dominantIndex = index;
    }
  });

  return PROGRESS_CONFIDENCE_TINTS[dominantIndex];
}

function getRangeTrackStyle(value: number, min: number, max: number): CSSProperties {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(90deg, #7c6bf5 0%, #7c6bf5 ${pct}%, #23232f ${pct}%, #23232f 100%)`,
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
    <div className="overflow-hidden rounded-[18px] border border-[#23232f] bg-[#12121a] px-5 py-6 md:px-8 md:py-8">
      <div className="grid gap-5 border-b border-[#23232f] pb-6 lg:grid-cols-3">
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
          const columnTint = getDominantProjectionTint(snapshot.distribution);

          return (
            <div key={snapshot.day} className="flex min-w-0 flex-col items-center gap-4">
              <div
                className="flex w-full max-w-[150px] flex-col-reverse overflow-hidden rounded-[10px]"
                style={{
                  height: BAR_HEIGHT,
                  border: `1px solid ${columnTint.border}`,
                  boxShadow: isHighlight
                    ? `0 0 0 2px rgba(124,107,245,0.65), 0 0 0 1px ${columnTint.background}`
                    : `0 0 0 1px ${columnTint.background}`,
                }}
              >
                {snapshot.distribution.map((count, star) => {
                  const height = total > 0 ? (count / maxTotal) * BAR_HEIGHT : 0;
                  const tint = PROGRESS_CONFIDENCE_TINTS[star];

                  return (
                    <div
                      key={star}
                      className="relative flex items-center justify-center"
                      style={{
                        height,
                        minHeight: count > 0 ? 3 : 0,
                        backgroundColor: tint.background,
                        borderTop: count > 0 ? `1px solid ${tint.border}` : undefined,
                        color: tint.text,
                        transition: "height 240ms ease",
                      }}
                    >
                      {count > 2 && height > 22 && (
                        <span className="text-[12px] font-bold tabular-nums">{count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${isHighlight ? "text-[#8f82ff]" : "text-[#8a8a99]"}`}>
                  {SNAPSHOT_LABELS[idx]}
                </div>
                <div className="mt-1 text-sm text-[#8a8a99]">
                  <span className="font-bold text-[#ededf2]">{total}</span> problems
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[#23232f] pt-5">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          {PROGRESS_CONFIDENCE_TINTS.map((tint, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[#8a8a99]">
              <span
                className="h-3 w-3 rounded-[4px] border"
                style={{ backgroundColor: tint.background, borderColor: tint.border }}
              />
              <span>{i + 1}★ {INTERVALS[(i + 1) as Confidence]}d</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-[#8a8a99]">
          <span>
            4-5★: <strong className="text-[#ededf2]">{day30High}</strong>
          </span>
          <span>
            Total: <strong className="text-[#ededf2]">{day30Total}</strong>
          </span>
          <span>
            Mastery: <strong className="text-[#ededf2]">{masteryPct}%</strong>
          </span>
          <span>
            Est. time: <strong className="text-[#ededf2]">{timeEstimate} min/day</strong>
          </span>
        </div>

        <p className="mx-auto mt-5 max-w-[760px] text-center text-xs leading-6 text-[#5e5e6e]">
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
        <span className="text-sm font-medium text-[#a4a4b5]">{label}</span>
        <span className="rounded-full border border-[#7c6bf5]/45 bg-[#7c6bf5]/12 px-3 py-1 text-sm font-bold tabular-nums text-[#ededf2]">
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
        className="h-2 cursor-pointer appearance-none rounded-full accent-[#7c6bf5]"
        style={getRangeTrackStyle(value, min, max)}
      />
    </label>
  );
}
