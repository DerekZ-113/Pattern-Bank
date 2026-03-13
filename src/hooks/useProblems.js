import { useState, useEffect, useCallback, useRef } from "react";
import { todayStr, addDays, generateId } from "../utils/dateHelpers";
import { getIntervalDays } from "../utils/spacedRepetition";
import { buildLeetCodeUrl } from "../utils/leetcodeProblems";
import {
  loadProblems,
  saveProblems,
  loadPreferences,
  savePreferences,
  loadReviewLog,
  saveReviewLog,
  logReviewToday,
  countReviewedToday,
  importData,
} from "../utils/storage";
import {
  syncOnSignIn,
  pushProblemToCloud,
  pushProblemsToCloud,
  deleteProblemFromCloud,
  pushReviewToCloud,
  pushPreferencesToCloud,
} from "../utils/sync";
import posthog from "posthog-js";

export default function useProblems({ user, showToast }) {
  const [problems, setProblems] = useState(() => loadProblems());
  const [preferences, setPreferences] = useState(() => loadPreferences());
  const [syncStatus, setSyncStatus] = useState("idle");

  // Persist to localStorage on change
  useEffect(() => { saveProblems(problems); }, [problems]);
  useEffect(() => { savePreferences(preferences); }, [preferences]);

  // Sync with Supabase on sign-in
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
    if (user) pushProblemToCloud(user.id, problem);
  }, [showToast, user]);

  const handleDeleteConfirm = useCallback((deleteTarget) => {
    if (deleteTarget) {
      setProblems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`Deleted ${deleteTarget.title}`);
      posthog.capture("problem_deleted", { platform: "web" });
      if (user) deleteProblemFromCloud(deleteTarget.id);
    }
  }, [showToast, user]);

  const handleReview = useCallback(
    (problemId, newConfidence) => {
      const today = todayStr();
      const intervalDays = getIntervalDays(newConfidence);

      const currentReviewed = countReviewedToday(problems);
      const totalDue = problems.filter((p) => p.nextReviewDate <= today).length;
      const effectiveGoal = Math.min(
        preferences.dailyReviewGoal,
        totalDue + currentReviewed
      );
      const newReviewedCount = currentReviewed + 1;

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
        if (user) {
          pushProblemsToCloud(user.id, data.problems);
        }
        posthog.capture("data_imported", { added, updated, platform: "web" });
        showToast(`Imported ${added} new, ${updated} updated`);
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

  const handleBulkAdd = useCallback((lcProblems, patternMap = null) => {
    const today = todayStr();
    const now = new Date().toISOString();
    const dailyGoal = preferences.dailyReviewGoal;

    const existingNums = new Set(problems.map((p) => p.leetcodeNumber).filter(Boolean));
    const newLc = lcProblems.filter((lc) => !existingNums.has(lc.n));
    if (newLc.length === 0) {
      showToast("All problems already in your library");
      return;
    }

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

    if (user) {
      pushProblemsToCloud(user.id, newProblems);
    }

    const skipped = lcProblems.length - newLc.length;
    const msg = skipped > 0
      ? `Added ${newLc.length} problems (${skipped} already existed)`
      : `Added ${newLc.length} problems`;
    posthog.capture("bulk_import", { count: newLc.length, had_pattern_map: !!patternMap, platform: "web" });
    showToast(msg);
  }, [problems, preferences.dailyReviewGoal, user, showToast]);

  const handleClearAllData = useCallback(() => {
    setProblems([]);
    saveReviewLog([]);
    showToast("All data cleared");
  }, [showToast]);

  return {
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
    handleClearAllData,
  };
}
