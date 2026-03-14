import StarRating from "./StarRating";
import DifficultyBadge from "./DifficultyBadge";
import PatternTag from "./PatternTag";
import { todayStr, formatRelativeDate } from "../utils/dateHelpers";
import type { Problem } from "../types";

interface Props {
  problem: Problem;
  onEdit: (problem: Problem) => void;
  onDelete: (problem: Problem) => void;
  onToggleExclude?: (id: string) => void;
}

export default function ProblemCard({ problem, onEdit, onDelete, onToggleExclude }: Props) {
  const isDue = problem.nextReviewDate <= todayStr();
  const isExcluded = problem.excludeFromReview;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(problem);
  };

  const handleToggleExclude = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExclude!(problem.id);
  };

  const getReviewStatusText = () => {
    if (isExcluded) return "Excluded from review";
    if (isDue) return problem.lastReviewed ? "Due for review" : "New";
    return `Next review: ${formatRelativeDate(problem.nextReviewDate)}`;
  };

  return (
    <div
      onClick={() => onEdit(problem)}
      className={`cursor-pointer rounded-[10px] border border-pb-border bg-pb-surface px-5 py-4 transition-[border-color,box-shadow,opacity] duration-150 hover:border-pb-text-dim hover:shadow-[0_0_0_1px_rgba(124,107,245,0.1),0_4px_12px_rgba(0,0,0,0.3)] ${isExcluded ? "opacity-60" : ""}`}
    >
      {/* Title row */}
      <div className="mb-2.5 flex items-start justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold text-pb-text">
            {problem.title}
          </span>
          {problem.leetcodeNumber && (
            <span className="text-xs text-pb-text-muted">
              #{problem.leetcodeNumber}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DifficultyBadge difficulty={problem.difficulty} />
          {onToggleExclude && (
            <button
              onClick={handleToggleExclude}
              title={isExcluded ? "Include in reviews" : "Exclude from reviews"}
              className={`cursor-pointer rounded border-none bg-transparent px-1.5 py-0.5 text-sm leading-none transition-colors duration-150 ${
                isExcluded
                  ? "text-pb-accent hover:text-pb-accent-hover"
                  : "text-pb-text-dim hover:text-pb-text-muted"
              }`}
            >
              {isExcluded ? "↩" : "⏸"}
            </button>
          )}
          <button
            onClick={handleDelete}
            title="Delete problem"
            className="cursor-pointer rounded border-none bg-transparent px-1.5 py-0.5 text-sm leading-none text-pb-text-dim transition-colors duration-150 hover:text-pb-hard"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Pattern tags */}
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {problem.patterns.map((p) => (
          <PatternTag key={p} name={p} />
        ))}
      </div>

      {/* Confidence and review date */}
      <div
        className={`flex items-center justify-between ${problem.notes ? "mb-2.5" : ""}`}
      >
        <StarRating value={problem.confidence} size={16} />
        <span
          className={`text-xs ${
            isExcluded
              ? "text-pb-text-dim"
              : isDue
                ? "text-pb-star"
                : "text-pb-text-dim"
          }`}
        >
          {getReviewStatusText()}
        </span>
      </div>

      {/* URL link */}
      {problem.url && (
        <div className={problem.notes ? "mb-2.5" : ""}>
          <a
            href={problem.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-pb-accent hover:text-pb-accent-hover transition-colors duration-150"
          >
            Open on LeetCode →
          </a>
        </div>
      )}

      {/* Notes preview */}
      {problem.notes && (
        <div className="max-h-[60px] overflow-hidden whitespace-pre-wrap rounded-md bg-pb-bg px-3 py-2 text-[13px] leading-relaxed text-pb-text-muted">
          {problem.notes}
        </div>
      )}
    </div>
  );
}
