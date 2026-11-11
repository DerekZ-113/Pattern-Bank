import { useState } from "react";
import { getReviewIntervalDays } from "@patternbank/core";
import Icon from "./Icon";
import StarPicker from "./StarPicker";
import { buttonClass } from "../utils/buttonStyles";
import { formatNextReview } from "../utils/format";
import type { Confidence, Problem } from "../types";

interface Props {
  problem: Problem;
  onDone: (confidence: Confidence) => void;
  onBack: () => void;
}

/**
 * The rate-your-confidence panel shared by Today's review card and the
 * All Problems card, so a review looks and commits the same way everywhere.
 *
 * Beside the stars it says what the rating will do — "Next review in 5 days"
 * — computed by the same core function that schedules the review, so the
 * schedule is something you choose rather than something that happens to you.
 */
export default function ReviewRatePanel({ problem, onDone, onBack }: Props) {
  const [confidence, setConfidence] = useState<Confidence>(problem.confidence);

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 rounded-lg bg-pb-bg px-4 py-3.5">
      <div>
        <div className="mb-1.5 text-xs text-pb-text-muted">Rate your confidence:</div>
        <StarPicker
          mode="select"
          size="xl"
          value={confidence}
          onChange={setConfidence}
          label={`Rate ${problem.title} confidence`}
          describe={(value) => formatNextReview(getReviewIntervalDays(problem, value))}
          autoFocus
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
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
        <button type="button" onClick={onBack} className={buttonClass("ghost")}>
          Back
        </button>
        <button type="button" onClick={() => onDone(confidence)} className={buttonClass("primary")}>
          Done
        </button>
      </div>
    </div>
  );
}
