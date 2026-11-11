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
      className={`cursor-pointer border-t border-pb-border-light px-4 py-3 transition-colors duration-150 first:border-t-0 hover:bg-pb-surface-2 focus-visible:outline-offset-[-2px] sm:px-5 ${
        isExcluded ? "opacity-60" : ""
      }`}
    >
      {/* One aligned row from md up: problem | confidence | status | actions.
          Below md the problem takes the first line and the rest share the
          second. DOM order is reading order at every width, so Tab follows
          the eye. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2.5 md:grid-cols-[minmax(0,1fr)_92px_176px_60px] md:gap-x-4">
        <div className="col-span-3 min-w-0 md:col-span-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="m-0 text-[15px] font-semibold leading-snug text-pb-text">
              <button
                type="button"
                onClick={handleOpen}
                className="cursor-pointer border-none bg-transparent p-0 text-left text-[15px] font-semibold leading-snug text-pb-text transition-colors duration-150 hover:text-pb-accent"
              >
                {problem.title}
              </button>
            </h2>
            {problem.leetcodeNumber && (
              <span className="font-mono text-[13px] text-pb-text-dim">#{problem.leetcodeNumber}</span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <DifficultyBadge difficulty={problem.difficulty} />
            <PatternTagList patterns={problem.patterns} />
          </div>
        </div>

        <StarPicker mode="display" size="md" value={problem.confidence} className="justify-self-start" />

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
            {/* On a phone the Review button already says "due"; the words
                stay for screen readers. */}
            <span className={canReview && !reviewing ? "max-sm:sr-only" : undefined}>
              {getReviewStatusText()}
            </span>
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

        {/* The trailing `!` makes these win over the ghost variant's own text
            colours; plain utilities would depend on Tailwind's emit order. */}
        <div className="-mr-1.5 flex shrink-0 items-center justify-end gap-0.5 md:mr-0">
          {onToggleExclude && (
            <button
              type="button"
              onClick={handleToggleExclude}
              title={isExcluded ? "Include in reviews" : "Exclude from reviews"}
              aria-label={isExcluded ? "Include in reviews" : "Exclude from review"}
              className={`${iconButtonClass("sm")} ${isExcluded ? "text-pb-warning! hover:text-pb-warning!" : ""}`}
            >
              <Icon name="exclude" className="h-[15px] w-[15px]" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            title="Delete problem"
            aria-label="Delete problem"
            className={`${iconButtonClass("sm")} hover:text-pb-error!`}
          >
            <Icon name="trash" className="h-[15px] w-[15px]" />
          </button>
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
