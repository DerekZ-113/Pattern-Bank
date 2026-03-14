import { useState, useRef } from "react";
import { getProblemByNumber, buildLeetCodeUrl } from "../utils/leetcodeProblems";
import type { Difficulty, LeetCodeProblem } from "../types";

const DIFF_COLORS: Record<Difficulty, string> = { Easy: "#3fb950", Medium: "#d29922", Hard: "#f85149" };

interface Chip {
  num: number;
  problem: LeetCodeProblem | null;
  exists: boolean;
}

interface Props {
  onBulkAdd: (problems: LeetCodeProblem[]) => void;
  existingIds: Set<number>;
}

export default function BulkAddSection({ onBulkAdd, existingIds }: Props) {
  const [chips, setChips] = useState<Chip[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dedup set of numbers already in chips
  const chipNums = new Set(chips.map((c) => c.num));

  const addNumbers = (raw: string) => {
    // Parse comma/space/newline separated numbers
    const nums = raw
      .split(/[\s,]+/)
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => !isNaN(n) && n > 0);

    if (nums.length === 0) return;

    const newChips: Chip[] = [];
    for (const num of nums) {
      if (chipNums.has(num) || newChips.some((c) => c.num === num)) continue;
      const problem = getProblemByNumber(num);
      const exists = problem
        ? existingIds.has(num)
        : false;
      newChips.push({ num, problem: problem ?? null, exists });
    }

    if (newChips.length > 0) {
      setChips((prev) => [...prev, ...newChips]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (inputValue.trim()) {
        addNumbers(inputValue);
        setInputValue("");
      }
    }
    // Backspace removes last chip when input is empty
    if (e.key === "Backspace" && !inputValue && chips.length > 0) {
      setChips((prev) => prev.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    addNumbers(pasted);
    setInputValue("");
  };

  const removeChip = (num: number) => {
    setChips((prev) => prev.filter((c) => c.num !== num));
  };

  const handleAdd = () => {
    const validChips = chips.filter((c) => c.problem && !c.exists);
    if (validChips.length === 0) return;
    onBulkAdd(validChips.map((c) => c.problem as LeetCodeProblem));
    setChips([]);
    setInputValue("");
    setIsOpen(false);
  };

  const clearAll = () => {
    setChips([]);
    setInputValue("");
  };

  const validCount = chips.filter((c) => c.problem && !c.exists).length;
  const notFoundCount = chips.filter((c) => !c.problem).length;
  const existsCount = chips.filter((c) => c.problem && c.exists).length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
      >
        <span className="text-sm">+</span>
        Bulk Add Problems
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-pb-border bg-pb-bg p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-semibold text-pb-text-muted">
          Enter LeetCode problem numbers
        </label>
        <button
          onClick={() => { setIsOpen(false); clearAll(); }}
          className="cursor-pointer border-none bg-transparent px-1 text-xs text-pb-text-dim hover:text-pb-text-muted"
        >
          ✕
        </button>
      </div>

      {/* Chip input area */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex max-h-[200px] min-h-[44px] cursor-text flex-wrap items-start gap-1.5 overflow-y-auto rounded-lg border border-pb-border bg-pb-surface px-2.5 py-2 transition-colors duration-150 focus-within:border-pb-accent"
      >
        {chips.map((chip) => {
          const isNotFound = !chip.problem;
          const isExisting = chip.problem && chip.exists;
          const diffColor = chip.problem ? DIFF_COLORS[chip.problem.d] : null;

          let borderColor, bgColor, textColor;
          if (isNotFound) {
            borderColor = "rgba(248,81,73,0.4)";
            bgColor = "rgba(248,81,73,0.1)";
            textColor = "#f85149";
          } else if (isExisting) {
            borderColor = "rgba(139,148,158,0.3)";
            bgColor = "rgba(139,148,158,0.08)";
            textColor = "#8b949e";
          } else {
            borderColor = "rgba(63,185,80,0.3)";
            bgColor = "rgba(63,185,80,0.08)";
            textColor = "#e6edf3";
          }

          return (
            <div
              key={chip.num}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 8px",
                borderRadius: 6,
                border: `1px solid ${borderColor}`,
                backgroundColor: bgColor,
                fontSize: 12,
                lineHeight: 1.4,
                maxWidth: "100%",
              }}
            >
              <span style={{ color: textColor, fontWeight: 600, flexShrink: 0 }}>
                #{chip.num}
              </span>
              {chip.problem ? (
                <>
                  <span
                    style={{
                      color: isExisting ? "#8b949e" : "#e6edf3",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textDecoration: isExisting ? "line-through" : "none",
                    }}
                  >
                    {chip.problem.t}
                  </span>
                  <span style={{ color: diffColor ?? undefined, fontWeight: 600, fontSize: 10, flexShrink: 0 }}>
                    {chip.problem.d[0]}
                  </span>
                </>
              ) : (
                <span style={{ color: "#f85149", fontStyle: "italic" }}>Not found</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeChip(chip.num); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#484f58",
                  cursor: "pointer",
                  padding: "0 2px",
                  fontSize: 11,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = "#e6edf3")}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.color = "#484f58")}
              >
                ✕
              </button>
            </div>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={chips.length === 0 ? "1, 15, 56, 146..." : ""}
          style={{
            flex: 1,
            minWidth: 80,
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            color: "#e6edf3",
            fontSize: 13,
            padding: "2px 0",
          }}
        />
      </div>

      {/* Status line */}
      {chips.length > 0 && (
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <div className="flex gap-3">
            {validCount > 0 && (
              <span style={{ color: "#3fb950" }}>{validCount} ready</span>
            )}
            {existsCount > 0 && (
              <span style={{ color: "#8b949e" }}>{existsCount} already added</span>
            )}
            {notFoundCount > 0 && (
              <span style={{ color: "#f85149" }}>{notFoundCount} not found</span>
            )}
          </div>
          <button
            onClick={clearAll}
            className="cursor-pointer border-none bg-transparent text-[11px] text-pb-text-dim hover:text-pb-text-muted"
          >
            Clear
          </button>
        </div>
      )}

      {/* Hint text */}
      <p className="mt-2 text-[11px] leading-relaxed text-pb-text-dim">
        Type or paste LeetCode numbers. Press Enter after each.
        Problems arrive with no patterns — tag them during review.
      </p>

      {/* Add button */}
      {validCount > 0 && (
        <button
          onClick={handleAdd}
          className="mt-3 w-full cursor-pointer rounded-lg border-none bg-pb-accent py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-85"
        >
          Add {validCount} Problem{validCount !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
