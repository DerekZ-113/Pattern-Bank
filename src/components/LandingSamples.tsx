import PatternHeatmap from "./PatternHeatmap";
import TodayGoalMeter from "./TodayGoalMeter";
import TodayLeetCodeCard from "./TodayLeetCodeCard";
import TodayReviewCard from "./TodayReviewCard";
import TodaySectionHeader from "./TodaySectionHeader";
import type { LandingSample } from "../utils/landingSample";
import type { ReactNode } from "react";

// The landing page's pictures of the app. Each one is the app's real
// component, fed sample data and made inert, so it always looks like the app
// and nothing in it can be focused, pressed or read out control by control.
// A screen reader gets the one-line description instead.

const noop = () => {};

function Sample({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="img" aria-label={label} data-landing-sample className={`select-none ${className}`}>
      <div inert aria-hidden="true">
        {children}
      </div>
    </div>
  );
}

/** The top of Today: the goal line and the reviews that are due. */
export function TodaySample({ sample }: { sample: LandingSample }) {
  const { due, goal } = sample;
  return (
    <Sample
      label={`Sample of the Today screen: ${goal.reviewedToday} of ${goal.effectiveGoal} reviews done, and ${due.length} due, ${due.map((p) => p.title).join(" and ")}`}
      className="rounded-2xl border border-pb-border-light bg-pb-surface-2 p-4 sm:p-5"
    >
      <p className="m-0 text-[22px] font-bold leading-tight tracking-tight text-pb-text">Today</p>
      <div className="mt-3">
        <TodayGoalMeter {...goal} />
      </div>
      <div className="mt-6">
        <TodaySectionHeader title="Reviews due" count={due.length} subcopy="Weakest first" />
        <div className="space-y-3">
          {due.map((problem) => (
            <TodayReviewCard
              key={problem.id}
              problem={problem}
              onReview={noop}
              onDismiss={noop}
              onUpdateNotes={noop}
            />
          ))}
        </div>
      </div>
    </Sample>
  );
}

/** A solve LeetCode reported, waiting for its first rating. */
export function LeetCodeSample({ sample }: { sample: LandingSample }) {
  return (
    <Sample
      label={`Sample of a solve from LeetCode: ${sample.leetcode.title}, waiting for a confidence rating`}
    >
      <TodayLeetCodeCard item={sample.leetcode} onConfirm={noop} onIgnore={noop} />
    </Sample>
  );
}

/** Progress's pattern grid over the sample library. */
export function PatternSample({ sample }: { sample: LandingSample }) {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const problem of sample.library) {
    for (const pattern of problem.patterns) {
      const entry = totals.get(pattern) ?? { sum: 0, count: 0 };
      totals.set(pattern, { sum: entry.sum + problem.confidence, count: entry.count + 1 });
    }
  }
  const ranked = [...totals.entries()]
    .map(([pattern, { sum, count }]) => ({ pattern, average: sum / count }))
    .sort((a, b) => a.average - b.average);
  const weakest = ranked[0];
  const strongest = ranked[ranked.length - 1];

  return (
    <Sample
      label={`Sample of pattern confidence: each pattern with its number of problems and average confidence, from ${weakest.pattern} at ${weakest.average.toFixed(1)} to ${strongest.pattern} at ${strongest.average.toFixed(1)}`}
    >
      <PatternHeatmap problems={sample.library} onPatternClick={noop} />
    </Sample>
  );
}
