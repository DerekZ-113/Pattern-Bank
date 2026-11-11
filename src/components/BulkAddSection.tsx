import { useState, useRef } from "react";
import { getProblemByNumber } from "@patternbank/core";
import type { Difficulty, LeetCodeProblem } from "../types";
import Icon from "./Icon";
import { buttonClass, iconButtonClass } from "../utils/buttonStyles";

const DIFF_TEXT: Record<Difficulty, string> = { Easy: "text-pb-easy", Medium: "text-pb-medium", Hard: "text-pb-hard" };

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
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${buttonClass("outline")} w-full`}
      >
        <Icon name="plus" />
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
          type="button"
          onClick={() => { setIsOpen(false); clearAll(); }}
          aria-label="Close bulk add"
          className={iconButtonClass("sm")}
        >
          <Icon name="close" />
        </button>
      </div>

      {/* Chip input area */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex max-h-[200px] min-h-[44px] cursor-text flex-wrap items-start gap-1.5 overflow-y-auto rounded-lg border border-pb-border bg-pb-surface px-2.5 py-2 transition-colors duration-150 focus-within:border-pb-accent"
      >
        {chips.map((chip) => {
          const isNotFound = !chip.problem;
          const isExisting = !!chip.problem && chip.exists;

          const chipTone = isNotFound
            ? "border-pb-error/40 bg-pb-error/10"
            : isExisting
              ? "border-pb-border bg-pb-surface-2"
              : "border-pb-success/30 bg-pb-success/10";
          const numTone = isNotFound ? "text-pb-error" : isExisting ? "text-pb-text-dim" : "text-pb-text";

          return (
            <div
              key={chip.num}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs leading-snug ${chipTone}`}
            >
              <span className={`shrink-0 font-mono font-semibold ${numTone}`}>
                #{chip.num}
              </span>
              {chip.problem ? (
                <>
                  <span
                    className={`truncate ${isExisting ? "text-pb-text-dim line-through" : "text-pb-text"}`}
                  >
                    {chip.problem.t}
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${DIFF_TEXT[chip.problem.d]}`}>
                    {chip.problem.d[0]}
                  </span>
                </>
              ) : (
                <span className="italic text-pb-error">Not found</span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeChip(chip.num); }}
                aria-label={`Remove #${chip.num}`}
                className="inline-flex shrink-0 cursor-pointer items-center rounded border-none bg-transparent p-0.5 text-pb-text-dim transition-colors duration-150 hover:text-pb-text"
              >
                <Icon name="close" className="h-3 w-3" />
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
          className="min-w-[80px] flex-1 border-none bg-transparent py-0.5 text-[13px] text-pb-text outline-none placeholder:text-pb-text-dim"
        />
      </div>

      {/* Status line */}
      {chips.length > 0 && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="flex gap-3">
            {validCount > 0 && (
              <span className="text-pb-success">{validCount} ready</span>
            )}
            {existsCount > 0 && (
              <span className="text-pb-text-dim">{existsCount} already added</span>
            )}
            {notFoundCount > 0 && (
              <span className="text-pb-error">{notFoundCount} not found</span>
            )}
          </div>
          <button
            type="button"
            onClick={clearAll}
            className={buttonClass("ghost", "sm")}
          >
            Clear
          </button>
        </div>
      )}

      {/* Hint text */}
      <p className="mt-2 text-xs leading-relaxed text-pb-text-dim">
        Type or paste LeetCode numbers. Press Enter after each.
        Problems arrive with no patterns — tag them during review.
      </p>

      {/* Add button */}
      {validCount > 0 && (
        <button
          type="button"
          onClick={handleAdd}
          className={`${buttonClass("primary")} mt-3 w-full`}
        >
          Add {validCount} Problem{validCount !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
