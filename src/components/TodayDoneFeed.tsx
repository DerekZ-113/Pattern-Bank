import { useState } from "react";
import DifficultyBadge from "./DifficultyBadge";
import StarPicker from "./StarPicker";
import type { Confidence } from "../types";
import type { TodayActivityFeedItem } from "@patternbank/core";

interface Props {
  items: TodayActivityFeedItem[];
  onRateLeetCodeReview?: (submissionDbId: string, problemId: string, confidence: Confidence) => void | Promise<void>;
  onOpenProblemDetails?: (problemId: string) => void;
}

function formatReviewTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function CompactStars({ confidence }: { confidence: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-pb-text-muted" aria-label={`${confidence} out of 5 stars`}>
      <span className="font-semibold text-pb-star">{confidence}★</span>
    </span>
  );
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
    <div className="overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface">
      {items.map((item) => {
        const timestamp = item.type === "pb_review" ? item.timestamp : item.submittedAt;
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
          <div
            key={item.id}
            className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 border-t border-pb-border px-4 py-3 first:border-t-0 hover:bg-pb-surface-2 max-sm:grid-cols-[26px_minmax(0,1fr)]"
          >
            <span
              aria-hidden="true"
              className={`flex h-[22px] w-[22px] items-center justify-center rounded-md text-xs font-bold ${
                isLeetCode
                  ? "bg-pb-accent/15 text-pb-accent"
                  : "bg-pb-success/15 text-pb-success"
              }`}
            >
              {isLeetCode ? "↗" : "✓"}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {onOpenProblemDetails ? (
                  <button
                    type="button"
                    onClick={() => onOpenProblemDetails(item.problemId)}
                    className="cursor-pointer truncate border-none bg-transparent p-0 text-left text-sm font-medium text-pb-text transition-colors duration-150 hover:text-pb-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
                  >
                    {item.title}
                  </button>
                ) : (
                  <span className="truncate text-sm font-medium text-pb-text">{item.title}</span>
                )}
                {item.leetcodeNumber && (
                  <span className="font-mono text-[13px] text-pb-text-dim">
                    #{item.leetcodeNumber}
                  </span>
                )}
                <DifficultyBadge difficulty={item.difficulty} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-pb-text-muted">
                {item.type === "pb_review" ? (
                  <>
                    <CompactStars confidence={item.confidence} />
                    <span>rated</span>
                  </>
                ) : (
                  <>
                    <span>{lcStatusText}</span>
                    {item.canRate && onRateLeetCodeReview && (
                      <>
                        {ratingRowId === item.id ? (
                          <StarPicker
                            mode="commit"
                            size="sm"
                            value={null}
                            disabled={otherRowPending}
                            label={`Rate ${item.title} confidence`}
                            getStarLabel={(star) => `Rate ${item.title} with ${star}-star confidence`}
                            onCommit={(star) => handleRate(item, star)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRatingRowId(item.id)}
                            className="cursor-pointer rounded border border-pb-accent/30 bg-pb-accent-subtle px-2 py-0.5 text-xs font-semibold text-pb-accent transition-colors hover:bg-pb-accent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
                            aria-label={`Rate ${item.title}`}
                          >
                            Rate →
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <time
              dateTime={timestamp}
              className="font-mono text-xs tabular-nums text-pb-text-dim max-sm:col-start-2 max-sm:text-left"
            >
              {formatReviewTime(timestamp)}
            </time>
          </div>
        );
      })}
    </div>
  );
}
