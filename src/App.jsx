import { useState, useEffect, useCallback, useRef } from "react";
import { STORAGE_KEY } from "./utils/constants";
import { todayStr, addDays, generateId } from "./utils/dateHelpers";
import { getIntervalDays } from "./utils/spacedRepetition";
import { buildLeetCodeUrl } from "./utils/leetcodeProblems";
import {
  loadProblems,
  saveProblems,
  loadPreferences,
  savePreferences,
  loadReviewLog,
  logReviewToday,
  exportData,
  importData,
  saveReviewLog,
  countReviewedToday,
} from "./utils/storage";
import {
  syncOnSignIn,
  pushProblemToCloud,
  deleteProblemFromCloud,
  pushReviewToCloud,
  pushPreferencesToCloud,
} from "./utils/sync";

import posthog from "posthog-js";
import useAuth from "./hooks/useAuth";
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

  // Initialize directly from localStorage — no race condition
  const [problems, setProblems] = useState(() => loadProblems());
  const [preferences, setPreferences] = useState(() => loadPreferences());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [problemsInitialSort, setProblemsInitialSort] = useState("dateAdded");
  const [problemsInitialPatternFilter, setProblemsInitialPatternFilter] = useState("all");
  const [clearDataConfirm, setClearDataConfirm] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced | error

  // Save problems to localStorage whenever they change
  useEffect(() => {
    saveProblems(problems);
  }, [problems]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  // Sync with Supabase when user signs in
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (!user) {
      hasSyncedRef.current = false;
      setSyncStatus("idle");
      return;
    }
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    setSyncStatus("syncing");

    syncOnSignIn(user.id, problems, loadReviewLog(), preferences).then(
      (result) => {
        if (result.error) {
          setSyncStatus("error");
          showToast("Sync failed — working offline");
          return;
        }
        setProblems(result.problems);
        saveReviewLog(result.reviewLog);
        setPreferences(result.preferences);
        setSyncStatus("synced");
        if (result.problems.length > 0) {
          showToast("Data synced");
        }
      }
    );
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  // Deps intentionally limited to `user` — we only sync on sign-in transition,
  // not on every problems/preferences change.

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
        posthog.capture("problem_edited", { confidence_changed: !!confidenceChanged, platform: "web" });
        return updated;
      }
      showToast("Problem added");
      posthog.capture("problem_added", { difficulty: problem.difficulty, pattern_count: problem.patterns.length, platform: "web" });
      return [...prev, problem];
    });
    if (confidenceChanged) logReviewToday();
    setEditingProblem(null);
    if (user) pushProblemToCloud(user.id, problem);
  }, [showToast, user]);

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
      posthog.capture("problem_deleted", { platform: "web" });
      if (user) deleteProblemFromCloud(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, showToast, user]);

  const handleReview = useCallback(
    (problemId, newConfidence) => {
      const today = todayStr();
      const intervalDays = getIntervalDays(newConfidence);

      // Compute progress BEFORE setProblems (state hasn't changed yet)
      const currentReviewed = countReviewedToday(problems);
      const totalDue = problems.filter((p) => p.nextReviewDate <= today).length;
      const effectiveGoal = Math.min(
        preferences.dailyReviewGoal,
        totalDue + currentReviewed
      );
      const newReviewedCount = currentReviewed + 1;

      // Find the problem and compute updated version for cloud push
      const original = problems.find((p) => p.id === problemId);
      const now = new Date().toISOString();
      const updatedProblem = original
        ? { ...original, confidence: newConfidence, lastReviewed: today, nextReviewDate: addDays(today, intervalDays), updatedAt: now }
        : null;

      setProblems((prev) =>
        prev.map((p) => (p.id === problemId ? { ...p, confidence: newConfidence, lastReviewed: today, nextReviewDate: addDays(today, intervalDays), updatedAt: now } : p))
      );
      logReviewToday();
      posthog.capture("problem_reviewed", { old_confidence: original?.confidence, new_confidence: newConfidence, platform: "web" });

      if (user && updatedProblem) {
        pushProblemToCloud(user.id, updatedProblem);
        pushReviewToCloud(user.id, problemId, original.confidence, newConfidence);
      }

      const progress = `${newReviewedCount} of ${effectiveGoal} done`;
      const interval = `Next review in ${intervalDays} day${intervalDays !== 1 ? "s" : ""}`;
      showToast(`${progress} · ${interval}`);
    },
    [showToast, problems, preferences.dailyReviewGoal, user]
  );

  const handleUpdateNotes = useCallback((problemId, newNotes) => {
    const now = new Date().toISOString();
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId ? { ...p, notes: newNotes.trim(), updatedAt: now } : p
      )
    );
    if (user) {
      const problem = problems.find((p) => p.id === problemId);
      if (problem) pushProblemToCloud(user.id, { ...problem, notes: newNotes.trim(), updatedAt: now });
    }
  }, [user, problems]);

  const handleDismiss = useCallback((problemId) => {
    const tomorrow = addDays(todayStr(), 1);
    const now = new Date().toISOString();
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId
          ? { ...p, nextReviewDate: tomorrow, updatedAt: now }
          : p
      )
    );
    posthog.capture("problem_dismissed", { platform: "web" });
    if (user) {
      const problem = problems.find((p) => p.id === problemId);
      if (problem) pushProblemToCloud(user.id, { ...problem, nextReviewDate: tomorrow, updatedAt: now });
    }
  }, [user, problems]);

  const handleSetAllDue = useCallback(() => {
    const today = todayStr();
    const now = new Date().toISOString();
    setProblems((prev) =>
      prev.map((p) => ({ ...p, nextReviewDate: today, lastReviewed: null, updatedAt: now }))
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
        const mergedProblems = Array.from(existing.values());
        setProblems(mergedProblems);
        if (data.reviewLog) {
          saveReviewLog(data.reviewLog);
        }
        // Push imported problems to cloud
        if (user) {
          for (const p of data.problems) {
            pushProblemToCloud(user.id, p);
          }
        }
        posthog.capture("data_imported", { added, updated, platform: "web" });
        showToast(
          `Imported ${added} new, ${updated} updated`
        );
      } catch (err) {
        showToast(err.message || "Import failed");
      }
    },
    [problems, showToast, user]
  );

  const handleUpdatePreferences = useCallback((updates) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      if (user) pushPreferencesToCloud(user.id, next);
      return next;
    });
  }, [user]);

  const handleClearAllData = useCallback(() => {
    // Close settings, open confirmation
    setSettingsOpen(false);
    setClearDataConfirm(true);
  }, []);

  const handleClearAllDataConfirm = useCallback(() => {
    setProblems([]);
    saveReviewLog([]);
    setClearDataConfirm(false);
    showToast("All data cleared");
  }, [showToast]);

  const handleBulkAdd = useCallback((lcProblems, patternMap = null) => {
    const today = todayStr();
    const now = new Date().toISOString();
    const dailyGoal = preferences.dailyReviewGoal;

    // Check which are already in library by leetcode number
    const existingNums = new Set(problems.map((p) => p.leetcodeNumber).filter(Boolean));
    const newLc = lcProblems.filter((lc) => !existingNums.has(lc.n));
    if (newLc.length === 0) {
      showToast("All problems already in your library");
      return;
    }

    // Round-robin by difficulty to maximize variety per day
    // (no pattern tags on bulk-add, so spread by difficulty as proxy)
    const buckets = { Easy: [], Medium: [], Hard: [] };
    newLc.forEach((lc) => {
      const bucket = buckets[lc.d] || buckets.Medium;
      bucket.push(lc);
    });
    const interleaved = [];
    const keys = Object.keys(buckets).filter((k) => buckets[k].length > 0);
    let exhausted = false;
    while (!exhausted) {
      exhausted = true;
      for (const key of keys) {
        if (buckets[key].length > 0) {
          interleaved.push(buckets[key].shift());
          exhausted = false;
        }
      }
    }

    // Stagger review dates based on daily goal
    const newProblems = interleaved.map((lc, i) => ({
      id: generateId(),
      title: lc.t,
      leetcodeNumber: lc.n,
      url: buildLeetCodeUrl(lc.s),
      difficulty: lc.d,
      patterns: patternMap?.get(lc.n) || [],
      confidence: 1,
      notes: "",
      dateAdded: today,
      lastReviewed: null,
      nextReviewDate: addDays(today, Math.floor(i / dailyGoal)),
      updatedAt: now,
    }));

    setProblems((prev) => [...prev, ...newProblems]);

    // Push to cloud
    if (user) {
      for (const p of newProblems) {
        pushProblemToCloud(user.id, p);
      }
    }

    const skipped = lcProblems.length - newLc.length;
    const msg = skipped > 0
      ? `Added ${newLc.length} problems (${skipped} already existed)`
      : `Added ${newLc.length} problems`;
    posthog.capture("bulk_import", { count: newLc.length, had_pattern_map: !!patternMap, platform: "web" });
    showToast(msg);
  }, [problems, preferences.dailyReviewGoal, user, showToast]);

  const handleViewAllDue = useCallback(() => {
    setProblemsInitialSort("nextReview");
    setProblemsInitialPatternFilter("all");
    setActiveTab("problems");
  }, []);

  const handlePatternClick = useCallback((pattern) => {
    setProblemsInitialPatternFilter(pattern);
    setProblemsInitialSort("dateAdded");
    setActiveTab("problems");
  }, []);

  const handleTabChange = useCallback((tab) => {
    setProblemsInitialSort("dateAdded");
    setProblemsInitialPatternFilter("all");
    setActiveTab(tab);
  }, []);

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
      <ConfirmDialog
        isOpen={clearDataConfirm}
        title="Clear all data?"
        message="This will permanently delete all problems, review history, and streak data. This cannot be undone."
        confirmLabel="Clear Everything"
        onConfirm={handleClearAllDataConfirm}
        onCancel={() => setClearDataConfirm(false)}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        onExport={exportData}
        onImport={handleImport}
        onSetAllDue={handleSetAllDue}
        onClearAllData={handleClearAllData}
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
        onSettingsClick={() => setSettingsOpen(true)}
        syncStatus={syncStatus}
      />

      {activeTab === "dashboard" && (
        <DashboardView
          problems={problems}
          dailyGoal={preferences.dailyReviewGoal}
          onReview={handleReview}
          onDismiss={handleDismiss}
          onUpdateNotes={handleUpdateNotes}
          onViewAllDue={handleViewAllDue}
          onPatternClick={handlePatternClick}
        />
      )}
      {activeTab === "problems" && (
        <AllProblemsView
          problems={problems}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          initialSort={problemsInitialSort}
          initialPatternFilter={problemsInitialPatternFilter}
        />
      )}

      <NavBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
