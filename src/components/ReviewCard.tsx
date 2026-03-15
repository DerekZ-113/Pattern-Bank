import { useState } from "react";
import StarRating from "./StarRating";
import DifficultyBadge from "./DifficultyBadge";
import PatternTag from "./PatternTag";
import { formatRelativeDate } from "../utils/dateHelpers";
import type { Problem, Confidence } from "../types";

interface Props {
  problem: Problem;
  hidePatterns?: boolean;
  onReview: (id: string, confidence: Confidence) => void;
  onDismiss: (id: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
}

export default function ReviewCard({ problem, hidePatterns, onReview, onDismiss, onUpdateNotes }: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [newConfidence, setNewConfidence] = useState<Confidence>(problem.confidence);
  const [notesRevealed, setNotesRevealed] = useState(false);
  const [patternsRevealed, setPatternsRevealed] = useState(false);
  const [localNotes, setLocalNotes] = useState(problem.notes || "");

  const handleStartReview = () => {
    setReviewing(true);
  };

  const handleDone = () => {
    onReview(problem.id, newConfidence);
    setReviewing(false);
    setNotesRevealed(false);
  };

  const lastReviewedText = problem.lastReviewed
    ? `Last reviewed: ${formatRelativeDate(problem.lastReviewed)}`
    : "Never reviewed";

  return (
    <div className="overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface">
      {/* Yellow accent bar */}
      <div className="h-0.5 bg-pb-star" />

      <div className="px-5 py-4">
        {/* Title row */}
        <div className="mb-2 flex flex-wrap items-start justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-pb-text">
              {problem.title}
            </span>
            {problem.leetcodeNumber && (
              <span className="text-xs text-pb-text-muted">
                #{problem.leetcodeNumber}
              </span>
            )}
          </div>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>

        {/* Pattern tags */}
        <div className="mb-2">
          {hidePatterns && !patternsRevealed ? (
            <button
              onClick={() => setPatternsRevealed(true)}
              className="w-full cursor-pointer rounded-md border border-dashed border-pb-border bg-transparent px-3 py-1.5 text-left text-[13px] text-pb-text-dim transition-colors duration-150 hover:border-pb-text-dim hover:text-pb-text-muted"
            >
              Reveal patterns
            </button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {problem.patterns.map((p) => (
                <PatternTag key={p} name={p} />
              ))}
            </div>
          )}
        </div>

        {/* Confidence and last reviewed */}
        <div className="mb-3 flex items-center justify-between">
          <StarRating value={problem.confidence} size={16} />
          <span className="text-xs text-pb-text-muted">{lastReviewedText}</span>
        </div>

        {/* Notes — click to reveal */}
        <div className="mb-3">
          {notesRevealed ? (
            <div className="relative">
              <textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={() => onUpdateNotes && onUpdateNotes(problem.id, localNotes)}
                placeholder="Add notes..."
                className="max-h-[120px] min-h-[60px] w-full resize-y rounded-md border border-pb-border bg-pb-bg px-3 py-2 pr-12 text-[13px] font-[inherit] leading-relaxed text-pb-text-muted outline-none transition-colors duration-150 focus:border-pb-accent"
              />
              <button
                onClick={() => setNotesRevealed(false)}
                className="absolute right-2 top-2 cursor-pointer rounded border-none bg-transparent text-xs text-pb-text-dim transition-colors duration-150 hover:text-pb-text-muted"
              >
                Hide
              </button>
            </div>
          ) : (
            <button
              onClick={() => setNotesRevealed(true)}
              className="w-full cursor-pointer rounded-md border border-dashed border-pb-border bg-transparent px-3 py-2 text-left text-[13px] text-pb-text-dim transition-colors duration-150 hover:border-pb-text-dim hover:text-pb-text-muted"
            >
              {problem.notes ? "Show notes" : "Add notes"}
            </button>
          )}
        </div>

        {/* Review flow or action buttons */}
        {reviewing ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-pb-bg px-4 py-3.5">
            <div>
              <div className="mb-1.5 text-xs text-pb-text-muted">
                Rate your confidence:
              </div>
              <StarRating value={newConfidence} onChange={(v) => setNewConfidence(v as Confidence)} size={22} />
            </div>
            <div className="flex items-center gap-2">
              {problem.url && (
                <a
                  href={problem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-pb-border bg-transparent px-3 py-2 text-[13px] font-medium text-pb-text-muted no-underline transition-colors duration-150 hover:border-pb-text-muted hover:text-pb-text"
                >
                  Open ↗
                </a>
              )}
              <button
                onClick={() => { setReviewing(false); setNotesRevealed(false); }}
                className="cursor-pointer rounded-lg border border-pb-border bg-transparent px-3 py-2 text-[13px] font-medium text-pb-text-muted transition-colors duration-150 hover:border-pb-text-muted"
              >
                Back
              </button>
              <button
                onClick={handleDone}
                className="cursor-pointer rounded-lg border-none bg-pb-success px-5 py-2 text-center text-[13px] font-semibold text-white hover:opacity-85"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {problem.url && (
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[88px] cursor-pointer rounded-lg border border-pb-border bg-transparent py-2 text-center text-[13px] font-medium text-pb-text-muted no-underline transition-colors duration-150 hover:border-pb-text-muted hover:text-pb-text"
              >
                Open ↗
              </a>
            )}
            <button
              onClick={handleStartReview}
              className="flex-1 cursor-pointer rounded-lg border-none bg-pb-accent-subtle py-2 text-[13px] font-semibold text-pb-accent transition-all duration-150 hover:bg-pb-accent hover:text-white"
            >
              Review Now
            </button>
            <button
              onClick={() => onDismiss(problem.id)}
              className="w-[88px] cursor-pointer rounded-lg border border-pb-border bg-transparent py-2 text-center text-[13px] font-medium text-pb-text-muted transition-colors duration-150 hover:border-pb-text-muted"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
