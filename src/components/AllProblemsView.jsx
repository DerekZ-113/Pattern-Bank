import { useState, useEffect } from "react";
import { PATTERNS, DIFFICULTIES } from "../utils/constants";
import ProblemCard from "./ProblemCard";
import FilterSelect from "./FilterSelect";

export default function AllProblemsView({ problems, onEdit, onDelete, onToggleExclude, initialSort = "dateAdded", initialPatternFilter = "all" }) {
  const [search, setSearch] = useState("");
  const [filterPattern, setFilterPattern] = useState(initialPatternFilter);
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterConfidence, setFilterConfidence] = useState("all");
  const [filterReviewStatus, setFilterReviewStatus] = useState("all");
  const [sortBy, setSortBy] = useState(initialSort);

  // Sync with parent-driven filter/sort changes
  useEffect(() => { setFilterPattern(initialPatternFilter); }, [initialPatternFilter]);
  useEffect(() => { setSortBy(initialSort); }, [initialSort]);

  const patternOptions = [
    { value: "all", label: "All Patterns" },
    ...PATTERNS.map((p) => ({ value: p, label: p })),
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
    { value: "dateAdded", label: "Date Added (Newest)" },
    { value: "confidence", label: "Confidence (Low → High)" },
    { value: "nextReview", label: "Next Review (Soonest)" },
    { value: "leetcodeNumber", label: "Problem Index (Low → High)" },
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

  const hasActiveFilters =
    search ||
    filterPattern !== "all" ||
    filterDifficulty !== "all" ||
    filterConfidence !== "all" ||
    filterReviewStatus !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterPattern("all");
    setFilterDifficulty("all");
    setFilterConfidence("all");
    setFilterReviewStatus("all");
  };

  // Empty state
  if (problems.length === 0) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-pb-border bg-pb-surface px-6 py-12 text-center">
          <img src="/favicon-32.png" alt="" className="mx-auto mb-4 h-12 w-12 rounded-lg" />
          <h2 className="mb-2 text-lg font-semibold text-pb-text">
            No problems yet
          </h2>
          <p className="text-sm text-pb-text-muted">
            Add your first LeetCode problem to start tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Search */}
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-pb-text-dim">
          ⌕
        </span>
        <input
          type="text"
          placeholder="Search by title or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-pb-border bg-pb-surface py-2.5 pr-3 pl-9 text-sm text-pb-text outline-none transition-colors duration-150 focus:border-pb-accent"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 max-sm:flex-col">
        <FilterSelect
          value={filterPattern}
          onChange={setFilterPattern}
          options={patternOptions}
        />
        <FilterSelect
          value={filterDifficulty}
          onChange={setFilterDifficulty}
          options={difficultyOptions}
        />
        <FilterSelect
          value={filterConfidence}
          onChange={setFilterConfidence}
          options={confidenceOptions}
        />
        <FilterSelect
          value={filterReviewStatus}
          onChange={setFilterReviewStatus}
          options={reviewStatusOptions}
        />
        <FilterSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
      </div>

      {/* Results count */}
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] text-pb-text-muted">
          Showing {sorted.length} of {problems.length} problem
          {problems.length !== 1 ? "s" : ""}
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="cursor-pointer border-none bg-transparent px-1 py-0.5 text-xs font-medium text-pb-accent"
          >
            Clear filters
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
    </div>
  );
}
