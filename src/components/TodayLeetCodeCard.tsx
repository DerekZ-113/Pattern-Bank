import { useState } from "react";
import DifficultyBadge from "./DifficultyBadge";
import PatternTagList from "./PatternTagList";
import StarPicker from "./StarPicker";
import type { Confidence, PendingLeetCodeImport, TodayLeetCodeItem } from "../types";

interface Props {
  item: TodayLeetCodeItem;
  onConfirm: (item: PendingLeetCodeImport, confidence: Confidence) => void | Promise<void>;
  onIgnore: (item: PendingLeetCodeImport) => void;
  onRateKnown?: (item: TodayLeetCodeItem, confidence: Confidence) => void | Promise<void>;
  onOpenProblemDetails?: (problemId: string) => void;
}

export default function TodayLeetCodeCard({ item, onConfirm, onIgnore, onRateKnown, onOpenProblemDetails }: Props) {
  const isPending = item.kind === "pending_import";
  // Pending imports have no library Problem yet — their titles stay static.
  const detailsProblemId = !isPending && item.matchedProblemId && onOpenProblemDetails
    ? item.matchedProblemId
    : null;
  const [selectedKnownConfidence, setSelectedKnownConfidence] = useState<Confidence | null>(null);
  const [knownRatingState, setKnownRatingState] = useState<"idle" | "logged" | "updated">("idle");
  const persistedKnownConfidence = !isPending ? item.reviewedTodayConfidence ?? null : null;
  const knownConfidence = !isPending ? selectedKnownConfidence ?? persistedKnownConfidence ?? item.confidence : null;

  const handleRateKnown = async (confidence: Confidence) => {
    if (isPending || !item.matchedProblemId || !onRateKnown) return;
    const latestRecordedConfidence = selectedKnownConfidence ?? persistedKnownConfidence;
    const hasLoggedConfidence = knownRatingState !== "idle" || persistedKnownConfidence !== null;

    const nextState = hasLoggedConfidence && latestRecordedConfidence !== confidence ? "updated" : "logged";
    setSelectedKnownConfidence(confidence);
    setKnownRatingState(nextState);
    await onRateKnown(item, confidence);
  };

  return (
    <article className="relative overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface px-[18px] py-4 transition-colors hover:border-pb-border-strong hover:bg-pb-surface-2">
      <span aria-hidden="true" className="absolute left-0 right-0 top-0 h-0.5 bg-pb-accent" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex min-w-0 flex-wrap items-baseline gap-2">
            <h3 className="text-[15px] font-semibold leading-tight text-pb-text">
              {detailsProblemId ? (
                <button
                  type="button"
                  onClick={() => onOpenProblemDetails!(detailsProblemId)}
                  className="cursor-pointer border-none bg-transparent p-0 text-left text-[15px] font-semibold leading-tight text-pb-text transition-colors duration-150 hover:text-pb-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
                >
                  {item.title}
                </button>
              ) : (
                item.title
              )}
            </h3>
            {item.leetcodeNumber && (
              <span className="font-mono text-[13px] font-semibold leading-tight text-pb-text-dim">
                #{item.leetcodeNumber}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={item.difficulty ?? "Medium"} />
            <PatternTagList patterns={item.suggestedPatterns} />
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
          <StarPicker
            mode="commit"
            size="lg"
            className="self-start sm:self-auto"
            label={`Import ${item.title} with confidence`}
            getStarLabel={(star) => `Import ${item.title} with ${star}-star confidence`}
            onCommit={(star) => onConfirm(item, star)}
          />
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
            <StarPicker
              mode="commit"
              size="lg"
              className="self-start sm:self-auto"
              value={knownConfidence}
              disabled={!onRateKnown}
              label={`Rate ${item.title} confidence`}
              getStarLabel={(star) => `Rate ${item.title} with ${star}-star confidence`}
              onCommit={handleRateKnown}
            />
          ) : (
            <StarPicker
              mode="display"
              size="lg"
              className="self-start sm:self-auto"
              value={null}
              label={`No confidence recorded for ${item.title}`}
            />
          )}
        </div>
      )}
    </article>
  );
}
