import { useState, useMemo } from "react";
import posthog from "posthog-js";
import { getListSummaries, getListProblems } from "../utils/problemLists";
import type { LeetCodeProblem } from "../types";

interface Props {
  existingIds: Set<number>;
  onBulkAdd: (problems: LeetCodeProblem[], patternMap: Map<number, string[]> | null) => void;
}

export default function ProblemListPicker({ existingIds, onBulkAdd }: Props) {
  const [selectedId, setSelectedId] = useState("");

  // Compute summaries for all lists based on current library
  const summaries = useMemo(
    () => getListSummaries(existingIds),
    [existingIds]
  );

  // Get the selected list's summary
  const selected = summaries.find((s) => s.id === selectedId) || null;

  const handleAdd = () => {
    if (!selected || selected.newCount === 0) return;

    const { lcProblems, patternMap } = getListProblems(selectedId, existingIds);
    if (lcProblems.length === 0) return;

    posthog.capture("curated_list_imported", { list_name: selected.name, count: lcProblems.length, platform: "web" });
    onBulkAdd(lcProblems, patternMap);
    setSelectedId("");
  };

  // Progress bar color
  const getBarColor = (existing: number, total: number) => {
    if (total === 0) return "#3fb950";
    const pct = existing / total;
    if (pct >= 0.8) return "#3fb950";
    if (pct >= 0.4) return "#e3b341";
    return "#8b949e";
  };

  return (
    <div>
      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
        Import Problem List
      </label>

      {/* Dropdown */}
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-lg border border-pb-border bg-pb-surface px-3.5 py-2.5 pr-8 text-[13px] font-medium text-pb-text outline-none transition-colors duration-150 focus:border-pb-accent"
        >
          <option value="" className="bg-pb-surface text-pb-text-dim">
            Select a list...
          </option>
          {summaries.map((s) => (
            <option
              key={s.id}
              value={s.id}
              className="bg-pb-surface text-pb-text"
            >
              {s.name} ({s.existing}/{s.total})
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-pb-text-dim">
          ▼
        </span>
      </div>

      {/* Info bar — shown when a list is selected */}
      {selected && (
        <div className="mt-3 rounded-lg border border-pb-border bg-pb-bg px-3.5 py-3">
          {selected.newCount > 0 ? (
            <>
              {/* Stats */}
              <div className="mb-2 flex items-baseline justify-between text-xs">
                <span className="text-pb-text-muted">
                  {selected.total} problems
                  {selected.existing > 0 && (
                    <span className="text-pb-text-dim">
                      {" "}· {selected.existing} already added
                    </span>
                  )}
                </span>
                <span className="text-pb-text-dim">
                  {Math.round((selected.existing / selected.total) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-pb-border">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(selected.existing / selected.total) * 100}%`,
                    backgroundColor: getBarColor(selected.existing, selected.total),
                  }}
                />
              </div>

              {/* Add button */}
              <button
                onClick={handleAdd}
                className="w-full cursor-pointer rounded-lg border-none bg-pb-accent py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-85"
              >
                Add {selected.newCount} Problem{selected.newCount !== 1 ? "s" : ""}
              </button>
            </>
          ) : (
            /* All added state */
            <div className="flex items-center gap-2 py-1">
              <span className="text-sm text-pb-success">✓</span>
              <span className="text-[13px] font-medium text-pb-success">
                All {selected.total} problems already added
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
