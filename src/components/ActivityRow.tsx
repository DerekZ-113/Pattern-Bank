import type { ReactNode } from "react";
import DifficultyBadge from "./DifficultyBadge";
import Icon from "./Icon";
import { formatClockTime } from "../utils/format";
import type { Difficulty } from "../types";

interface Props {
  /** "review" = rated in PatternBank; "solve" = an accepted LeetCode submission. */
  kind: "review" | "solve";
  title: string;
  leetcodeNumber?: number | null;
  difficulty?: Difficulty | null;
  timestamp: string;
  /** Makes the title a button that opens the problem's details. */
  onOpen?: () => void;
  /** The status line under the title. */
  children: ReactNode;
}

/** One line of the day's log — shared by Done today and Earlier LeetCode activity. */
export default function ActivityRow({ kind, title, leetcodeNumber, difficulty, timestamp, onOpen, children }: Props) {
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-3 border-t border-pb-border-light px-4 py-3 first:border-t-0">
      <span aria-hidden="true" className={`pt-px ${kind === "review" ? "text-pb-success" : "text-pb-accent"}`}>
        <Icon name={kind === "review" ? "check" : "external"} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="cursor-pointer truncate border-none bg-transparent p-0 text-left text-sm font-medium text-pb-text transition-colors duration-150 hover:text-pb-accent"
            >
              {title}
            </button>
          ) : (
            <span className="truncate text-sm font-medium text-pb-text">{title}</span>
          )}
          {leetcodeNumber && (
            <span className="font-mono text-[13px] text-pb-text-dim">#{leetcodeNumber}</span>
          )}
          {difficulty && <DifficultyBadge difficulty={difficulty} />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-pb-text-muted">
          {children}
        </div>
      </div>
      <time dateTime={timestamp} className="pt-0.5 text-xs tabular-nums text-pb-text-dim">
        {formatClockTime(timestamp)}
      </time>
    </div>
  );
}

/** "4★" — a past rating, compact enough for a status line. */
export function RatedStars({ confidence }: { confidence: number }) {
  return (
    <span role="img" aria-label={`${confidence} out of 5 stars`} className="font-semibold text-pb-star">
      {confidence}★
    </span>
  );
}
