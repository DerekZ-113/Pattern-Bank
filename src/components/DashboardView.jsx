import { useState } from "react";
import ReviewCard from "./ReviewCard";
import SectionHeader from "./SectionHeader";
import PatternProgressRow from "./PatternProgressRow";
import StatsBar from "./StatsBar";
import { todayStr } from "../utils/dateHelpers";
import { calculateStreak, countReviewedToday } from "../utils/storage";

export default function DashboardView({
  problems,
  onReview,
  onDismiss,
  onUpdateNotes,
  onSetAllDue,
  onRestoreDates,
}) {
  const today = todayStr();
  const dueProblems = problems
    .filter((p) => p.nextReviewDate <= today)
    .sort((a, b) => (a.nextReviewDate > b.nextReviewDate ? 1 : -1));

  const [previewMode, setPreviewMode] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  const handleSetAllDue = () => {
    const snap = {};
    problems.forEach((p) => {
      snap[p.id] = p.nextReviewDate;
    });
    setSnapshot(snap);
    onSetAllDue();
    setPreviewMode(true);
  };

  const handleBack = () => {
    if (snapshot) onRestoreDates(snapshot);
    setSnapshot(null);
    setPreviewMode(false);
  };

  const handleConfirm = () => {
    setSnapshot(null);
    setPreviewMode(false);
  };

  // Pattern stats
  const patternMap = {};
  problems.forEach((p) => {
    p.patterns.forEach((pat) => {
      if (!patternMap[pat]) patternMap[pat] = { count: 0, totalConf: 0 };
      patternMap[pat].count++;
      patternMap[pat].totalConf += p.confidence;
    });
  });
  const patternStats = Object.entries(patternMap)
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      avgConfidence: data.totalConf / data.count,
    }))
    .sort((a, b) => b.count - a.count);

  const streak = calculateStreak();
  const reviewedToday = countReviewedToday(problems);

  // Empty state
  if (problems.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-5">
        <div className="rounded-xl border border-pb-border bg-pb-surface px-6 py-12 text-center">
          <div className="mb-4 text-[28px] font-bold text-pb-accent">⟡</div>
          <h2 className="mb-2.5 text-xl font-semibold text-pb-text">
            Welcome to PatternBank
          </h2>
          <p className="mx-auto max-w-[360px] text-sm leading-relaxed text-pb-text-muted">
            Start by adding your first LeetCode problem. Track patterns, build
            retention, and ace your interviews.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <StatsBar
        total={problems.length}
        due={dueProblems.length}
        reviewedToday={reviewedToday}
        streak={streak}
      />

      {/* Due for Review section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-pb-text">
              Due for Review
            </h2>
            <span className="rounded-[10px] bg-pb-bg px-2 py-px text-xs font-semibold text-pb-text-muted">
              {dueProblems.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {previewMode ? (
              <>
                <button
                  onClick={handleBack}
                  className="cursor-pointer rounded-md border border-pb-border bg-transparent px-3 py-1 text-xs font-semibold text-pb-text-muted hover:border-pb-text-muted"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="cursor-pointer rounded-md border-none bg-pb-success px-3 py-1 text-xs font-semibold text-white hover:opacity-85"
                >
                  Confirm
                </button>
              </>
            ) : (
              <button
                onClick={handleSetAllDue}
                title="Set all problems due today for demo"
                className="cursor-pointer rounded-md border border-pb-border bg-transparent px-3 py-1 text-xs font-medium text-pb-text-dim hover:border-pb-text-muted hover:text-pb-text-muted"
              >
                Set all due
              </button>
            )}
          </div>
        </div>

        {dueProblems.length === 0 ? (
          <div className="rounded-[10px] border border-pb-border bg-pb-surface px-5 py-8 text-center">
            <div className="mb-2 text-xl font-semibold text-pb-success">✓</div>
            <div className="mb-1 text-sm font-medium text-pb-text">
              You're all caught up!
            </div>
            <div className="text-[13px] text-pb-text-muted">
              No problems due for review right now.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {dueProblems.map((p) => (
              <ReviewCard
                key={p.id}
                problem={p}
                onReview={onReview}
                onDismiss={onDismiss}
                onUpdateNotes={onUpdateNotes}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pattern Progress */}
      {patternStats.length > 0 && (
        <div>
          <SectionHeader title="Pattern Progress" />
          <div className="rounded-[10px] border border-pb-border bg-pb-surface px-5 py-3">
            {patternStats.map((ps) => (
              <PatternProgressRow
                key={ps.pattern}
                pattern={ps.pattern}
                count={ps.count}
                avgConfidence={ps.avgConfidence}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
