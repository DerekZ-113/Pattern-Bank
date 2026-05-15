import DifficultyBadge from "./DifficultyBadge";
import type { DoneTodayFeedItem } from "../utils/todayView";

interface Props {
  items: DoneTodayFeedItem[];
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

export default function TodayDoneFeed({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface">
      {items.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 border-t border-pb-border px-4 py-3 first:border-t-0 hover:bg-pb-surface-2 max-sm:grid-cols-[26px_minmax(0,1fr)]"
        >
          <span
            aria-hidden="true"
            className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-pb-success/15 text-xs font-bold text-pb-success"
          >
            ✓
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {item.leetcodeNumber && (
                <span className="font-mono text-[13px] text-pb-text-dim">
                  #{item.leetcodeNumber}
                </span>
              )}
              <span className="truncate text-sm font-medium text-pb-text">{item.title}</span>
              <DifficultyBadge difficulty={item.difficulty} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-pb-text-muted">
              <CompactStars confidence={item.confidence} />
              <span>rated</span>
            </div>
          </div>
          <time
            dateTime={item.timestamp}
            className="font-mono text-xs tabular-nums text-pb-text-dim max-sm:col-start-2 max-sm:text-left"
          >
            {formatReviewTime(item.timestamp)}
          </time>
        </div>
      ))}
    </div>
  );
}
