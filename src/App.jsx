import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEY } from "./utils/constants";
import { todayStr, addDays } from "./utils/dateHelpers";
import { getIntervalDays } from "./utils/spacedRepetition";
import {
  loadProblems,
  saveProblems,
  logReviewToday,
  exportData,
  importData,
  saveReviewLog,
} from "./utils/storage";

import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import Header from "./components/Header";
import NavBar from "./components/NavBar";
import ProblemModal from "./components/ProblemModal";
import DashboardView from "./components/DashboardView";
import AllProblemsView from "./components/AllProblemsView";

export default function App() {
  // Initialize directly from localStorage — no race condition
  const [problems, setProblems] = useState(() => loadProblems());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Save problems to localStorage whenever they change
  useEffect(() => {
    saveProblems(problems);
  }, [problems]);

  const showToast = useCallback(
    (msg) => setToast({ visible: true, message: msg }),
    []
  );

  const handleSaveProblem = useCallback((problem, confidenceChanged) => {
    setProblems((prev) => {
      const idx = prev.findIndex((p) => p.id === problem.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = problem;
        showToast("Problem updated");
        return updated;
      }
      showToast("Problem added");
      return [...prev, problem];
    });
    if (confidenceChanged) logReviewToday();
    setEditingProblem(null);
  }, [showToast]);

  const handleEdit = useCallback((problem) => {
    setEditingProblem(problem);
    setModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback(
    (problem) => setDeleteTarget(problem),
    []
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      setProblems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`Deleted ${deleteTarget.title}`);
      setDeleteTarget(null);
    }
  }, [deleteTarget, showToast]);

  const handleReview = useCallback(
    (problemId, newConfidence) => {
      const today = todayStr();
      const intervalDays = getIntervalDays(newConfidence);
      setProblems((prev) =>
        prev.map((p) =>
          p.id === problemId
            ? {
                ...p,
                confidence: newConfidence,
                lastReviewed: today,
                nextReviewDate: addDays(today, intervalDays),
              }
            : p
        )
      );
      logReviewToday();
      showToast(
        `Reviewed! Next review in ${intervalDays} day${intervalDays !== 1 ? "s" : ""}`
      );
    },
    [showToast]
  );

  const handleUpdateNotes = useCallback((problemId, newNotes) => {
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId ? { ...p, notes: newNotes.trim() } : p
      )
    );
  }, []);

  const handleDismiss = useCallback((problemId) => {
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId
          ? { ...p, nextReviewDate: addDays(todayStr(), 1) }
          : p
      )
    );
  }, []);

  const handleSetAllDue = useCallback(() => {
    const today = todayStr();
    setProblems((prev) => prev.map((p) => ({ ...p, nextReviewDate: today })));
  }, []);

  const handleRestoreDates = useCallback((snapshot) => {
    setProblems((prev) =>
      prev.map((p) => ({
        ...p,
        nextReviewDate: snapshot[p.id] || p.nextReviewDate,
      }))
    );
  }, []);

  const handleImport = useCallback(
    async (file) => {
      try {
        const data = await importData(file);
        const existing = new Map(problems.map((p) => [p.id, p]));
        let added = 0;
        let updated = 0;
        data.problems.forEach((p) => {
          if (existing.has(p.id)) {
            existing.set(p.id, p);
            updated++;
          } else {
            existing.set(p.id, p);
            added++;
          }
        });
        setProblems(Array.from(existing.values()));
        if (data.reviewLog) {
          saveReviewLog(data.reviewLog);
        }
        showToast(
          `Imported ${added} new, ${updated} updated`
        );
      } catch (err) {
        showToast(err.message || "Import failed");
      }
    },
    [problems, showToast]
  );

  const openAddModal = () => {
    setEditingProblem(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-pb-bg pb-[70px]">
      <Toast
        message={toast.message}
        isVisible={toast.visible}
        onDone={() => setToast({ visible: false, message: "" })}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.title || "problem"}?`}
        message="This cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
      <Header
        onAddClick={openAddModal}
        onExport={exportData}
        onImport={handleImport}
        problemCount={problems.length}
      />

      {activeTab === "dashboard" && (
        <DashboardView
          problems={problems}
          onReview={handleReview}
          onDismiss={handleDismiss}
          onUpdateNotes={handleUpdateNotes}
          onSetAllDue={handleSetAllDue}
          onRestoreDates={handleRestoreDates}
        />
      )}
      {activeTab === "problems" && (
        <AllProblemsView
          problems={problems}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      )}

      <NavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddClick={openAddModal}
      />
      <ProblemModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProblem(null);
        }}
        onSave={handleSaveProblem}
        initialData={editingProblem}
      />
    </div>
  );
}
