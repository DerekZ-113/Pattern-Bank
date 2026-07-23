import { useState } from "react";
import { formatDisplayDate, type EarlierLeetCodeActivityDay } from "@patternbank/core";
import { formatClockTime } from "../utils/format";
import DifficultyBadge from "./DifficultyBadge";
import TodaySectionHeader from "./TodaySectionHeader";

interface Props {
  days: EarlierLeetCodeActivityDay[];
  onOpenProblemDetails?: (problemId: string) => void;
}

const PANEL_ID = "today-earlier-leetcode-panel";

// Accepted LeetCode solves from recent days before today, collapsed by
// default. Read-only — no rating controls for past days.
export default function TodayEarlierLeetCodeActivity({ days, onOpenProblemDetails }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (days.length === 0) return null;

  const totalRows = days.reduce((sum, day) => sum + day.rows.length, 0);

  return (
    <section className="mt-8" aria-labelledby="today-earlier-leetcode-title">
      <TodaySectionHeader
        id="today-earlier-leetcode-title"
        title="Earlier LeetCode activity"
        count={totalRows}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={PANEL_ID}
          className="ml-auto flex cursor-pointer items-center gap-1 rounded-lg border border-pb-border bg-transparent px-2.5 py-1 text-xs font-medium text-pb-text-muted transition-colors duration-150 hover:border-pb-text-muted hover:text-pb-text"
        >
          {expanded ? "Hide" : "Show"}
          <span aria-hidden="true" className="text-[10px]">{expanded ? "▲" : "▼"}</span>
        </button>
      </TodaySectionHeader>

      {expanded && (
        <div id={PANEL_ID} className="flex flex-col gap-4">
          {days.map((day) => (
            <div key={day.date}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-pb-text-dim">
                {formatDisplayDate(day.date)}
              </div>
              <div className="overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface">
                {day.rows.map((row) => {
                  const clickable = !!row.problemId && !!onOpenProblemDetails;
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 border-t border-pb-border px-4 py-3 first:border-t-0 hover:bg-pb-surface-2 max-sm:grid-cols-[26px_minmax(0,1fr)]"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-pb-accent/15 text-xs font-bold text-pb-accent"
                      >
                        ↗
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {clickable ? (
                            <button
                              type="button"
                              onClick={() => onOpenProblemDetails!(row.problemId!)}
                              className="cursor-pointer truncate border-none bg-transparent p-0 text-left text-sm font-medium text-pb-text transition-colors duration-150 hover:text-pb-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
                            >
                              {row.title}
                            </button>
                          ) : (
                            <span className="truncate text-sm font-medium text-pb-text">{row.title}</span>
                          )}
                          {row.leetcodeNumber && (
                            <span className="font-mono text-[13px] text-pb-text-dim">
                              #{row.leetcodeNumber}
                            </span>
                          )}
                          {row.difficulty && <DifficultyBadge difficulty={row.difficulty} />}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-pb-text-muted">
                          {row.confidence !== null ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-xs text-pb-text-muted" aria-label={`${row.confidence} out of 5 stars`}>
                                <span className="font-semibold text-pb-star">{row.confidence}★</span>
                              </span>
                              <span>rated</span>
                            </>
                          ) : (
                            <span>solved on LC</span>
                          )}
                        </div>
                      </div>
                      <time
                        dateTime={row.submittedAt}
                        className="font-mono text-xs tabular-nums text-pb-text-dim max-sm:col-start-2 max-sm:text-left"
                      >
                        {formatClockTime(row.submittedAt)}
                      </time>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
