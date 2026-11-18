import { getVisiblePatterns } from "../utils/constants";
import { confidenceTextColor, confidenceTileStyle } from "../utils/confidence";
import type { Problem } from "../types";

interface Props {
  problems: Problem[];
  onPatternClick: (pattern: string) => void;
  enabledExtraPatterns?: string[];
}

export default function PatternHeatmap({ problems, onPatternClick, enabledExtraPatterns }: Props) {
  const allPatterns = getVisiblePatterns(enabledExtraPatterns ?? []);

  // Compute stats per pattern
  const statsMap: Record<string, { count: number; totalConf: number }> = {};
  allPatterns.forEach((p) => {
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

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {allPatterns.map((pattern) => {
          const data = statsMap[pattern];
          const hasProblems = data.count > 0;
          const avgConf = hasProblems ? data.totalConf / data.count : 0;
          const problemLabel = data.count === 1 ? "problem" : "problems";
          const confidenceLabel = hasProblems
            ? `average confidence ${avgConf.toFixed(1)}`
            : "no problems yet";

          return (
            <button
              key={pattern}
              type="button"
              aria-label={`${pattern}: ${data.count} ${problemLabel}, ${confidenceLabel}`}
              onClick={() => onPatternClick(pattern)}
              style={hasProblems ? confidenceTileStyle(avgConf) : undefined}
              className={`flex min-h-[76px] w-full cursor-pointer appearance-none flex-col justify-between rounded-[10px] border p-3 text-left font-[inherit] ${
                hasProblems
                  ? "text-pb-text transition-[filter] hover:brightness-110"
                  : "border-pb-border-light bg-transparent text-pb-text-dim transition-colors hover:border-pb-border-strong hover:text-pb-text-muted"
              }`}
            >
              <span className={`text-[13px] leading-tight ${hasProblems ? "font-semibold" : "font-medium"}`}>
                {pattern}
              </span>
              {hasProblems && (
                <span className="flex items-end justify-between gap-2">
                  <span className="text-xs tabular-nums text-pb-text-muted">
                    {data.count}
                    <span className="max-sm:hidden"> {problemLabel}</span>
                  </span>
                  <span
                    className="text-[15px] font-bold leading-none tabular-nums"
                    style={{ color: confidenceTextColor(avgConf) }}
                  >
                    {avgConf.toFixed(1)}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
