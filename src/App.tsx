import { useCallback, useEffect, useMemo } from "react";
import { exportData, loadReviewLog, loadReviewEvents } from "./utils/storage";
import { rateLeetCodeReviewLocallyFirst, respreadScheduledProblems, todayStr, type LeetCodeCompletionIdentity } from "@patternbank/core";

import useAuth from "./hooks/useAuth";
import useUI from "./hooks/useUI";
import useProblems from "./hooks/useProblems";
import useLeetCodeActivity from "./hooks/useLeetCodeActivity";
import useLeetCodePendingImports from "./hooks/useLeetCodePendingImports";

import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import Header from "./components/Header";
import HelpModal from "./components/HelpModal";
import NavBar from "./components/NavBar";
import ProblemModal from "./components/ProblemModal";
import TodayView from "./components/TodayView";
import ProgressView from "./components/ProgressView";
import AllProblemsView from "./components/AllProblemsView";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  const { user, signInWithGoogle, signInWithGitHub, signInWithApple, signOut } = useAuth();
  const ui = useUI();

  const {
    problems,
    preferences,
    syncStatus,
    reviewCount,
    handleSaveProblem,
    handleDeleteConfirm,
    handleCreateProblemFromLeetCodeImport,
    handleReview,
    handleUpdateNotes,
    handleDismiss,
    handleImport,
    handleUpdatePreferences,
    handleBulkAdd,
    handleToggleExclude,
    handleRespreadUpcoming,
    handleSetAllDue,
    handleClearAllData,
  } = useProblems({ user, showToast: ui.showToast });
  const leetcodeActivity = useLeetCodeActivity({ user, showToast: ui.showToast });

  // Views swap in place on tab change; reset the shared window scroll so each
  // tab opens at the top. "instant" overrides the global smooth scroll-behavior.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [ui.activeTab]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reviewLog = useMemo(() => loadReviewLog(), [reviewCount]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reviewEvents = useMemo(() => loadReviewEvents(), [reviewCount]);
  const leetcodePendingImports = useLeetCodePendingImports({
    user,
    problems,
    reviewEvents,
    submissions: leetcodeActivity.submissions,
    ignoredImports: leetcodeActivity.ignoredImports,
    loading: leetcodeActivity.loading,
    onCreateProblem: handleCreateProblemFromLeetCodeImport,
    showToast: ui.showToast,
    refreshLeetCodeActivity: leetcodeActivity.refresh,
  });

  const existingProblemNumbers = useMemo(
    () => new Set(problems.map((p) => p.leetcodeNumber).filter((n): n is number => Boolean(n))),
    [problems],
  );

  // Never-reviewed problems scheduled beyond today — the imports the daily
  // goal paced. Drives the Settings reschedule affordance; pace is display-only.
  // Null when a re-spread would be a no-op, so the affordance can't re-arm on
  // an already-goal-paced schedule.
  const upcomingScheduleInfo = useMemo(() => {
    const today = todayStr();
    const upcoming = problems.filter(
      (p) => p.lastReviewed === null && !p.excludeFromReview && p.nextReviewDate > today,
    );
    if (upcoming.length === 0) return null;
    const { changedCount } = respreadScheduledProblems(problems, {
      dailyGoal: preferences.dailyReviewGoal,
      today,
      now: "1970-01-01T00:00:00.000Z",
    });
    if (changedCount === 0) return null;
    const distinctDays = new Set(upcoming.map((p) => p.nextReviewDate)).size;
    return { count: upcoming.length, currentPace: Math.ceil(upcoming.length / distinctDays) };
  }, [problems, preferences.dailyReviewGoal]);

  const handleRateLeetCodeReview = useCallback(async (
    submissionDbId: string,
    problemId: string,
    confidence: Parameters<typeof handleReview>[1],
    completionSource?: LeetCodeCompletionIdentity,
  ) => {
    await rateLeetCodeReviewLocallyFirst({
      submissionDbId,
      problemId,
      confidence,
      completionSource,
      onReview: handleReview,
      markRated: leetcodeActivity.markRated,
      onLocalReviewRecorded: leetcodePendingImports.recordRatedCompletion,
      onError: (error) => {
        console.warn("LeetCode submission marked locally reviewed, but remote rated status failed:", error);
      },
    });
  }, [handleReview, leetcodeActivity, leetcodePendingImports.recordRatedCompletion]);

  // Settings surfaces sync errors inline; the header button reports via toast.
  const handleHeaderLeetCodeSync = useCallback(async () => {
    const result = await leetcodeActivity.syncNow();
    if (result.error) ui.showToast(result.error, undefined, "error");
  }, [leetcodeActivity, ui]);

  const hasLeetCodeActivityState =
    Boolean(leetcodeActivity.connection) ||
    leetcodeActivity.submissions.length > 0 ||
    leetcodeActivity.ignoredImports.length > 0;
  const showLeetCodeIntro =
    !ui.v2LeetCodeIntroDismissed &&
    !leetcodeActivity.loading &&
    !leetcodeActivity.connection;

  const handleConfirmClearAllData = useCallback(async () => {
    if (user && hasLeetCodeActivityState) {
      const result = await leetcodeActivity.disconnect();
      if (result.error) {
        ui.showToast(result.error, undefined, "error");
        return;
      }
    }

    await handleClearAllData();
    if (user) {
      // Await so a reload right after the dialog closes can't catch the
      // session still stored — signed-in-with-empty-data is a confusing state.
      try {
        await signOut();
      } catch (err) {
        console.warn("Sign-out after clear-all failed:", err);
      }
    }
    ui.setClearDataConfirm(false);
  }, [handleClearAllData, hasLeetCodeActivityState, leetcodeActivity, signOut, ui, user]);

  return (
    <div className="min-h-screen bg-pb-bg pb-[70px]">
      <Toast
        message={ui.toast.message}
        isVisible={ui.toast.visible}
        onDone={ui.hideToast}
        action={ui.toast.action}
        variant={ui.toast.variant}
      />
      <ConfirmDialog
        isOpen={!!ui.deleteTarget}
        title={`Delete ${ui.deleteTarget?.title || "problem"}?`}
        message="This cannot be undone."
        onConfirm={() => {
          handleDeleteConfirm(ui.deleteTarget);
          ui.setDeleteTarget(null);
        }}
        onCancel={() => ui.setDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={ui.clearDataConfirm}
        title="Clear all data?"
        message="This will permanently delete all problems, review history, streak data, and LeetCode Activity connection, submissions, and ignored imports. You will be signed out. If you use PatternBank on another device, clear your data there too."
        confirmLabel="Clear Everything"
        onConfirm={handleConfirmClearAllData}
        onCancel={() => ui.setClearDataConfirm(false)}
      />
      <ConfirmDialog
        isOpen={ui.respreadConfirm}
        title="Reschedule upcoming problems?"
        message={`This will re-pace ${upcomingScheduleInfo?.count ?? 0} upcoming problem${(upcomingScheduleInfo?.count ?? 0) !== 1 ? "s" : ""} at ${preferences.dailyReviewGoal} per day, starting today.`}
        confirmLabel="Reschedule"
        destructive={false}
        onConfirm={() => {
          handleRespreadUpcoming();
          ui.setRespreadConfirm(false);
        }}
        onCancel={() => ui.setRespreadConfirm(false)}
      />
      <SettingsModal
        isOpen={ui.settingsOpen}
        // While the respread ConfirmDialog is stacked on top, Escape/backdrop
        // must close only the dialog — both register document-level listeners.
        onClose={() => { if (!ui.respreadConfirm) ui.setSettingsOpen(false); }}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        onExport={exportData}
        onImport={handleImport}
        onBulkAdd={handleBulkAdd}
        problemCount={problems.length}
        existingProblemNumbers={existingProblemNumbers}
        user={user}
        leetcodeActivity={leetcodeActivity}
        onSignInGoogle={signInWithGoogle}
        onSignInGitHub={signInWithGitHub}
        onSignInApple={signInWithApple}
        onSignOut={signOut}
        onSetAllDue={() => { handleSetAllDue(); ui.setSettingsOpen(false); }}
        onRequestClearData={ui.requestClearData}
        upcomingScheduleInfo={upcomingScheduleInfo}
        onRequestRespread={() => ui.setRespreadConfirm(true)}
      />
      <HelpModal
        isOpen={ui.helpOpen}
        onClose={() => ui.setHelpOpen(false)}
      />
      <Header
        onSettingsClick={() => ui.setSettingsOpen(true)}
        onHelpClick={() => ui.setHelpOpen(true)}
        syncStatus={syncStatus}
        leetcodeSync={
          user && leetcodeActivity.connection
            ? {
                syncing: leetcodeActivity.actionLoading,
                lastSyncedAt: leetcodeActivity.connection.lastSyncedAt ?? null,
                onSyncNow: () => { void handleHeaderLeetCodeSync(); },
              }
            : undefined
        }
      />

      {ui.activeTab === "dashboard" && (
        <TodayView
          problems={problems}
          reviewEvents={reviewEvents}
          dailyGoal={preferences.dailyReviewGoal}
          hidePatterns={preferences.hidePatternsDuringReview}
          onReview={handleReview}
          onDismiss={handleDismiss}
          onUpdateNotes={handleUpdateNotes}
          onViewAllDue={ui.handleViewAllDue}
          onAddClick={ui.openAddModal}
          onBulkAdd={handleBulkAdd}
          existingProblemNumbers={existingProblemNumbers}
          pendingLeetCodeImports={leetcodePendingImports.pendingImports}
          todayLeetCodeItems={leetcodePendingImports.todayLeetCodeItems}
          onConfirmLeetCodeImport={leetcodePendingImports.confirmImport}
          onIgnoreLeetCodeImport={leetcodePendingImports.ignoreImport}
          leetcodeSubmissions={leetcodePendingImports.leetcodeSubmissionsForTodayFeed}
          onRateLeetCodeReview={handleRateLeetCodeReview}
          showLeetCodeIntro={showLeetCodeIntro}
          leetcodeIntroSignedIn={Boolean(user)}
          onOpenLeetCodeSettings={() => ui.setSettingsOpen(true)}
          onDismissLeetCodeIntro={ui.dismissV2LeetCodeIntro}
          onEditProblem={ui.handleEdit}
        />
      )}
      {ui.activeTab === "progress" && (
        <ProgressView
          problems={problems}
          reviewLog={reviewLog}
          reviewEvents={reviewEvents}
          enabledExtraPatterns={preferences.enabledExtraPatterns}
          onPatternClick={ui.handlePatternClick}
        />
      )}
      {ui.activeTab === "problems" && (
        <AllProblemsView
          problems={problems}
          onEdit={ui.handleEdit}
          onDelete={ui.handleDeleteRequest}
          onToggleExclude={handleToggleExclude}
          initialSort={ui.problemsInitialSort}
          initialPatternFilter={ui.problemsInitialPatternFilter}
          enabledExtraPatterns={preferences.enabledExtraPatterns}
          onAddClick={ui.openAddModal}
          onSortChange={ui.handleProblemsSortChange}
        />
      )}

      <NavBar
        activeTab={ui.activeTab}
        onTabChange={ui.handleTabChange}
      />
      <ProblemModal
        isOpen={ui.modalOpen}
        onClose={ui.closeModal}
        onSave={(problem, confidenceChanged) => {
          handleSaveProblem(problem, confidenceChanged);
          ui.closeModal();
        }}
        initialData={ui.editingProblem}
        existingProblemNumbers={existingProblemNumbers}
        enabledExtraPatterns={preferences.enabledExtraPatterns}
      />
    </div>
  );
}
