import { useEffect } from "react";
import { INTERVALS } from "@patternbank/core";
import type { Confidence } from "../types";

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
      <div className="max-h-[90vh] w-full max-w-[360px] overflow-y-auto rounded-[14px] border border-pb-border bg-pb-surface">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pb-border px-6 py-4">
          <h2 className="text-base font-semibold text-pb-text">Help</h2>
          <button
            onClick={onClose}
            aria-label="Close help"
            className="cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-xl leading-none text-pb-text-muted hover:text-pb-text"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Review Schedule */}
          <div>
            <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Review Schedule
            </h3>
            <p className="mb-3 text-[13px] leading-relaxed text-pb-text-muted">
              Higher confidence means longer intervals. Repeated 5-star reviews graduate to longer intervals, up to one year.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-pb-text-dim">Confidence</span>
                <span className="text-xs font-medium uppercase tracking-wide text-pb-text-dim">Next review in...</span>
              </div>
              {([1, 2, 3, 4, 5] as Confidence[]).map((stars) => {
                const days = INTERVALS[stars];
                const color = stars <= 2 ? "text-pb-hard" : stars === 3 ? "text-pb-medium" : "text-pb-easy";
                return (
                  <div key={stars} className="flex items-center justify-between">
                    <span className="text-sm tracking-wide">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} style={{ color: i <= stars ? "var(--color-pb-star)" : "var(--color-pb-star-empty)" }}>★</span>
                      ))}
                    </span>
                    <span className={`font-mono text-[13px] tabular-nums ${color}`}>
                      <span className="inline-block w-[18px] text-right">{days}</span> day{days !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* How Reviews Are Prioritized */}
          <div className="border-t border-pb-border pt-5">
            <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              How Reviews Are Prioritized
            </h3>
            <p className="text-[13px] leading-relaxed text-pb-text-muted">
              Reviews are ordered by confidence (lowest first), then by how overdue they are.
              A daily random tiebreaker ensures variety.
            </p>
          </div>

          {/* How Scheduling Works */}
          <div className="border-t border-pb-border pt-5">
            <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              How Scheduling Works
            </h3>
            <p className="text-[13px] leading-relaxed text-pb-text-muted">
              Imported lists are spread out at your daily goal rate, so day one
              isn&apos;t 150 reviews. Problems appear once their scheduled date
              arrives, and the goal caps what&apos;s shown each day. Raised your
              goal? Reschedule upcoming problems from Settings. &ldquo;Set all
              problems due today&rdquo; (Danger Zone) makes everything due at
              once.
            </p>
          </div>

          {/* Tips */}
          <div className="border-t border-pb-border pt-5">
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Tips
            </h3>
            <ul className="m-0 flex list-inside list-disc flex-col gap-2 pl-0 text-[13px] text-pb-text-muted">
              <li>Tap ◎ on any problem to exclude it from reviews</li>
              <li>Enable 7 additional patterns in Settings</li>
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
