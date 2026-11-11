import { useState, useEffect } from "react";
import { CORE_PATTERNS, EXTRA_PATTERNS, DIFFICULTIES } from "../utils/constants";
import ProblemCard from "./ProblemCard";
import FilterSelect from "./FilterSelect";
import Icon from "./Icon";
import { buttonClass } from "../utils/buttonStyles";
import type { Confidence, Problem } from "../types";
import { DEFAULT_ALL_PROBLEMS_SORT, isAllProblemsSort } from "../utils/uiState";
import type { AllProblemsSort } from "../utils/uiState";

interface Props {
  problems: Problem[];
  onEdit: (problem: Problem) => void;
  onDelete: (problem: Problem) => void;
  onToggleExclude: (id: string) => void;
  onReview?: (id: string, confidence: Confidence) => void;
  initialSort?: AllProblemsSort;
  initialPatternFilter?: string;
  enabledExtraPatterns?: string[];
  onAddClick: () => void;
  onSortChange?: (sort: AllProblemsSort) => void;
}

export default function AllProblemsView({ problems, onEdit, onDelete, onToggleExclude, onReview, initialSort = DEFAULT_ALL_PROBLEMS_SORT, initialPatternFilter = "all", enabledExtraPatterns, onAddClick, onSortChange }: Props) {
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

  const pageClass = "mx-auto flex w-full max-w-[1200px] flex-col px-5 pb-8 pt-7 md:px-8";
  const panelClass = "rounded-xl border border-pb-border-light bg-pb-surface";

  // Empty state
  if (problems.length === 0) {
    return (
      <main className={pageClass}>
        <h1 className="m-0 text-[32px] font-bold leading-tight tracking-tight text-pb-text">All Problems</h1>
        <div className={`${panelClass} mt-6 px-6 py-10`}>
          <h2 className="m-0 text-lg font-semibold text-pb-text">
            No problems yet
          </h2>
          <p className="mb-5 mt-1.5 text-sm text-pb-text-muted">
            Add your first LeetCode problem to start tracking.
          </p>
          <button type="button" onClick={onAddClick} className={buttonClass("primary")}>
            <Icon name="plus" />
            Add Problem
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={pageClass}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[32px] font-bold leading-tight tracking-tight text-pb-text">All Problems</h1>
          <p className="mt-1 text-sm text-pb-text-muted">
            Browse and maintain your library of <strong className="font-semibold text-pb-text">{problems.length} problem{problems.length !== 1 ? "s" : ""}</strong>.
          </p>
        </div>
        <button type="button" onClick={onAddClick} className={buttonClass("primary")}>
          <Icon name="plus" />
          Add Problem
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pb-text-dim">
          <Icon name="search" />
        </span>
        <input
          type="text"
          aria-label="Search problems"
          placeholder="Search by title, number, or notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-pb-border bg-pb-surface pr-3.5 pl-10 text-sm text-pb-text outline-none transition-colors duration-150 placeholder:text-pb-text-dim focus:border-pb-accent"
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
      <div className="mb-3 flex min-h-7 items-center justify-between px-0.5 text-xs text-pb-text-muted">
        <span>
          Showing <strong className="font-semibold tabular-nums text-pb-text">{sorted.length}</strong> of <strong className="font-semibold tabular-nums text-pb-text">{problems.length}</strong> problem
          {problems.length !== 1 ? "s" : ""}
        </span>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className={buttonClass("ghost", "sm")}>
            Clear filters
          </button>
        )}
      </div>

      {/* Problem list or no results */}
      {sorted.length === 0 ? (
        <div className={`${panelClass} px-5 py-7`}>
          <div className="text-sm font-semibold text-pb-text">
            No problems match your filters
          </div>
          <div className="mt-1 text-[13px] text-pb-text-muted">
            Try adjusting your search or filter criteria.
          </div>
        </div>
      ) : (
        <div className={`${panelClass} overflow-hidden`}>
          {sorted.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleExclude={onToggleExclude}
              onReview={onReview}
            />
          ))}
        </div>
      )}
    </main>
  );
}
