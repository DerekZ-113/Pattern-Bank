import { useCallback, useMemo } from "react";
import { exportData, loadReviewLog, loadReviewEvents } from "./utils/storage";
import { rateLeetCodeReviewLocallyFirst } from "./utils/leetcodeReviewActions";

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
    handleSetAllDue,
    handleClearAllData,
  } = useProblems({ user, showToast: ui.showToast });
  const leetcodeActivity = useLeetCodeActivity({ user, showToast: ui.showToast });
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

  const handleRateLeetCodeReview = useCallback(async (
    submissionDbId: string,
    problemId: string,
    confidence: Parameters<typeof handleReview>[1],
  ) => {
    await rateLeetCodeReviewLocallyFirst({
      submissionDbId,
      problemId,
      confidence,
      onReview: handleReview,
      markRated: leetcodeActivity.markRated,
      onError: (error) => {
        console.warn("LeetCode submission marked locally reviewed, but remote rated status failed:", error);
      },
    });
  }, [handleReview, leetcodeActivity]);

  const hasLeetCodeActivityState =
    Boolean(leetcodeActivity.connection) ||
    leetcodeActivity.submissions.length > 0 ||
    leetcodeActivity.ignoredImports.length > 0;

  const handleConfirmClearAllData = useCallback(async () => {
    if (user && hasLeetCodeActivityState) {
      const result = await leetcodeActivity.disconnect();
      if (result.error) {
        ui.showToast(result.error, undefined, "error");
        return;
      }
    }

    await handleClearAllData();
    if (user) signOut();
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
      <SettingsModal
        isOpen={ui.settingsOpen}
        onClose={() => ui.setSettingsOpen(false)}
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
      />
      <HelpModal
        isOpen={ui.helpOpen}
        onClose={() => ui.setHelpOpen(false)}
      />
      <Header
        onSettingsClick={() => ui.setSettingsOpen(true)}
        onHelpClick={() => ui.setHelpOpen(true)}
        syncStatus={syncStatus}
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
          leetcodeSubmissions={leetcodeActivity.submissions}
          onRateLeetCodeReview={handleRateLeetCodeReview}
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
