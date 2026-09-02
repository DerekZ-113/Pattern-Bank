import { useState } from "react";
import StarPicker from "./StarPicker";
import type { Confidence, Problem } from "../types";

interface Props {
  problem: Problem;
  onDone: (confidence: Confidence) => void;
  onBack: () => void;
}

/**
 * The rate-your-confidence panel shared by Today's review card and the
 * All Problems card, so a review looks and commits the same way everywhere.
 */
export default function ReviewRatePanel({ problem, onDone, onBack }: Props) {
  const [confidence, setConfidence] = useState<Confidence>(problem.confidence);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-pb-bg px-4 py-3.5">
      <div>
        <div className="mb-1.5 text-xs text-pb-text-muted">Rate your confidence:</div>
        <StarPicker
          mode="select"
          size="xl"
          value={confidence}
          onChange={setConfidence}
          label={`Rate ${problem.title} confidence`}
        />
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
          type="button"
          onClick={onBack}
          className="h-9 cursor-pointer rounded-lg border border-pb-border bg-transparent px-3 text-[13px] font-medium text-pb-text-muted transition-colors hover:border-pb-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onDone(confidence)}
          className="h-9 cursor-pointer rounded-lg border border-pb-accent/35 bg-pb-accent-subtle px-5 text-[13px] font-semibold text-pb-accent transition-colors hover:bg-pb-accent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
        >
          Done
        </button>
      </div>
    </div>
  );
}
