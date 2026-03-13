import { exportData } from "./utils/storage";

import useAuth from "./hooks/useAuth";
import useUI from "./hooks/useUI";
import useProblems from "./hooks/useProblems";

import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import Header from "./components/Header";
import NavBar from "./components/NavBar";
import ProblemModal from "./components/ProblemModal";
import DashboardView from "./components/DashboardView";
import AllProblemsView from "./components/AllProblemsView";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  const { user, signInWithGoogle, signInWithGitHub, signInWithApple, signOut } = useAuth();
  const ui = useUI();

  const {
    problems,
    preferences,
    syncStatus,
    handleSaveProblem,
    handleDeleteConfirm,
    handleReview,
    handleUpdateNotes,
    handleDismiss,
    handleSetAllDue,
    handleImport,
    handleUpdatePreferences,
    handleBulkAdd,
    handleToggleExclude,
    handleClearAllData,
  } = useProblems({ user, showToast: ui.showToast });

  return (
    <div className="min-h-screen bg-pb-bg pb-[70px]">
      <Toast
        message={ui.toast.message}
        isVisible={ui.toast.visible}
        onDone={ui.hideToast}
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
        message="This will permanently delete all problems, review history, and streak data. This cannot be undone."
        confirmLabel="Clear Everything"
        onConfirm={() => {
          handleClearAllData();
          ui.setClearDataConfirm(false);
        }}
        onCancel={() => ui.setClearDataConfirm(false)}
      />
      <SettingsModal
        isOpen={ui.settingsOpen}
        onClose={() => ui.setSettingsOpen(false)}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        onExport={exportData}
        onImport={handleImport}
        onSetAllDue={handleSetAllDue}
        onClearAllData={ui.requestClearData}
        onBulkAdd={handleBulkAdd}
        problemCount={problems.length}
        existingProblemNumbers={new Set(problems.map((p) => p.leetcodeNumber).filter(Boolean))}
        user={user}
        onSignInGoogle={signInWithGoogle}
        onSignInGitHub={signInWithGitHub}
        onSignInApple={signInWithApple}
        onSignOut={signOut}
      />
      <Header
        onSettingsClick={() => ui.setSettingsOpen(true)}
        syncStatus={syncStatus}
      />

      {ui.activeTab === "dashboard" && (
        <DashboardView
          problems={problems}
          dailyGoal={preferences.dailyReviewGoal}
          onReview={handleReview}
          onDismiss={handleDismiss}
          onUpdateNotes={handleUpdateNotes}
          onViewAllDue={ui.handleViewAllDue}
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
        />
      )}

      <NavBar
        activeTab={ui.activeTab}
        onTabChange={ui.handleTabChange}
        onAddClick={ui.openAddModal}
      />
      <ProblemModal
        isOpen={ui.modalOpen}
        onClose={ui.closeModal}
        onSave={(problem, confidenceChanged) => {
          handleSaveProblem(problem, confidenceChanged);
          ui.closeModal();
        }}
        initialData={ui.editingProblem}
        existingProblemNumbers={new Set(problems.map((p) => p.leetcodeNumber).filter(Boolean))}
      />
    </div>
  );
}
