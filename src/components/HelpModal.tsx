import { useEffect } from "react";
import { INTERVALS } from "@patternbank/core";
import { EXTRA_PATTERNS } from "../utils/constants";
import StarPicker from "./StarPicker";
import Icon from "./Icon";
import { iconButtonClass } from "../utils/buttonStyles";
import type { Confidence } from "../types";

// The confidence scale's own hues, so each row matches its stars elsewhere.
const CONF_TEXT: Record<Confidence, string> = {
  1: "text-pb-conf-1",
  2: "text-pb-conf-2",
  3: "text-pb-conf-3",
  4: "text-pb-conf-4",
  5: "text-pb-conf-5",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="help-modal-title" className="max-h-[90vh] w-full max-w-[360px] overflow-y-auto rounded-xl border border-pb-border bg-pb-surface">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pb-border px-6 py-4">
          <h2 id="help-modal-title" className="text-base font-semibold text-pb-text">Help</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className={iconButtonClass("sm")}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Review Schedule */}
          <div>
            <h3 className="mb-1 text-[13px] font-semibold text-pb-text-muted">
              Review schedule
            </h3>
            <p className="mb-3 text-[13px] leading-relaxed text-pb-text-muted">
              Higher confidence means longer intervals. Repeated 5-star reviews graduate to longer intervals, up to one year.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-pb-text-dim">Confidence</span>
                <span className="text-xs font-medium text-pb-text-dim">Next review in...</span>
              </div>
              {([1, 2, 3, 4, 5] as Confidence[]).map((stars) => {
                const days = INTERVALS[stars];
                return (
                  <div key={stars} className="flex items-center justify-between">
                    <StarPicker mode="display" size="sm" value={stars} />
                    <span className={`text-[13px] tabular-nums ${CONF_TEXT[stars]}`}>
                      <span className="inline-block w-[18px] text-right">{days}</span> day{days !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* How Reviews Are Prioritized */}
          <div className="border-t border-pb-border pt-5">
            <h3 className="mb-1 text-[13px] font-semibold text-pb-text-muted">
              How reviews are prioritized
            </h3>
            <p className="text-[13px] leading-relaxed text-pb-text-muted">
              Reviews are ordered by confidence (lowest first), then by how overdue they are.
              A daily random tiebreaker ensures variety.
            </p>
          </div>

          {/* How Scheduling Works */}
          <div className="border-t border-pb-border pt-5">
            <h3 className="mb-1 text-[13px] font-semibold text-pb-text-muted">
              How scheduling works
            </h3>
            <p className="text-[13px] leading-relaxed text-pb-text-muted">
              Imported lists are spread out at your daily goal rate, so day one
              isn&apos;t 150 reviews. Problems appear once their scheduled date
              arrives, and the goal caps what&apos;s shown each day. Raised your
              goal? Reschedule upcoming problems from Settings. &ldquo;Set all
              problems due today&rdquo; (Danger zone) makes everything due at
              once.
            </p>
          </div>

          {/* Tips */}
          <div className="border-t border-pb-border pt-5">
            <h3 className="mb-2 text-[13px] font-semibold text-pb-text-muted">
              Tips
            </h3>
            <ul className="m-0 flex list-inside list-disc flex-col gap-2 pl-0 text-[13px] text-pb-text-muted">
              <li>
                Tap{" "}
                <Icon name="exclude" className="inline-block h-3.5 w-3.5 align-[-2px]" />
                <span className="sr-only">the exclude icon</span>{" "}
                on any problem to exclude it from reviews
              </li>
              <li>Due problems can also be reviewed from All Problems</li>
              <li>Enable {EXTRA_PATTERNS.length} additional patterns in Settings</li>
            </ul>
          </div>

          {/* Feedback */}
          <div className="border-t border-pb-border pt-5">
            <p className="text-[13px] text-pb-text-muted">
              Found a bug or have feedback?{" "}
              <a
                href="mailto:patternbank.app@gmail.com"
                className="font-medium text-pb-accent no-underline hover:underline"
              >
                patternbank.app@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
