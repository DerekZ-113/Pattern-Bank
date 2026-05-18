import { useState, useEffect } from "react";
import { CORE_PATTERNS, EXTRA_PATTERNS, DIFFICULTIES } from "../utils/constants";
import ProblemCard from "./ProblemCard";
import FilterSelect from "./FilterSelect";
import type { Problem } from "../types";
import { DEFAULT_ALL_PROBLEMS_SORT, isAllProblemsSort } from "../utils/uiState";
import type { AllProblemsSort } from "../utils/uiState";

interface Props {
  problems: Problem[];
  onEdit: (problem: Problem) => void;
  onDelete: (problem: Problem) => void;
  onToggleExclude: (id: string) => void;
  initialSort?: AllProblemsSort;
  initialPatternFilter?: string;
  enabledExtraPatterns?: string[];
  onAddClick: () => void;
  onSortChange?: (sort: AllProblemsSort) => void;
}

export default function AllProblemsView({ problems, onEdit, onDelete, onToggleExclude, initialSort = DEFAULT_ALL_PROBLEMS_SORT, initialPatternFilter = "all", enabledExtraPatterns, onAddClick, onSortChange }: Props) {
  const [search, setSearch] = useState("");
  const [filterPattern, setFilterPattern] = useState(initialPatternFilter);
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterConfidence, setFilterConfidence] = useState("all");
  const [filterReviewStatus, setFilterReviewStatus] = useState("all");
  const [sortBy, setSortBy] = useState(initialSort);

  // Sync with parent-driven filter/sort changes
  useEffect(() => { setFilterPattern(initialPatternFilter); }, [initialPatternFilter]);
  useEffect(() => { setSortBy(initialSort); }, [initialSort]);

  const extraPatternsInUse = new Set<string>();
  problems.forEach((p) => p.patterns.forEach((pat) => {
    if (!(CORE_PATTERNS as readonly string[]).includes(pat)) extraPatternsInUse.add(pat);
  }));
  const allFilterPatterns = [
    ...CORE_PATTERNS,
    ...EXTRA_PATTERNS.filter((p) =>
      (enabledExtraPatterns ?? []).includes(p) || extraPatternsInUse.has(p)
    ),
  ];
  const patternOptions = [
    { value: "all", label: "All Patterns" },
    ...allFilterPatterns.map((p) => ({ value: p, label: p })),
  ];
  const difficultyOptions = [
    { value: "all", label: "All Difficulty" },
    ...DIFFICULTIES.map((d) => ({ value: d, label: d })),
  ];
  const confidenceOptions = [
    { value: "all", label: "All Confidence" },
    ...[1, 2, 3, 4, 5].map((c) => ({
      value: String(c),
      label: `${"★".repeat(c)}${"☆".repeat(5 - c)} (${c})`,
    })),
  ];
  const reviewStatusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "excluded", label: "Excluded" },
  ];
  const sortOptions = [
    { value: "leetcodeNumber", label: "Problem Index (Low → High)" },
    { value: "dateAdded", label: "Date Added (Newest)" },
    { value: "confidence", label: "Confidence (Low → High)" },
    { value: "nextReview", label: "Next Review (Soonest)" },
  ];

  const filtered = problems.filter((p) => {
    const s = search.toLowerCase().trim();
    if (
      s &&
      !p.title.toLowerCase().includes(s) &&
      !(p.notes && p.notes.toLowerCase().includes(s)) &&
      !(p.leetcodeNumber && String(p.leetcodeNumber).includes(s))
    )
      return false;
    if (filterPattern !== "all" && !p.patterns.includes(filterPattern))
      return false;
    if (filterDifficulty !== "all" && p.difficulty !== filterDifficulty)
      return false;
    if (
      filterConfidence !== "all" &&
      p.confidence !== parseInt(filterConfidence, 10)
    )
      return false;
    if (filterReviewStatus === "active" && p.excludeFromReview) return false;
    if (filterReviewStatus === "excluded" && !p.excludeFromReview) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "dateAdded")
      return b.dateAdded > a.dateAdded ? 1 : -1;
    if (sortBy === "confidence") return a.confidence - b.confidence;
    if (sortBy === "nextReview")
      return a.nextReviewDate > b.nextReviewDate ? 1 : -1;
    if (sortBy === "leetcodeNumber") {
      if (a.leetcodeNumber == null && b.leetcodeNumber == null) return 0;
      if (a.leetcodeNumber == null) return 1;
      if (b.leetcodeNumber == null) return -1;
      return a.leetcodeNumber - b.leetcodeNumber;
    }
    return 0;
  });

  const hasActiveFilters = Boolean(
    search ||
    filterPattern !== "all" ||
    filterDifficulty !== "all" ||
    filterConfidence !== "all" ||
    filterReviewStatus !== "all"
  );

  const clearFilters = () => {
    setSearch("");
    setFilterPattern("all");
    setFilterDifficulty("all");
    setFilterConfidence("all");
    setFilterReviewStatus("all");
  };

  const handleSortChange = (value: string) => {
    if (!isAllProblemsSort(value)) return;
    setSortBy(value);
    onSortChange?.(value);
  };

  // Empty state
  if (problems.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-[1200px] flex-col px-5 pb-8 pt-6 md:px-8">
        <div className="rounded-[10px] border border-pb-border bg-pb-surface px-6 py-12 text-center">
          <img src="/favicon-32.png" alt="" className="mx-auto mb-4 h-12 w-12 rounded-lg" />
          <h2 className="mb-2 text-lg font-semibold text-pb-text">
            No problems yet
          </h2>
          <p className="mb-5 text-sm text-pb-text-muted">
            Add your first LeetCode problem to start tracking.
          </p>
          <button
            onClick={onAddClick}
            className="cursor-pointer rounded-lg border-none bg-pb-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
          >
            + Add Problem
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col px-5 pb-8 pt-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight tracking-normal text-pb-text">All Problems</h1>
          <p className="mt-1 text-sm text-pb-text-muted">
            Browse and maintain your library — <strong className="font-semibold text-pb-text">{problems.length} problem{problems.length !== 1 ? "s" : ""}</strong>
          </p>
        </div>
        <button
          onClick={onAddClick}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-pb-accent/45 bg-pb-accent-subtle px-4 text-[13px] font-semibold text-pb-accent transition-colors hover:bg-pb-accent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
        >
          <span aria-hidden="true" className="-mt-px text-[15px] leading-none">+</span>
          <span>Add Problem</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pb-text-dim"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search by title, number, or notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-[42px] w-full rounded-[10px] border border-pb-border bg-pb-surface pr-3.5 pl-10 text-sm text-pb-text outline-none transition-colors duration-150 placeholder:text-pb-text-dim focus:border-pb-accent/50 focus:bg-pb-surface-2"
        />
      </div>

      {/* Filters */}
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.2fr]">
        <FilterSelect
          ariaLabel="Sort"
          value={sortBy}
          onChange={handleSortChange}
          options={sortOptions}
          active={sortBy !== DEFAULT_ALL_PROBLEMS_SORT}
        />
        <FilterSelect
          ariaLabel="Pattern"
          value={filterPattern}
          onChange={setFilterPattern}
          options={patternOptions}
          active={filterPattern !== "all"}
        />
        <FilterSelect
          ariaLabel="Difficulty"
          value={filterDifficulty}
          onChange={setFilterDifficulty}
          options={difficultyOptions}
          active={filterDifficulty !== "all"}
        />
        <FilterSelect
          ariaLabel="Confidence"
          value={filterConfidence}
          onChange={setFilterConfidence}
          options={confidenceOptions}
          active={filterConfidence !== "all"}
        />
        <FilterSelect
          ariaLabel="Status"
          value={filterReviewStatus}
          onChange={setFilterReviewStatus}
          options={reviewStatusOptions}
          active={filterReviewStatus !== "all"}
        />
      </div>

      {/* Results count */}
      <div className="mb-3.5 flex items-center justify-between px-0.5 pt-1 text-xs text-pb-text-muted">
        <span>
          Showing <strong className="font-semibold text-pb-text">{sorted.length}</strong> of <strong className="font-semibold text-pb-text">{problems.length}</strong> problem
          {problems.length !== 1 ? "s" : ""}
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="cursor-pointer border-none bg-transparent px-1 py-0.5 text-xs font-medium text-pb-accent transition-colors hover:text-pb-accent-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
          >
            Clear filters ×
          </button>
        )}
      </div>

      {/* Problem list or no results */}
      {sorted.length === 0 ? (
        <div className="rounded-[10px] border border-pb-border bg-pb-surface px-5 py-8 text-center">
          <div className="mb-1 text-sm font-medium text-pb-text">
            No problems match your filters
          </div>
          <div className="text-[13px] text-pb-text-muted">
            Try adjusting your search or filter criteria.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleExclude={onToggleExclude}
            />
          ))}
        </div>
      )}
    </main>
  );
}
