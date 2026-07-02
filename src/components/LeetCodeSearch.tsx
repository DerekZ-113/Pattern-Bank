import { useState, useRef, useEffect, useMemo } from "react";
import { searchProblems, buildLeetCodeUrl } from "@patternbank/core";
import type { LeetCodeProblem, Difficulty } from "../types";

interface Props {
  onSelect: (selected: { title: string; leetcodeNumber: number; difficulty: Difficulty; url: string }) => void;
}

export default function LeetCodeSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownClosed, setDropdownClosed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<LeetCodeProblem[]>(
    () => (query.trim() ? searchProblems(query) : []),
    [query]
  );

  const isOpen = results.length > 0 && !dropdownClosed;

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setDropdownClosed(false);
    setHighlightIndex(0);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownClosed(true);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (problem: LeetCodeProblem) => {
    onSelect({
      title: problem.t,
      leetcodeNumber: problem.n,
      difficulty: problem.d,
      url: buildLeetCodeUrl(problem.s),
    });
    setQuery("");
    setDropdownClosed(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setDropdownClosed(true);
    }
  };

  const diffColor: Record<Difficulty, string> = { Easy: "text-pb-easy", Medium: "text-pb-medium", Hard: "text-pb-hard" };

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
        Search LeetCode Problem
      </label>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setDropdownClosed(false)}
        placeholder="Type number or title... e.g. '1' or 'two sum'"
        className="w-full rounded-lg border border-pb-border bg-pb-bg px-3 py-2.5 text-sm text-pb-text outline-none transition-colors duration-150 focus:border-pb-accent"
      />

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[240px] overflow-y-auto rounded-lg border border-pb-border bg-pb-surface shadow-[0_8px_32px_var(--color-pb-shadow)]">
          {results.map((problem, i) => (
            <button
              key={problem.n}
              onClick={() => handleSelect(problem)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`flex w-full cursor-pointer items-center gap-3 border-none px-3 py-2.5 text-left text-sm transition-colors duration-75 ${
                i === highlightIndex
                  ? "bg-pb-accent-subtle"
                  : "bg-transparent hover:bg-pb-surface-hover"
              }`}
            >
              <span className="min-w-[36px] text-xs font-semibold text-pb-text-muted">
                #{problem.n}
              </span>
              <span className="flex-1 truncate text-pb-text">
                {problem.t}
              </span>
              <span className={`text-[11px] font-semibold uppercase ${diffColor[problem.d] || ""}`}>
                {problem.d}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
