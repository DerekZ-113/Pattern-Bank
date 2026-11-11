import { useState } from "react";
import { formatDisplayDate, type EarlierLeetCodeActivityDay } from "@patternbank/core";
import ActivityRow, { RatedStars } from "./ActivityRow";
import Icon from "./Icon";
import TodaySectionHeader from "./TodaySectionHeader";
import { buttonClass } from "../utils/buttonStyles";

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
    <section aria-labelledby="today-earlier-leetcode-title">
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
          className={`${buttonClass("ghost", "sm")} ml-auto self-center`}
        >
          {expanded ? "Hide" : "Show"}
          <Icon name="chevronDown" className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </TodaySectionHeader>

      {expanded && (
        <div id={PANEL_ID} className="flex flex-col gap-4">
          {days.map((day) => (
            <div key={day.date}>
              <div className="mb-2 text-xs font-medium text-pb-text-dim">
                {formatDisplayDate(day.date)}
              </div>
              <div className="overflow-hidden rounded-xl border border-pb-border-light bg-pb-surface">
                {day.rows.map((row) => (
                  <ActivityRow
                    key={row.id}
                    kind="solve"
                    title={row.title}
                    leetcodeNumber={row.leetcodeNumber}
                    difficulty={row.difficulty}
                    timestamp={row.submittedAt}
                    onOpen={
                      row.problemId && onOpenProblemDetails
                        ? () => onOpenProblemDetails(row.problemId!)
                        : undefined
                    }
                  >
                    {row.confidence !== null ? (
                      <>
                        <RatedStars confidence={row.confidence} />
                        <span>rated</span>
                      </>
                    ) : (
                      <span>solved on LC</span>
                    )}
                  </ActivityRow>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
