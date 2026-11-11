import { useEffect, useRef, useState } from "react";
import StarPicker from "./StarPicker";
import DifficultyBadge from "./DifficultyBadge";
import Icon from "./Icon";
import PatternTagList from "./PatternTagList";
import ReviewRatePanel from "./ReviewRatePanel";
import { todayStr, formatRelativeDate } from "@patternbank/core";
import { buttonClass, iconButtonClass } from "../utils/buttonStyles";
import type { Confidence, Problem } from "../types";

interface Props {
  problem: Problem;
  onEdit: (problem: Problem) => void;
  onDelete: (problem: Problem) => void;
  onToggleExclude?: (id: string) => void;
  onReview?: (id: string, confidence: Confidence) => void;
}

export default function ProblemCard({ problem, onEdit, onDelete, onToggleExclude, onReview }: Props) {
  const isExcluded = problem.excludeFromReview;
  const isDue = !isExcluded && problem.nextReviewDate <= todayStr();
  const [reviewing, setReviewing] = useState(false);
  const canReview = isDue && !!onReview;
  const articleRef = useRef<HTMLElement>(null);
  const reviewButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusTo = useRef<"button" | "card" | null>(null);

  // The panel replaces the Review button, so closing it must hand focus
  // somewhere deliberate instead of dropping keyboard users to <body>.
  useEffect(() => {
    if (reviewing || !restoreFocusTo.current) return;
    if (restoreFocusTo.current === "button") reviewButtonRef.current?.focus();
    else articleRef.current?.focus();
    restoreFocusTo.current = null;
  }, [reviewing]);

  // The whole row opens the editor on click, which a keyboard cannot do — the
  // title is the real control. It stops the click so the row does not fire too.
  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(problem);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(problem);
  };

  const handleToggleExclude = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExclude?.(problem.id);
  };

  const handleStartReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReviewing(true);
  };

  const handleReviewDone = (confidence: Confidence) => {
    restoreFocusTo.current = "card";
    onReview?.(problem.id, confidence);
    setReviewing(false);
  };

  const handleReviewBack = () => {
    restoreFocusTo.current = "button";
    setReviewing(false);
  };

  const getReviewStatusText = () => {
    if (isExcluded) return "Excluded from reviews";
    if (isDue) return "Due for review";
    return `Next review: ${formatRelativeDate(problem.nextReviewDate)}`;
  };

  return (
    <article
      ref={articleRef}
      tabIndex={-1}
      onClick={() => onEdit(problem)}
      className={`cursor-pointer border-t border-pb-border-light px-4 py-3 transition-colors duration-150 first:border-t-0 hover:bg-pb-surface-2 sm:px-5 ${
        isExcluded ? "opacity-60" : ""
      }`}
    >
      {/* From md up: one aligned row (problem | confidence | status | actions).
          Below md: two independent flex rows, so the wide status cell cannot
          squeeze the title. `md:contents` dissolves the row wrappers into the
          grid; `md:order-last` moves the actions to the final column. */}
      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-[minmax(0,1fr)_92px_176px_60px] md:items-center md:gap-x-4">
        <div className="flex items-start justify-between gap-3 md:contents">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h3 className="m-0 text-[15px] font-semibold leading-snug text-pb-text">
                <button
                  type="button"
                  onClick={handleOpen}
                  className="cursor-pointer border-none bg-transparent p-0 text-left text-[15px] font-semibold leading-snug text-pb-text transition-colors duration-150 hover:text-pb-accent"
                >
                  {problem.title}
                </button>
              </h3>
              {problem.leetcodeNumber && (
                <span className="font-mono text-[13px] text-pb-text-dim">#{problem.leetcodeNumber}</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <DifficultyBadge difficulty={problem.difficulty} />
              <PatternTagList patterns={problem.patterns} />
            </div>
          </div>

          <div className="-mr-1.5 -mt-1 flex shrink-0 items-center gap-0.5 md:order-last md:m-0 md:justify-end">
            {onToggleExclude && (
              <button
                type="button"
                onClick={handleToggleExclude}
                title={isExcluded ? "Include in reviews" : "Exclude from reviews"}
                aria-label={isExcluded ? "Include in reviews" : "Exclude from review"}
                className={`${iconButtonClass("sm")} ${isExcluded ? "text-pb-warning hover:text-pb-warning" : ""}`}
              >
                <Icon name="exclude" className="h-[15px] w-[15px]" />
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              title="Delete problem"
              aria-label="Delete problem"
              className={`${iconButtonClass("sm")} hover:text-pb-error`}
            >
              <Icon name="trash" className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:contents">
          <StarPicker mode="display" size="md" value={problem.confidence} />

          <div className="flex items-center justify-end gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 text-xs ${
                isExcluded
                  ? "text-pb-text-dim"
                  : isDue
                    ? "font-semibold text-pb-accent"
                    : "tabular-nums text-pb-text-muted"
              }`}
            >
              {isDue && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-pb-accent" />}
              {getReviewStatusText()}
            </span>
            {canReview && !reviewing && (
              <button
                ref={reviewButtonRef}
                type="button"
                onClick={handleStartReview}
                className={buttonClass("soft", "sm")}
              >
                Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* The row itself opens the editor on click; the panel swallows its
          own clicks so rating, Back, Done, and Open never trigger that. */}
      {reviewing && canReview && (
        <div className="mt-3 cursor-default" onClick={(e) => e.stopPropagation()}>
          <ReviewRatePanel
            problem={problem}
            onDone={handleReviewDone}
            onBack={handleReviewBack}
          />
        </div>
      )}
    </article>
  );
}
