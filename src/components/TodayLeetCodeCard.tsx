import { useState } from "react";
import DifficultyBadge from "./DifficultyBadge";
import PatternTag from "./PatternTag";
import type { Confidence, PendingLeetCodeImport, TodayLeetCodeItem } from "../types";

interface Props {
  item: TodayLeetCodeItem;
  onConfirm: (item: PendingLeetCodeImport, confidence: Confidence) => void;
  onIgnore: (item: PendingLeetCodeImport) => void;
  onRateKnown?: (item: TodayLeetCodeItem, confidence: Confidence) => void | Promise<void>;
}

const STAR_VALUES: Confidence[] = [1, 2, 3, 4, 5];

function EmptyConfidenceStars({ title }: { title: string }) {
  return (
    <div
      role="img"
      aria-label={`No confidence recorded for ${title}`}
      className="flex items-center gap-1.5 self-start sm:self-auto"
    >
      {STAR_VALUES.map((star) => (
        <span
          key={star}
          aria-hidden="true"
          className="inline-flex h-7 w-7 items-center justify-center text-[19px] leading-none text-pb-text-dim"
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function TodayLeetCodeCard({ item, onConfirm, onIgnore, onRateKnown }: Props) {
  const isPending = item.kind === "pending_import";
  const [pendingKnownRating, setPendingKnownRating] = useState(false);
  const [selectedKnownConfidence, setSelectedKnownConfidence] = useState<Confidence | null>(null);
  const [previewConfidence, setPreviewConfidence] = useState<Confidence | null>(null);
  const [knownRatingState, setKnownRatingState] = useState<"idle" | "logged" | "updated">("idle");
  const persistedKnownConfidence = !isPending ? item.reviewedTodayConfidence ?? null : null;
  const knownConfidence = !isPending ? selectedKnownConfidence ?? persistedKnownConfidence ?? item.confidence : null;
  const displayedKnownConfidence = previewConfidence ?? knownConfidence;
  const displayedPendingConfidence = previewConfidence;
  const activeKnownTarget = !isPending ? previewConfidence ?? selectedKnownConfidence ?? persistedKnownConfidence ?? item.confidence : null;
  const activePendingTarget = isPending ? previewConfidence : null;

  const handleRateKnown = async (confidence: Confidence) => {
    if (isPending || !item.matchedProblemId || !onRateKnown || pendingKnownRating) return;
    const latestRecordedConfidence = selectedKnownConfidence ?? persistedKnownConfidence;
    const hasLoggedConfidence = knownRatingState !== "idle" || persistedKnownConfidence !== null;

    const nextState = hasLoggedConfidence && latestRecordedConfidence !== confidence ? "updated" : "logged";
    setSelectedKnownConfidence(confidence);
    setKnownRatingState(nextState);
    setPendingKnownRating(true);
    try {
      await onRateKnown(item, confidence);
    } finally {
      setPendingKnownRating(false);
    }
  };

  return (
    <article className="relative overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface px-[18px] py-4 transition-colors hover:border-pb-border-strong hover:bg-pb-surface-2">
      <span aria-hidden="true" className="absolute left-0 right-0 top-0 h-0.5 bg-pb-accent" />

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
        <div className="mt-3.5 flex flex-col gap-3 border-t border-dashed border-pb-border pt-3.5 sm:flex-row sm:items-center sm:justify-between">
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
            className="flex items-center gap-1.5 self-start sm:self-auto"
            role="group"
            aria-label={`Import ${item.title} with confidence`}
            onMouseLeave={() => setPreviewConfidence(null)}
          >
            {STAR_VALUES.map((star) => {
              const isFilled = displayedPendingConfidence !== null && star <= displayedPendingConfidence;
              const isActive = activePendingTarget === star;
              return (
                <button
                  key={star}
                  type="button"
                  aria-label={`Import ${item.title} with ${star}-star confidence`}
                  onMouseEnter={() => setPreviewConfidence(star)}
                  onFocus={() => setPreviewConfidence(star)}
                  onBlur={() => setPreviewConfidence(null)}
                  onClick={() => onConfirm(item, star)}
                  className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border p-0 text-[19px] leading-none transition-colors hover:text-pb-star focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent ${
                    isFilled ? "text-pb-star" : "text-pb-text-dim"
                  } ${
                    isActive
                      ? "border-pb-star/60 bg-pb-star/10"
                      : "border-transparent hover:border-pb-star/40 hover:bg-pb-star/5"
                  }`}
                >
                  <span aria-hidden="true" className="block leading-none">
                    ★
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isPending && (
        <div className="mt-3.5 flex flex-col gap-3 border-t border-dashed border-pb-border pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-pb-text-muted">
            {item.confidence
              ? knownRatingState === "updated"
                ? "Confidence updated"
                : knownRatingState === "logged" || persistedKnownConfidence !== null
                  ? "New confidence logged"
                  : "Rate confidence"
              : "No confidence recorded"}
          </span>
          {item.confidence && item.matchedProblemId ? (
            <div
              className="flex items-center gap-1.5 self-start sm:self-auto"
              role="group"
              aria-label={`Rate ${item.title} confidence`}
              onMouseLeave={() => setPreviewConfidence(null)}
            >
              {STAR_VALUES.map((star) => {
                const isFilled = displayedKnownConfidence !== null && star <= displayedKnownConfidence;
                const isActive = activeKnownTarget === star;
                return (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${item.title} with ${star}-star confidence`}
                    aria-pressed={knownConfidence !== null && star <= knownConfidence}
                    disabled={pendingKnownRating || !onRateKnown}
                    onMouseEnter={() => setPreviewConfidence(star)}
                    onFocus={() => setPreviewConfidence(star)}
                    onBlur={() => setPreviewConfidence(null)}
                    onClick={() => handleRateKnown(star)}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded border p-0 text-[19px] leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent disabled:cursor-not-allowed disabled:opacity-70 ${
                      isFilled ? "text-pb-star" : "text-pb-text-dim hover:text-pb-star"
                    } ${
                      isActive
                        ? "border-pb-star/60 bg-pb-star/10"
                        : "border-transparent hover:border-pb-star/40 hover:bg-pb-star/5"
                    }`}
                  >
                    <span aria-hidden="true" className="block leading-none">
                      ★
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyConfidenceStars title={item.title} />
          )}
        </div>
      )}
    </article>
  );
}
