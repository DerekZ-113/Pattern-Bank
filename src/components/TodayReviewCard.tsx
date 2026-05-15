import { useState } from "react";
import DifficultyBadge from "./DifficultyBadge";
import PatternTag from "./PatternTag";
import StarRating from "./StarRating";
import { formatRelativeDate } from "../utils/dateHelpers";
import type { Confidence, Problem } from "../types";

interface Props {
  problem: Problem;
  hidePatterns?: boolean;
  solvedOnLeetCodeToday?: boolean;
  onReview: (id: string, confidence: Confidence) => void;
  onDismiss: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

export default function TodayReviewCard({
  problem,
  hidePatterns,
  solvedOnLeetCodeToday = false,
  onReview,
  onDismiss,
  onUpdateNotes,
}: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [newConfidence, setNewConfidence] = useState<Confidence>(problem.confidence);
  const [notesRevealed, setNotesRevealed] = useState(false);
  const [patternsRevealed, setPatternsRevealed] = useState(false);
  const [localNotes, setLocalNotes] = useState(problem.notes || "");

  const lastReviewedText = problem.lastReviewed
    ? `last reviewed ${formatRelativeDate(problem.lastReviewed).toLowerCase()}`
    : "Never reviewed";
  const actionGridClass = problem.url
    ? "mt-3 grid grid-cols-[auto_1fr_auto] gap-2 max-sm:grid-cols-1"
    : "mt-3 grid grid-cols-[1fr_auto] gap-2 max-sm:grid-cols-1";

  const handleStartReview = () => {
    setReviewing(true);
  };

  const handleDone = () => {
    onReview(problem.id, newConfidence);
    setReviewing(false);
    setNotesRevealed(false);
  };

  return (
    <article className="relative overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface px-4 py-4 transition-colors hover:border-pb-border-strong hover:bg-pb-surface-2">
      <span aria-hidden="true" className="absolute left-0 right-0 top-0 h-0.5 bg-pb-star/80" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-baseline gap-2">
            <h3 className="text-[15px] font-semibold leading-tight text-pb-text">
              {problem.title}
            </h3>
            {problem.leetcodeNumber && (
              <span className="font-mono text-[13px] text-pb-text-dim">
                #{problem.leetcodeNumber}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={problem.difficulty} />
            {solvedOnLeetCodeToday && (
              <span className="rounded-full border border-pb-accent/25 bg-pb-accent-subtle px-2.5 py-1 text-[11px] font-semibold text-pb-accent">
                Solved on LC today
              </span>
            )}
            {hidePatterns && !patternsRevealed ? (
              <button
                onClick={() => setPatternsRevealed(true)}
                className="cursor-pointer rounded-full border border-dashed border-pb-border px-2.5 py-1 text-[11px] font-medium text-pb-text-dim transition-colors hover:border-pb-text-dim hover:text-pb-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
              >
                Reveal patterns
              </button>
            ) : (
              problem.patterns.map((pattern) => (
                <PatternTag key={pattern} name={pattern} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-xs text-pb-text-muted">Confidence</span>
        <StarRating value={problem.confidence} size={16} />
        <span className="text-xs text-pb-text-dim">· {lastReviewedText}</span>
      </div>

      <div className="mt-3">
        {notesRevealed ? (
          <div className="relative">
            <textarea
              value={localNotes}
              onChange={(event) => setLocalNotes(event.target.value)}
              onBlur={() => onUpdateNotes(problem.id, localNotes)}
              placeholder="Add notes..."
              className="max-h-[140px] min-h-[64px] w-full resize-y rounded-lg border border-pb-border bg-pb-bg px-3 py-2 pr-12 text-[13px] leading-relaxed text-pb-text outline-none transition-colors focus:border-pb-accent"
            />
            <button
              onClick={() => setNotesRevealed(false)}
              className="absolute right-2 top-2 cursor-pointer rounded border-none bg-transparent px-1 py-0.5 text-xs text-pb-text-dim transition-colors hover:text-pb-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
            >
              Hide
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNotesRevealed(true)}
            className="w-full cursor-pointer rounded-lg border border-dashed border-pb-border bg-transparent px-3 py-2 text-left text-[13px] text-pb-text-dim transition-colors hover:border-pb-text-dim hover:text-pb-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
          >
            {problem.notes ? "Show notes" : "Add notes"}
          </button>
        )}
      </div>

      {reviewing ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-pb-bg px-4 py-3.5">
          <div>
            <div className="mb-1.5 text-xs text-pb-text-muted">Rate your confidence:</div>
            <StarRating value={newConfidence} onChange={(value) => setNewConfidence(value as Confidence)} size={22} />
          </div>
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
            {problem.url && (
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-pb-border bg-pb-surface-2 px-3 text-[13px] font-medium text-pb-text-muted no-underline transition-colors hover:border-pb-border-strong hover:text-pb-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
              >
                Open ↗
              </a>
            )}
            <button
              onClick={() => {
                setReviewing(false);
                setNotesRevealed(false);
              }}
              className="h-9 cursor-pointer rounded-lg border border-pb-border bg-transparent px-3 text-[13px] font-medium text-pb-text-muted transition-colors hover:border-pb-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
            >
              Back
            </button>
            <button
              onClick={handleDone}
              className="h-9 cursor-pointer rounded-lg border border-pb-accent/35 bg-pb-accent-subtle px-5 text-[13px] font-semibold text-pb-accent transition-colors hover:bg-pb-accent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className={actionGridClass}>
          {problem.url && (
            <a
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-pb-border bg-pb-surface-2 px-4 text-[13px] font-medium text-pb-text-muted no-underline transition-colors hover:border-pb-border-strong hover:text-pb-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
            >
              Open ↗
            </a>
          )}
          <button
            onClick={handleStartReview}
            className="h-9 cursor-pointer rounded-lg border border-pb-accent/35 bg-pb-accent-subtle px-4 text-[13px] font-semibold text-pb-accent transition-colors hover:bg-pb-accent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
          >
            Review Now
          </button>
          <button
            onClick={() => onDismiss(problem.id)}
            className="h-9 cursor-pointer rounded-lg border border-pb-border bg-transparent px-4 text-[13px] font-medium text-pb-text-muted transition-colors hover:border-pb-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
          >
            Dismiss
          </button>
        </div>
      )}
    </article>
  );
}
