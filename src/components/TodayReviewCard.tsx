import { useState } from "react";
import DifficultyBadge from "./DifficultyBadge";
import Icon from "./Icon";
import PatternTagList from "./PatternTagList";
import ReviewRatePanel from "./ReviewRatePanel";
import StarPicker from "./StarPicker";
import { formatRelativeDate } from "@patternbank/core";
import { buttonClass } from "../utils/buttonStyles";
import type { Confidence, Problem } from "../types";

interface Props {
  problem: Problem;
  hidePatterns?: boolean;
  solvedOnLeetCodeToday?: boolean;
  onReview: (id: string, confidence: Confidence) => void;
  onDismiss: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onOpenDetails?: (problem: Problem) => void;
}

export default function TodayReviewCard({
  problem,
  hidePatterns,
  solvedOnLeetCodeToday = false,
  onReview,
  onDismiss,
  onUpdateNotes,
  onOpenDetails,
}: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [notesRevealed, setNotesRevealed] = useState(false);
  const [patternsRevealed, setPatternsRevealed] = useState(false);
  const [localNotes, setLocalNotes] = useState(problem.notes || "");

  const lastReviewedText = problem.lastReviewed
    ? `Last reviewed ${formatRelativeDate(problem.lastReviewed).toLowerCase()}`
    : "Never reviewed";

  const handleDone = (confidence: Confidence) => {
    onReview(problem.id, confidence);
    setReviewing(false);
    setNotesRevealed(false);
  };

  return (
    <article className="rounded-xl border border-pb-border-light bg-pb-surface p-4 sm:px-5">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3 className="m-0 text-[15px] font-semibold leading-snug text-pb-text">
          {onOpenDetails ? (
            <button
              type="button"
              onClick={() => onOpenDetails(problem)}
              className="cursor-pointer border-none bg-transparent p-0 text-left text-[15px] font-semibold leading-snug text-pb-text transition-colors duration-150 hover:text-pb-accent"
            >
              {problem.title}
            </button>
          ) : (
            problem.title
          )}
        </h3>
        {problem.leetcodeNumber && (
          <span className="font-mono text-[13px] leading-tight text-pb-text-dim">
            #{problem.leetcodeNumber}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <DifficultyBadge difficulty={problem.difficulty} />
        {solvedOnLeetCodeToday && (
          <span className="text-xs font-semibold text-pb-accent">Solved on LC today</span>
        )}
        {hidePatterns && !patternsRevealed ? (
          <button
            type="button"
            onClick={() => setPatternsRevealed(true)}
            className="cursor-pointer rounded-md border border-dashed border-pb-border-strong bg-transparent px-2 py-1 text-xs font-medium leading-none text-pb-text-dim transition-colors hover:text-pb-text-muted"
          >
            Reveal patterns
          </button>
        ) : (
          <PatternTagList patterns={problem.patterns} />
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-2.5">
          <StarPicker mode="display" size="md" value={problem.confidence} />
          <span className="text-xs text-pb-text-dim">{lastReviewedText}</span>
        </div>
        {/* The notes toggle stays while rating: notes are what you check
            before deciding how well you knew it. */}
        {(!reviewing || !notesRevealed) && (
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
            {!notesRevealed && (
              <button type="button" onClick={() => setNotesRevealed(true)} className={buttonClass("ghost")}>
                <Icon name="note" className="h-3.5 w-3.5" />
                {problem.notes ? "Show notes" : "Add notes"}
              </button>
            )}
            {!reviewing && (
              <>
                <button type="button" onClick={() => onDismiss(problem.id)} className={buttonClass("ghost")}>
                  Dismiss
                </button>
                {problem.url && (
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("outline")}
                  >
                    Open
                    <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setReviewing(true)}
                  className={`${buttonClass("soft")} max-sm:flex-1`}
                >
                  Review Now
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {notesRevealed && (
        <div className="relative mt-3">
          <textarea
            value={localNotes}
            onChange={(event) => setLocalNotes(event.target.value)}
            onBlur={() => onUpdateNotes(problem.id, localNotes)}
            placeholder="Add notes..."
            className="max-h-[140px] min-h-[64px] w-full resize-y rounded-lg border border-pb-border bg-pb-bg px-3 py-2 pr-14 font-mono text-[13px] leading-relaxed text-pb-text outline-none transition-colors focus:border-pb-accent"
          />
          <button
            type="button"
            onClick={() => setNotesRevealed(false)}
            className="absolute right-2 top-2 cursor-pointer rounded border-none bg-transparent px-1 py-0.5 text-xs text-pb-text-dim transition-colors hover:text-pb-text-muted"
          >
            Hide
          </button>
        </div>
      )}

      {reviewing && (
        <div className="mt-3">
          <ReviewRatePanel
            problem={problem}
            onDone={handleDone}
            onBack={() => {
              setReviewing(false);
              setNotesRevealed(false);
            }}
          />
        </div>
      )}
    </article>
  );
}
