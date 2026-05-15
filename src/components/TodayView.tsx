import TodayDoneFeed from "./TodayDoneFeed";
import TodayPendingImportCard from "./TodayPendingImportCard";
import TodayQuickStart from "./TodayQuickStart";
import TodayReviewCard from "./TodayReviewCard";
import TodaySectionHeader from "./TodaySectionHeader";
import { formatDisplayDate, todayStr } from "../utils/dateHelpers";
import {
  buildSolvedOnLeetCodeTodayIndex,
  buildTodayActivityFeedItems,
  buildTodayReviewState,
} from "../utils/todayView";
import type { Confidence, LeetCodeProblem, LeetCodeSubmission, PendingLeetCodeImport, Problem, ReviewEvent } from "../types";

interface Props {
  problems: Problem[];
  reviewEvents: ReviewEvent[];
  dailyGoal: number;
  hidePatterns?: boolean;
  onReview: (id: string, confidence: Confidence) => void;
  onDismiss: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onViewAllDue: () => void;
  onAddClick: () => void;
  onBulkAdd: (problems: LeetCodeProblem[], patternMap?: Map<number, string[]> | null) => void;
  existingProblemNumbers: Set<number>;
  pendingLeetCodeImports?: PendingLeetCodeImport[];
  onConfirmLeetCodeImport?: (item: PendingLeetCodeImport, confidence: Confidence) => void;
  onIgnoreLeetCodeImport?: (item: PendingLeetCodeImport) => void;
  leetcodeSubmissions?: LeetCodeSubmission[];
  onRateLeetCodeReview?: (submissionDbId: string, problemId: string, confidence: Confidence) => void | Promise<void>;
  today?: string;
}

export default function TodayView({
  problems,
  reviewEvents,
  dailyGoal,
  hidePatterns,
  onReview,
  onDismiss,
  onUpdateNotes,
  onViewAllDue,
  onAddClick,
  onBulkAdd,
  existingProblemNumbers,
  pendingLeetCodeImports = [],
  onConfirmLeetCodeImport,
  onIgnoreLeetCodeImport,
  leetcodeSubmissions = [],
  onRateLeetCodeReview,
  today = todayStr(),
}: Props) {
  const {
    todaysReviews,
    totalDueCount,
    reviewedToday,
    effectiveGoal,
  } = buildTodayReviewState(problems, dailyGoal, today);
  const doneTodayItems = buildTodayActivityFeedItems({
    problems,
    reviewEvents,
    leetcodeSubmissions,
    today,
  });
  const solvedOnLeetCodeToday = buildSolvedOnLeetCodeTodayIndex(leetcodeSubmissions, today);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-5 pb-8 pt-6 md:px-8">
      <header className="pt-1">
        <h1 className="m-0 text-[30px] font-semibold leading-tight tracking-normal text-pb-text">
          Today
        </h1>
        <p className="mt-1 text-sm text-pb-text-muted">{formatDisplayDate(today)}</p>
      </header>

      {problems.length === 0 && pendingLeetCodeImports.length === 0 ? (
        <TodayQuickStart
          onAddClick={onAddClick}
          onBulkAdd={onBulkAdd}
          existingProblemNumbers={existingProblemNumbers}
        />
      ) : (
        <>
          {pendingLeetCodeImports.length > 0 && (
            <section aria-labelledby="today-leetcode-title">
              <TodaySectionHeader
                id="today-leetcode-title"
                title="From LeetCode"
                count={pendingLeetCodeImports.length}
                subcopy="Solved on LC, not yet in your library"
                accent
              />
              <div className="flex flex-col gap-2.5">
                {pendingLeetCodeImports.map((item) => (
                  <TodayPendingImportCard
                    key={item.submissionDbId}
                    item={item}
                    onConfirm={(pendingItem, confidence) => onConfirmLeetCodeImport?.(pendingItem, confidence)}
                    onIgnore={(pendingItem) => onIgnoreLeetCodeImport?.(pendingItem)}
                  />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="today-reviews-title">
            <TodaySectionHeader
              id="today-reviews-title"
              title="Reviews due"
              count={totalDueCount}
              subcopy="Spaced repetition — rate after reviewing"
            />

            {todaysReviews.length === 0 ? (
              <div className="rounded-[10px] border border-pb-border bg-pb-surface px-5 py-8 text-center">
                {reviewedToday >= effectiveGoal && totalDueCount > 0 ? (
                  <>
                    <div className="mb-2 text-xl font-semibold text-pb-success">✓</div>
                    <div className="mb-1 text-sm font-medium text-pb-text">
                      Daily review goal complete
                    </div>
                    <div className="text-[13px] text-pb-text-muted">
                      You completed {effectiveGoal} review{effectiveGoal !== 1 ? "s" : ""} today.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2 text-xl font-semibold text-pb-success">✓</div>
                    <div className="mb-1 text-sm font-medium text-pb-text">
                      No reviews due
                    </div>
                    <div className="text-[13px] text-pb-text-muted">
                      All scheduled reviews are set for later.
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {todaysReviews.map((problem) => (
                  <TodayReviewCard
                    key={problem.id}
                    problem={problem}
                    hidePatterns={hidePatterns}
                    solvedOnLeetCodeToday={
                      solvedOnLeetCodeToday.problemIds.has(problem.id)
                      || (typeof problem.leetcodeNumber === "number"
                        && solvedOnLeetCodeToday.leetcodeNumbers.has(problem.leetcodeNumber))
                    }
                    onReview={onReview}
                    onDismiss={onDismiss}
                    onUpdateNotes={onUpdateNotes}
                  />
                ))}
              </div>
            )}

            {totalDueCount > todaysReviews.length && totalDueCount > 0 && (
              <button
                onClick={onViewAllDue}
                className="mt-2 w-full cursor-pointer border-none bg-transparent py-2 text-center text-[13px] font-medium text-pb-text-dim transition-colors hover:text-pb-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
              >
                See all {totalDueCount} due →
              </button>
            )}
          </section>

          {doneTodayItems.length > 0 && (
            <section aria-labelledby="done-today-title">
              <TodaySectionHeader
                id="done-today-title"
                title="Done today"
                count={doneTodayItems.length}
                subcopy="Reverse chronological"
                accent
              />
              <TodayDoneFeed
                items={doneTodayItems}
                onRateLeetCodeReview={onRateLeetCodeReview}
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}
