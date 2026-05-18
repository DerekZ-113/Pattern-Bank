import DifficultyBadge from "./DifficultyBadge";
import PatternTag from "./PatternTag";
import type { Confidence, PendingLeetCodeImport, TodayLeetCodeItem } from "../types";

interface Props {
  item: TodayLeetCodeItem;
  onConfirm: (item: PendingLeetCodeImport, confidence: Confidence) => void;
  onIgnore: (item: PendingLeetCodeImport) => void;
}

const STAR_VALUES: Confidence[] = [1, 2, 3, 4, 5];

function formatSolvedTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TodayLeetCodeCard({ item, onConfirm, onIgnore }: Props) {
  const isPending = item.kind === "pending_import";

  return (
    <article className="relative overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface px-4 py-4 transition-colors hover:border-pb-border-strong hover:bg-pb-surface-2">
      <span aria-hidden="true" className="absolute left-0 right-0 top-0 h-[3px] bg-pb-accent" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex min-w-0 flex-wrap items-baseline gap-2">
            <h3 className="text-[15px] font-semibold leading-tight text-pb-text">{item.title}</h3>
            {item.leetcodeNumber && (
              <span className="font-mono text-[13px] font-semibold leading-tight text-pb-text-dim">
                #{item.leetcodeNumber}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={item.difficulty ?? "Medium"} />
            {item.suggestedPatterns.map((pattern) => (
              <PatternTag key={pattern} name={pattern} />
            ))}
          </div>
          {!isPending && (
            <div className="mt-3 text-xs text-pb-text-muted">
              Solved {formatSolvedTime(item.submittedAt)}
            </div>
          )}
        </div>
        {isPending && (
          <button
            type="button"
            aria-label={`Ignore ${item.title}`}
            onClick={() => onIgnore(item)}
            className="-mr-2 -mt-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent text-xl leading-none text-pb-text-dim transition-colors hover:border-pb-border hover:text-pb-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
          >
            ×
          </button>
        )}
      </div>

      {isPending && (
        <div className="mt-4 flex flex-col gap-3 border-t border-dashed border-pb-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-pb-text-muted">
            Rate confidence to add
            <span className="mx-1 text-pb-text-dim">—</span>
            <span className="inline-flex items-center gap-1">
              <span className="rounded border border-pb-border px-1.5 py-0.5 font-mono text-xs text-pb-text-muted">1</span>
              shaky
            </span>
            <span className="mx-1 text-pb-text-dim">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="rounded border border-pb-border px-1.5 py-0.5 font-mono text-xs text-pb-text-muted">5</span>
              solid
            </span>
          </span>
          <div
            className="flex items-center gap-3 self-start sm:self-auto"
            role="group"
            aria-label={`Import ${item.title} with confidence`}
          >
            {STAR_VALUES.map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`Import ${item.title} with ${star}-star confidence`}
                onClick={() => onConfirm(item, star)}
                className="cursor-pointer rounded-md px-0.5 text-[22px] leading-none text-pb-text-dim transition-colors hover:text-pb-star focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
              >
                ★
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
