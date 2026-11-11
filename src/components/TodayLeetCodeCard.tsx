import { useState } from "react";
import DifficultyBadge from "./DifficultyBadge";
import Icon from "./Icon";
import PatternTagList from "./PatternTagList";
import StarPicker from "./StarPicker";
import { iconButtonClass } from "../utils/buttonStyles";
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

  const ratingRowClass =
    "mt-3.5 flex flex-col gap-3 border-t border-pb-border-light pt-3.5 sm:flex-row sm:items-center sm:justify-between";

  return (
    <article className="rounded-xl border border-pb-border-light bg-pb-surface p-4 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="m-0 text-[15px] font-semibold leading-snug text-pb-text">
              {detailsProblemId ? (
                <button
                  type="button"
                  onClick={() => onOpenProblemDetails!(detailsProblemId)}
                  className="cursor-pointer border-none bg-transparent p-0 text-left text-[15px] font-semibold leading-snug text-pb-text transition-colors duration-150 hover:text-pb-accent"
                >
                  {item.title}
                </button>
              ) : (
                item.title
              )}
            </h3>
            {item.leetcodeNumber && (
              <span className="font-mono text-[13px] leading-tight text-pb-text-dim">
                #{item.leetcodeNumber}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <DifficultyBadge difficulty={item.difficulty ?? "Medium"} />
            <PatternTagList patterns={item.suggestedPatterns} />
          </div>
        </div>
        {isPending && (
          <button
            type="button"
            aria-label={`Ignore ${item.title}`}
            onClick={() => onIgnore(item)}
            className={`${iconButtonClass("sm")} -mr-1.5 -mt-1`}
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      {isPending && (
        <div className={ratingRowClass}>
          <span className="text-xs text-pb-text-muted">
            <span className="font-medium">Rate confidence to add</span>
            <span className="text-pb-text-dim"> (1 is shaky, 5 is solid)</span>
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
        <div className={ratingRowClass}>
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
