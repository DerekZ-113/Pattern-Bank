import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import CollapsingListItem from "./CollapsingListItem";
import TodayDoneFeed from "./TodayDoneFeed";
import TodayEarlierLeetCodeActivity from "./TodayEarlierLeetCodeActivity";
import TodayFirstRunLaunchpad from "./TodayFirstRunLaunchpad";
import TodayGoalMeter from "./TodayGoalMeter";
import WhatsNewBanner from "./WhatsNewBanner";
import TodayLeetCodeCard from "./TodayLeetCodeCard";
import TodayReviewCard from "./TodayReviewCard";
import TodaySectionHeader from "./TodaySectionHeader";
import { buttonClass } from "../utils/buttonStyles";
import { formatDisplayDate, todayStr, utcToLocalDateStr } from "@patternbank/core";
import {
  buildEarlierLeetCodeActivity,
  buildSolvedOnLeetCodeTodayIndex,
  buildTodayActivityFeedItems,
  buildTodayLeetCodeItemKey,
  buildTodayReviewState,
  type ExitingTodayLeetCodeItem,
} from "@patternbank/core";
import type {
  Confidence,
  LeetCodeProblem,
  LeetCodeSubmission,
  PendingLeetCodeImport,
  Problem,
  ReviewEvent,
  TodayLeetCodeItem,
} from "../types";

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
  todayLeetCodeItems?: TodayLeetCodeItem[];
  onConfirmLeetCodeImport?: (item: PendingLeetCodeImport, confidence: Confidence) => void | Promise<void>;
  onIgnoreLeetCodeImport?: (item: PendingLeetCodeImport) => void;
  leetcodeSubmissions?: LeetCodeSubmission[];
  onRateLeetCodeReview?: (
    submissionDbId: string,
    problemId: string,
    confidence: Confidence,
    source?: TodayLeetCodeItem,
  ) => void | Promise<void>;
  showWhatsNew?: boolean;
  showWhatsNewLeetCodeCta?: boolean;
  signedIn?: boolean;
  onOpenLeetCodeSettings?: () => void;
  onDismissWhatsNew?: () => void;
  onEditProblem?: (problem: Problem) => void;
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
  todayLeetCodeItems,
  onConfirmLeetCodeImport,
  onIgnoreLeetCodeImport,
  leetcodeSubmissions = [],
  onRateLeetCodeReview,
  showWhatsNew = false,
  showWhatsNewLeetCodeCta = false,
  signedIn = false,
  onOpenLeetCodeSettings,
  onDismissWhatsNew,
  onEditProblem,
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
  const problemById = useMemo(() => new Map(problems.map((p) => [p.id, p])), [problems]);
  const handleOpenProblemDetails = useCallback((problemId: string) => {
    const problem = problemById.get(problemId);
    if (problem) onEditProblem?.(problem);
  }, [problemById, onEditProblem]);
  const openDetailsById = onEditProblem ? handleOpenProblemDetails : undefined;
  const earlierLeetCodeDays = buildEarlierLeetCodeActivity({
    submissions: leetcodeSubmissions,
    problems,
    reviewEvents,
    today,
  });
  const leetcodeSectionItems = useMemo<TodayLeetCodeItem[]>(
    () => todayLeetCodeItems ?? pendingLeetCodeImports.map((item) => ({
      ...item,
      kind: "pending_import" as const,
      status: "detected" as const,
      matchedProblemId: null,
      statusLabel: "Rate to add" as const,
    })),
    [pendingLeetCodeImports, todayLeetCodeItems],
  );
  const previousLeetCodeItemsRef = useRef<TodayLeetCodeItem[]>(leetcodeSectionItems);
  const exitingLeetCodeKeysRef = useRef(new Set<string>());
  const [exitingLeetCodeItems, setExitingLeetCodeItems] = useState<ExitingTodayLeetCodeItem[]>([]);
  const hasLeetCodeSolveToday = leetcodeSubmissions
    .some((submission) => utcToLocalDateStr(submission.submittedAt) === today);
  useLayoutEffect(() => {
    const currentKeys = new Set(leetcodeSectionItems.map(buildTodayLeetCodeItemKey));

    setExitingLeetCodeItems((currentExitingItems) => {
      const keptExitingItems = currentExitingItems.filter((exitingItem) => {
        const shouldKeep = !currentKeys.has(exitingItem.key);
        if (!shouldKeep) {
          exitingLeetCodeKeysRef.current.delete(exitingItem.key);
        }
        return shouldKeep;
      });
      const keptExitingKeys = new Set(keptExitingItems.map((exitingItem) => exitingItem.key));
      const newlyRemovedItems = previousLeetCodeItemsRef.current
        .map((item) => ({ key: buildTodayLeetCodeItemKey(item), item }))
        .filter(({ key }) => !currentKeys.has(key)
          && !keptExitingKeys.has(key)
          && !exitingLeetCodeKeysRef.current.has(key));

      if (newlyRemovedItems.length === 0 && keptExitingItems.length === currentExitingItems.length) {
        return currentExitingItems;
      }

      for (const exitingItem of newlyRemovedItems) {
        exitingLeetCodeKeysRef.current.add(exitingItem.key);
      }
      return [...keptExitingItems, ...newlyRemovedItems];
    });
    previousLeetCodeItemsRef.current = leetcodeSectionItems;
  }, [leetcodeSectionItems]);
  const handleLeetCodeExitComplete = useCallback((key: string) => {
    exitingLeetCodeKeysRef.current.delete(key);
    setExitingLeetCodeItems((currentItems) => currentItems.filter((item) => item.key !== key));
  }, []);
  const hasLeetCodeSectionRows = leetcodeSectionItems.length > 0
    || exitingLeetCodeItems.length > 0;
  const shouldShowLeetCodeSection = hasLeetCodeSectionRows || hasLeetCodeSolveToday;
  const shouldShowFirstRunLaunchpad = problems.length === 0
    && leetcodeSectionItems.length === 0
    && exitingLeetCodeItems.length === 0
    && !hasLeetCodeSolveToday
    && doneTodayItems.length === 0;
  // Returns the promise so the star picker stays disabled for the whole
  // import — the only double-click guard the pending-import stars have.
  const handleConfirmLeetCodeImport = useCallback((item: PendingLeetCodeImport, confidence: Confidence) => {
    return onConfirmLeetCodeImport?.(item, confidence);
  }, [onConfirmLeetCodeImport]);
  const handleRateKnownLeetCodeItem = useCallback((item: TodayLeetCodeItem, confidence: Confidence) => {
    if (!item.matchedProblemId) return undefined;
    return onRateLeetCodeReview?.(item.submissionDbId, item.matchedProblemId, confidence, item);
  }, [onRateLeetCodeReview]);

  const emptyStateClass =
    "rounded-xl border border-pb-border-light bg-pb-surface px-5 py-7";
  const hasLog = doneTodayItems.length > 0 || earlierLeetCodeDays.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-5 pb-8 pt-7 md:px-8">
      <header>
        <h1 className="m-0 text-[32px] font-bold leading-tight tracking-tight text-pb-text">
          Today
        </h1>
        <p className="mt-1 text-sm text-pb-text-muted">{formatDisplayDate(today)}</p>
        {!shouldShowFirstRunLaunchpad && effectiveGoal > 0 && (
          <div className="mt-4">
            <TodayGoalMeter
              reviewedToday={reviewedToday}
              effectiveGoal={effectiveGoal}
              totalDueCount={totalDueCount}
            />
          </div>
        )}
      </header>

      {showWhatsNew && !shouldShowFirstRunLaunchpad && (
        <WhatsNewBanner
          signedIn={signedIn}
          showLeetCodeCta={showWhatsNewLeetCodeCta}
          onOpenSettings={onOpenLeetCodeSettings}
          onDismiss={onDismissWhatsNew}
        />
      )}

      {shouldShowFirstRunLaunchpad ? (
        <TodayFirstRunLaunchpad
          signedIn={signedIn}
          onOpenLeetCodeSettings={onOpenLeetCodeSettings}
          onAddClick={onAddClick}
          onBulkAdd={onBulkAdd}
          existingProblemNumbers={existingProblemNumbers}
        />
      ) : (
        // What to do sits in the main column; the log of what is done sits
        // beside it on wide screens and below it on narrow ones.
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 max-w-[780px] flex-col gap-8">
            {shouldShowLeetCodeSection && (
              <section aria-labelledby="today-leetcode-title">
                <TodaySectionHeader
                  id="today-leetcode-title"
                  title="From LeetCode"
                  count={leetcodeSectionItems.length}
                  subcopy="Solved on LC today"
                />
                {hasLeetCodeSectionRows && (
                  <div className="flex flex-col gap-2.5">
                    {leetcodeSectionItems.map((item) => (
                      <TodayLeetCodeCard
                        key={item.submissionDbId}
                        item={item}
                        onConfirm={handleConfirmLeetCodeImport}
                        onIgnore={(pendingItem) => onIgnoreLeetCodeImport?.(pendingItem)}
                        onRateKnown={handleRateKnownLeetCodeItem}
                        onOpenProblemDetails={openDetailsById}
                      />
                    ))}
                    {exitingLeetCodeItems.map(({ key, item }) => (
                      <CollapsingListItem
                        key={`exiting-${key}`}
                        onExited={() => handleLeetCodeExitComplete(key)}
                      >
                        <TodayLeetCodeCard
                          item={item}
                          onConfirm={() => undefined}
                          onIgnore={() => undefined}
                          onRateKnown={() => undefined}
                        />
                      </CollapsingListItem>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section aria-labelledby="today-reviews-title">
              <TodaySectionHeader
                id="today-reviews-title"
                title="Reviews due"
                count={totalDueCount}
                subcopy="Weakest first"
              />

              {todaysReviews.length === 0 ? (
                <div className={emptyStateClass}>
                  {reviewedToday >= effectiveGoal && totalDueCount > 0 ? (
                    <>
                      <div className="text-sm font-semibold text-pb-text">
                        Daily review goal complete
                      </div>
                      <div className="mt-1 text-[13px] text-pb-text-muted">
                        You completed {effectiveGoal} review{effectiveGoal !== 1 ? "s" : ""} today.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-pb-text">
                        No reviews due
                      </div>
                      <div className="mt-1 text-[13px] text-pb-text-muted">
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
                      onOpenDetails={onEditProblem}
                    />
                  ))}
                </div>
              )}

              {totalDueCount > todaysReviews.length && totalDueCount > 0 && (
                <button
                  type="button"
                  onClick={onViewAllDue}
                  className={`${buttonClass("ghost")} mt-2 w-full`}
                >
                  See all {totalDueCount} due
                </button>
              )}
            </section>
          </div>

          {hasLog && (
            <div className="flex min-w-0 flex-col gap-8">
              {doneTodayItems.length > 0 && (
                <section aria-labelledby="done-today-title">
                  <TodaySectionHeader
                    id="done-today-title"
                    title="Done today"
                    count={doneTodayItems.length}
                    subcopy="Newest first"
                  />
                  <TodayDoneFeed
                    items={doneTodayItems}
                    onRateLeetCodeReview={onRateLeetCodeReview}
                    onOpenProblemDetails={openDetailsById}
                  />
                </section>
              )}

              <TodayEarlierLeetCodeActivity days={earlierLeetCodeDays} onOpenProblemDetails={openDetailsById} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
