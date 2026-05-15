import ProblemListPicker from "./ProblemListPicker";
import type { LeetCodeProblem } from "../types";

interface Props {
  onAddClick: () => void;
  onBulkAdd: (problems: LeetCodeProblem[], patternMap?: Map<number, string[]> | null) => void;
  existingProblemNumbers: Set<number>;
}

export default function TodayQuickStart({ onAddClick, onBulkAdd, existingProblemNumbers }: Props) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface shadow-sm">
      <div className="h-0.5 bg-gradient-to-r from-transparent via-pb-accent to-transparent" />
      <div className="px-6 py-6">
        <h2 className="mb-1.5 text-lg font-semibold text-pb-text">Welcome to PatternBank</h2>
        <p className="mb-5 text-sm text-pb-text-muted">
          Add your first problem to get started with spaced repetition.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[10px] border border-pb-border bg-pb-bg p-5">
            <h3 className="mb-1.5 text-[13px] font-semibold text-pb-text">Add a problem</h3>
            <p className="mb-4 text-xs leading-relaxed text-pb-text-muted">
              Search from 3,800+ LeetCode problems or create your own.
            </p>
            <button
              onClick={onAddClick}
              className="cursor-pointer rounded-lg border-none bg-pb-accent px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
            >
              Add Problem
            </button>
          </div>

          <div className="rounded-[10px] border border-pb-border bg-pb-bg p-5">
            <h3 className="mb-1.5 text-[13px] font-semibold text-pb-text">Import a curated list</h3>
            <p className="mb-4 text-xs leading-relaxed text-pb-text-muted">
              Start with a popular set, already tagged by pattern.
            </p>
            <ProblemListPicker
              existingIds={existingProblemNumbers}
              onBulkAdd={onBulkAdd}
              hideLabel
            />
          </div>
        </div>
      </div>
    </div>
  );
}
