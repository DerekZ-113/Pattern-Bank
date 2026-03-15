import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { todayStr, addDays } from "../utils/dateHelpers";
import { getIntervalDays } from "../utils/spacedRepetition";
import {
  loadProblems,
  saveProblems,
  saveReviewLog,
  logReviewToday,
  importData,
} from "../utils/storage";
import usePreferences from "./usePreferences";
import useCloudSync from "./useCloudSync";
import {
  filterExistingProblems,
  interleaveByDifficulty,
  buildNewProblems,
  mergeImportedProblems,
  computeReviewProgress,
  buildReviewedProblem,
} from "../utils/problemTransforms";
import {
  pushProblemToCloud,
  pushProblemsToCloud,
  deleteProblemFromCloud,
  pushReviewToCloud,
  deduplicateProblems,
  clearAllCloudData,
} from "../utils/sync";
import posthog from "posthog-js";
import type { Problem, Preferences, SyncStatus, Confidence, LeetCodeProblem } from "../types";
import type { SyncResult } from "../utils/sync";

interface UseProblemsParams {
  user: User | null;
  showToast: (msg: string) => void;
}

interface UseProblemsReturn {
  problems: Problem[];
  preferences: Preferences;
  syncStatus: SyncStatus;
  handleSaveProblem: (problem: Problem, confidenceChanged?: boolean) => void;
  handleDeleteConfirm: (deleteTarget: Problem | null) => void;
  handleReview: (problemId: string, newConfidence: Confidence) => void;
  handleUpdateNotes: (problemId: string, newNotes: string) => void;
  handleDismiss: (problemId: string) => void;
  handleImport: (file: File) => Promise<void>;
  handleUpdatePreferences: (updates: Partial<Preferences>) => void;
  handleBulkAdd: (lcProblems: LeetCodeProblem[], patternMap?: Map<number, string[]> | null) => void;
  handleToggleExclude: (problemId: string) => void;
  handleClearAllData: () => void;
}

export default function useProblems({ user, showToast }: UseProblemsParams): UseProblemsReturn {
  const { preferences, handleUpdatePreferences, replacePreferences } = usePreferences({ user });

  const [problems, setProblems] = useState(() => {
    const loaded = loadProblems();
    const { problems: deduped, removedIds } = deduplicateProblems(loaded);
    if (removedIds.length > 0) {
      saveProblems(deduped);
    }
    return deduped;
  });
  // Persist to localStorage on change
  useEffect(() => { saveProblems(problems); }, [problems]);

  // Sync with Supabase on sign-in
  const handleSyncComplete = useCallback((result: SyncResult) => {
    setProblems(result.problems);
    saveReviewLog(result.reviewLog);
    replacePreferences(result.preferences);
  }, [replacePreferences]);

  const { syncStatus } = useCloudSync({
    user, problems, preferences, showToast,
    onSyncComplete: handleSyncComplete,
  });

  const handleSaveProblem = useCallback((problem: Problem, confidenceChanged?: boolean) => {
    type SaveAction = "updated" | "added" | "duplicate";
    let action = "added" as SaveAction;

    setProblems((prev) => {
      const idx = prev.findIndex((p) => p.id === problem.id);
      if (idx >= 0) {
        action = "updated";
        const updated = [...prev];
        updated[idx] = problem;
        return updated;
      }
      if (problem.leetcodeNumber) {
        const duplicate = prev.find((p) => p.leetcodeNumber === problem.leetcodeNumber);
        if (duplicate) {
          action = "duplicate";
          return prev;
        }
      }
      return [...prev, problem];
    });

    if (action === "duplicate") {
      showToast(`Problem #${problem.leetcodeNumber} already in your library`);
      return;
    }
    if (action === "updated") {
      showToast("Problem updated");
      posthog.capture("problem_edited", { confidence_changed: !!confidenceChanged, platform: "web" });
    } else {
      showToast("Problem added");
      posthog.capture("problem_added", { difficulty: problem.difficulty, pattern_count: problem.patterns.length, platform: "web" });
    }
    if (confidenceChanged) logReviewToday();
    if (user) pushProblemToCloud(user.id, problem);
  }, [showToast, user]);

  const handleDeleteConfirm = useCallback((deleteTarget: Problem | null) => {
    if (deleteTarget) {
      setProblems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`Deleted ${deleteTarget.title}`);
      posthog.capture("problem_deleted", { platform: "web" });
      if (user) deleteProblemFromCloud(deleteTarget.id);
    }
  }, [showToast, user]);

  const handleReview = useCallback(
    (problemId: string, newConfidence: Confidence) => {
      const { currentReviewed, effectiveGoal } = computeReviewProgress(problems, preferences.dailyReviewGoal);
      const original = problems.find((p) => p.id === problemId);
      const updatedProblem = original ? buildReviewedProblem(original, newConfidence) : null;

      setProblems((prev) =>
        prev.map((p) => (p.id === problemId ? buildReviewedProblem(p, newConfidence) : p))
      );
      logReviewToday();
      posthog.capture("problem_reviewed", { old_confidence: original?.confidence, new_confidence: newConfidence, platform: "web" });

      if (user && updatedProblem && original) {
        pushProblemToCloud(user.id, updatedProblem);
        pushReviewToCloud(user.id, problemId, original.confidence, newConfidence);
      }

      const intervalDays = getIntervalDays(newConfidence);
      const newReviewedCount = currentReviewed + 1;
      const progress = `${newReviewedCount} of ${effectiveGoal} done`;
      const interval = `Next review in ${intervalDays} day${intervalDays !== 1 ? "s" : ""}`;
      showToast(`${progress} · ${interval}`);
    },
    [showToast, problems, preferences.dailyReviewGoal, user]
  );

  const handleUpdateNotes = useCallback((problemId: string, newNotes: string) => {
    const now = new Date().toISOString();
    const problem = problems.find((p) => p.id === problemId);
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId ? { ...p, notes: newNotes.trim(), updatedAt: now } : p
      )
    );
    if (user && problem) {
      pushProblemToCloud(user.id, { ...problem, notes: newNotes.trim(), updatedAt: now });
    }
  }, [user, problems]);

  const handleDismiss = useCallback((problemId: string) => {
    const tomorrow = addDays(todayStr(), 1);
    const now = new Date().toISOString();
    const problem = problems.find((p) => p.id === problemId);
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId
          ? { ...p, nextReviewDate: tomorrow, updatedAt: now }
          : p
      )
    );
    posthog.capture("problem_dismissed", { platform: "web" });
    if (user && problem) {
      pushProblemToCloud(user.id, { ...problem, nextReviewDate: tomorrow, updatedAt: now });
    }
  }, [user, problems]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const data = await importData(file);
        const { mergedProblems, addedCount, updatedCount } = mergeImportedProblems(problems, data.problems);
        setProblems(mergedProblems);
        if (data.reviewLog) {
          saveReviewLog(data.reviewLog);
        }
        if (user) {
          pushProblemsToCloud(user.id, data.problems);
        }
        posthog.capture("data_imported", { added: addedCount, updated: updatedCount, platform: "web" });
        showToast(`Imported ${addedCount} new, ${updatedCount} updated`);
      } catch (err) {
        showToast((err as Error).message || "Import failed");
      }
    },
    [problems, showToast, user]
  );

  const handleBulkAdd = useCallback((lcProblems: LeetCodeProblem[], patternMap: Map<number, string[]> | null = null) => {
    const { newProblems: newLc, skippedCount } = filterExistingProblems(lcProblems, problems);
    if (newLc.length === 0) {
      showToast("All problems already in your library");
      return;
    }

    const interleaved = interleaveByDifficulty(newLc);
    const built = buildNewProblems(interleaved, {
      today: todayStr(),
      now: new Date().toISOString(),
      dailyGoal: preferences.dailyReviewGoal,
      patternMap,
    });

    setProblems((prev) => [...prev, ...built]);

    if (user) {
      pushProblemsToCloud(user.id, built);
    }

    const msg = skippedCount > 0
      ? `Added ${newLc.length} problems (${skippedCount} already existed)`
      : `Added ${newLc.length} problems`;
    posthog.capture("bulk_import", { count: newLc.length, had_pattern_map: !!patternMap, platform: "web" });
    showToast(msg);
  }, [problems, preferences.dailyReviewGoal, user, showToast]);

  const handleToggleExclude = useCallback((problemId: string) => {
    const now = new Date().toISOString();
    const problem = problems.find((p) => p.id === problemId);
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId
          ? { ...p, excludeFromReview: !p.excludeFromReview, updatedAt: now }
          : p
      )
    );
    if (user && problem) {
      pushProblemToCloud(user.id, { ...problem, excludeFromReview: !problem.excludeFromReview, updatedAt: now });
    }
  }, [user, problems]);

  const handleClearAllData = useCallback(() => {
    setProblems([]);
    saveReviewLog([]);
    if (user) clearAllCloudData(user.id);
    showToast("All data cleared");
  }, [showToast, user]);

  return {
    problems,
    preferences,
    syncStatus,
    handleSaveProblem,
    handleDeleteConfirm,
    handleReview,
    handleUpdateNotes,
    handleDismiss,
    handleImport,
    handleUpdatePreferences,
    handleBulkAdd,
    handleToggleExclude,
    handleClearAllData,
  };
}
