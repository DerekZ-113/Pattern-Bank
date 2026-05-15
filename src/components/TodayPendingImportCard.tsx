import DifficultyBadge from "./DifficultyBadge";
import PatternTag from "./PatternTag";
import type { Confidence, PendingLeetCodeImport } from "../types";

interface Props {
  item: PendingLeetCodeImport;
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

export default function TodayPendingImportCard({ item, onConfirm, onIgnore }: Props) {
  return (
    <article className="relative overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface px-4 py-4 transition-colors hover:border-pb-border-strong hover:bg-pb-surface-2">
      <span aria-hidden="true" className="absolute left-0 right-0 top-0 h-0.5 bg-pb-accent" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-baseline gap-2">
            <h3 className="text-[15px] font-semibold leading-tight text-pb-text">{item.title}</h3>
            {item.leetcodeNumber && (
              <span className="font-mono text-[13px] text-pb-text-dim">#{item.leetcodeNumber}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={item.difficulty ?? "Medium"} />
            <span className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-pb-accent bg-pb-accent-subtle">
              LeetCode
            </span>
            {item.suggestedPatterns.map((pattern) => (
              <PatternTag key={pattern} name={pattern} />
            ))}
          </div>
          <div className="mt-2 text-xs text-pb-text-muted">
            Solved {formatSolvedTime(item.submittedAt)}
          </div>
        </div>
        <button
          type="button"
          aria-label={`Ignore ${item.title}`}
          onClick={() => onIgnore(item)}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-lg leading-none text-pb-text-dim transition-colors hover:border-pb-border-strong hover:text-pb-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
        >
          ×
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-pb-text-muted">Rate to add</span>
        <div className="flex items-center gap-1" role="group" aria-label={`Import ${item.title} with confidence`}>
          {STAR_VALUES.map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`Import ${item.title} with ${star}-star confidence`}
              onClick={() => onConfirm(item, star)}
              className="cursor-pointer rounded-md px-1 text-[22px] leading-none text-pb-star transition-transform hover:-translate-y-0.5 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
            >
              ★
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
