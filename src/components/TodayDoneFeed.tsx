import { useState } from "react";
import ActivityRow, { RatedStars } from "./ActivityRow";
import StarPicker from "./StarPicker";
import { buttonClass } from "../utils/buttonStyles";
import type { Confidence } from "../types";
import type { TodayActivityFeedItem } from "@patternbank/core";

interface Props {
  items: TodayActivityFeedItem[];
  onRateLeetCodeReview?: (submissionDbId: string, problemId: string, confidence: Confidence) => void | Promise<void>;
  onOpenProblemDetails?: (problemId: string) => void;
}

export default function TodayDoneFeed({ items, onRateLeetCodeReview, onOpenProblemDetails }: Props) {
  const [ratingRowId, setRatingRowId] = useState<string | null>(null);
  const [pendingRatingRowId, setPendingRatingRowId] = useState<string | null>(null);

  if (items.length === 0) return null;

  // One rating in flight at a time across the whole feed — the rate chain is
  // not concurrency-safe. Rejections propagate to StarPicker, which warns.
  const handleRate = async (
    item: Extract<TodayActivityFeedItem, { type: "leetcode_solve" }>,
    confidence: Confidence,
  ) => {
    if (pendingRatingRowId) return;
    setPendingRatingRowId(item.id);
    try {
      await onRateLeetCodeReview?.(item.submissionDbId, item.problemId, confidence);
    } finally {
      setPendingRatingRowId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-pb-border-light bg-pb-surface">
      {items.map((item) => {
        const isLeetCode = item.type === "leetcode_solve";
        const lcStatusText = isLeetCode
          ? item.canRate
            ? "solved on LC · review due"
            : item.status === "imported"
              ? "solved on LC · imported"
              : item.status === "rated"
                ? "solved on LC · rated"
                : "solved on LC"
          : null;
        const otherRowPending = pendingRatingRowId !== null && pendingRatingRowId !== item.id;

        return (
          <ActivityRow
            key={item.id}
            kind={isLeetCode ? "solve" : "review"}
            title={item.title}
            leetcodeNumber={item.leetcodeNumber}
            difficulty={item.difficulty}
            timestamp={item.type === "pb_review" ? item.timestamp : item.submittedAt}
            onOpen={onOpenProblemDetails ? () => onOpenProblemDetails(item.problemId) : undefined}
          >
            {item.type === "pb_review" ? (
              <>
                <RatedStars confidence={item.confidence} />
                <span>rated</span>
              </>
            ) : (
              <>
                <span>{lcStatusText}</span>
                {item.canRate && onRateLeetCodeReview && (
                  ratingRowId === item.id ? (
                    <StarPicker
                      mode="commit"
                      size="lg"
                      value={null}
                      autoFocus
                      disabled={otherRowPending}
                      label={`Rate ${item.title} confidence`}
                      getStarLabel={(star) => `Rate ${item.title} with ${star}-star confidence`}
                      onCommit={(star) => handleRate(item, star)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRatingRowId(item.id)}
                      className={buttonClass("soft", "sm")}
                      aria-label={`Rate ${item.title}`}
                    >
                      Rate
                    </button>
                  )
                )}
              </>
            )}
          </ActivityRow>
        );
      })}
    </div>
  );
}
