import { useState } from "react";
import ActivityRow, { RatedStars } from "./ActivityRow";
import StarPicker from "./StarPicker";
import { buttonClass } from "../utils/buttonStyles";
import type { Confidence } from "../types";
import type { ReactNode } from "react";
import type { TodayActivityFeedItem } from "@patternbank/core";

interface Props {
  items: TodayActivityFeedItem[];
  onRateLeetCodeReview?: (submissionDbId: string, problemId: string, confidence: Confidence) => void | Promise<void>;
  onOpenProblemDetails?: (problemId: string) => void;
  /** Reviews still left in today's goal, drawn as empty rows under the done ones. */
  emptySlots?: number;
  /** A line under the slots, for when the feed needs explaining. */
  note?: ReactNode;
}

// Empty slots vary a little in width so the stack reads as rows waiting to be
// written, not as a block. They never animate: a shimmer would say "loading".
const SLOT_WIDTHS = ["62%", "48%", "70%", "54%"];

export default function TodayDoneFeed({
  items,
  onRateLeetCodeReview,
  onOpenProblemDetails,
  emptySlots = 0,
  note,
}: Props) {
  const [ratingRowId, setRatingRowId] = useState<string | null>(null);
  const [pendingRatingRowId, setPendingRatingRowId] = useState<string | null>(null);

  if (items.length === 0 && emptySlots === 0 && !note) return null;

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
      {/* One row for each review still left in today's goal, marked with the
          goal meter's own tile. They are a picture of what is left, so a
          screen reader skips them (the count is in the section's heading),
          and a narrow screen, where this feed sits below the cards, does
          without them. */}
      {Array.from({ length: emptySlots }, (_, index) => (
        <div
          key={`slot-${index}`}
          data-goal-slot
          aria-hidden="true"
          className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-x-3 border-t border-pb-border-light px-4 py-3 first:border-t-0 max-lg:hidden"
        >
          <span className="mx-auto h-3.5 w-3.5 rounded-[4px] bg-pb-accent/30" />
          <span
            className="h-2 rounded-full bg-pb-surface-2"
            style={{ width: SLOT_WIDTHS[index % SLOT_WIDTHS.length] }}
          />
        </div>
      ))}
      {note && (
        <p className="m-0 border-t border-pb-border-light px-4 py-3 text-xs leading-relaxed text-pb-text-muted first:border-t-0 max-lg:hidden">
          {note}
        </p>
      )}
    </div>
  );
}
