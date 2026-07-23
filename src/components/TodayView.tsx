import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import CollapsingListItem from "./CollapsingListItem";
import TodayDoneFeed from "./TodayDoneFeed";
import TodayEarlierLeetCodeActivity from "./TodayEarlierLeetCodeActivity";
import TodayFirstRunLaunchpad from "./TodayFirstRunLaunchpad";
import TodayLeetCodeIntroCard from "./TodayLeetCodeIntroCard";
import TodayLeetCodeCard from "./TodayLeetCodeCard";
import TodayReviewCard from "./TodayReviewCard";
import TodaySectionHeader from "./TodaySectionHeader";
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
  onConfirmLeetCodeImport?: (item: PendingLeetCodeImport, confidence: Confidence) => void;
  onIgnoreLeetCodeImport?: (item: PendingLeetCodeImport) => void;
  leetcodeSubmissions?: LeetCodeSubmission[];
  onRateLeetCodeReview?: (
    submissionDbId: string,
    problemId: string,
    confidence: Confidence,
    source?: TodayLeetCodeItem,
  ) => void | Promise<void>;
  showLeetCodeIntro?: boolean;
  leetcodeIntroSignedIn?: boolean;
  onOpenLeetCodeSettings?: () => void;
  onDismissLeetCodeIntro?: () => void;
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
  showLeetCodeIntro = false,
  leetcodeIntroSignedIn = false,
  onOpenLeetCodeSettings,
  onDismissLeetCodeIntro,
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
  const handleConfirmLeetCodeImport = useCallback((item: PendingLeetCodeImport, confidence: Confidence) => {
    onConfirmLeetCodeImport?.(item, confidence);
  }, [onConfirmLeetCodeImport]);
  const handleRateKnownLeetCodeItem = useCallback((item: TodayLeetCodeItem, confidence: Confidence) => {
    if (!item.matchedProblemId) return undefined;
    return onRateLeetCodeReview?.(item.submissionDbId, item.matchedProblemId, confidence, item);
  }, [onRateLeetCodeReview]);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-5 pb-8 pt-6 md:px-8">
      <header className="pt-1">
        <h1 className="m-0 text-[30px] font-semibold leading-tight tracking-normal text-pb-text">
          Today
        </h1>
        <p className="mt-1 text-sm text-pb-text-muted">{formatDisplayDate(today)}</p>
      </header>

      {showLeetCodeIntro && !shouldShowFirstRunLaunchpad && (
        <TodayLeetCodeIntroCard
          signedIn={leetcodeIntroSignedIn}
          onOpenSettings={onOpenLeetCodeSettings}
          onDismiss={onDismissLeetCodeIntro}
        />
      )}

      {shouldShowFirstRunLaunchpad ? (
        <TodayFirstRunLaunchpad
          signedIn={leetcodeIntroSignedIn}
          onOpenLeetCodeSettings={onOpenLeetCodeSettings}
          onAddClick={onAddClick}
          onBulkAdd={onBulkAdd}
          existingProblemNumbers={existingProblemNumbers}
        />
      ) : (
        <>
          {shouldShowLeetCodeSection && (
            <section aria-labelledby="today-leetcode-title">
              <TodaySectionHeader
                id="today-leetcode-title"
                title="From LeetCode"
                count={leetcodeSectionItems.length}
                subcopy="Solved on LC today"
                accent
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
                    onOpenDetails={onEditProblem}
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
                onOpenProblemDetails={openDetailsById}
              />
            </section>
          )}

          <TodayEarlierLeetCodeActivity days={earlierLeetCodeDays} onOpenProblemDetails={openDetailsById} />
        </>
      )}
    </main>
  );
}
