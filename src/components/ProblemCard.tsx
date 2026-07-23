import StarRating from "./StarRating";
import DifficultyBadge from "./DifficultyBadge";
import PatternTagList from "./PatternTagList";
import { todayStr, formatRelativeDate } from "@patternbank/core";
import type { Problem } from "../types";

interface Props {
  problem: Problem;
  onEdit: (problem: Problem) => void;
  onDelete: (problem: Problem) => void;
  onToggleExclude?: (id: string) => void;
}

export default function ProblemCard({ problem, onEdit, onDelete, onToggleExclude }: Props) {
  const isExcluded = problem.excludeFromReview;
  const isDue = !isExcluded && problem.nextReviewDate <= todayStr();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(problem);
  };

  const handleToggleExclude = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExclude?.(problem.id);
  };

  const getReviewStatusText = () => {
    if (isExcluded) return "Excluded from reviews";
    if (isDue) return "Due for review";
    return `Next review: ${formatRelativeDate(problem.nextReviewDate)}`;
  };

  return (
    <article
      onClick={() => onEdit(problem)}
      className={`cursor-pointer rounded-[10px] border bg-pb-surface px-4 py-3.5 transition-[border-color,background,opacity] duration-150 hover:border-pb-border-strong hover:bg-pb-surface-2 ${
        isDue ? "border-pb-accent/35" : "border-pb-border"
      } ${isExcluded ? "opacity-60" : ""}`}
    >
      {/* Title row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-0 flex-1 basis-full flex-wrap items-baseline gap-2 sm:basis-auto">
          <span className="text-[15px] font-semibold tracking-normal text-pb-text">{problem.title}</span>
          {problem.leetcodeNumber && <span className="font-mono text-[13px] font-medium text-pb-text-dim">#{problem.leetcodeNumber}</span>}
        </div>
        <DifficultyBadge difficulty={problem.difficulty} />
        <div className="flex shrink-0 items-center gap-1">
          {onToggleExclude && (
            <button
              type="button"
              onClick={handleToggleExclude}
              title={isExcluded ? "Include in reviews" : "Exclude from reviews"}
              aria-label={isExcluded ? "Include in reviews" : "Exclude from review"}
              className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border transition-colors duration-150 ${
                isExcluded
                  ? "border-pb-medium/30 bg-pb-medium/10 text-pb-medium hover:bg-pb-medium/15"
                  : "border-transparent text-pb-text-dim hover:border-pb-border hover:bg-pb-surface-2 hover:text-pb-text"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <circle cx="12" cy="12" r="9" />
                {isExcluded && <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />}
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            title="Delete problem"
            aria-label="Delete problem"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent text-pb-text-dim transition-colors duration-150 hover:border-pb-border hover:bg-pb-surface-2 hover:text-pb-hard"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="h-3.5 w-3.5"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Pattern tags */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PatternTagList patterns={problem.patterns} />
      </div>

      {/* Confidence and review date */}
      <div
        className="mt-2.5 flex items-center justify-between gap-3"
      >
        <StarRating value={problem.confidence} size={16} />
        <span
          className={`inline-flex items-center gap-1.5 text-xs ${
            isExcluded
              ? "text-pb-medium"
              : isDue
                ? "font-semibold text-pb-accent"
                : "text-pb-text-muted"
          }`}
        >
          {isDue && (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-pb-accent shadow-[0_0_0_3px_rgba(124,107,245,0.18)]"
            />
          )}
          {getReviewStatusText()}
        </span>
      </div>
    </article>
  );
}
