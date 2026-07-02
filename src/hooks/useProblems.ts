import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { todayStr, addDays } from "@patternbank/core";
import { getIntervalDays, getReviewIntervalDays } from "@patternbank/core";
import {
  loadProblems,
  saveProblems,
  loadReviewLog,
  saveReviewLog,
  logReviewToday,
  logReviewEvent,
  logOrReplaceReviewEvent,
  loadReviewEvents,
  saveReviewEvents,
  loadProblemTombstones,
  saveProblemTombstones,
  recordProblemTombstone,
  loadDataReset,
  saveDataReset,
  importData,
} from "../utils/storage";
import usePreferences from "./usePreferences";
import useCloudSync from "./useCloudSync";
import type { SyncCompleteContext } from "./useCloudSync";
import {
  filterExistingProblems,
  interleaveByDifficulty,
  buildNewProblems,
  mergeImportedProblems,
  computeReviewProgress,
  buildReviewedProblem,
} from "@patternbank/core";
import {
  pushProblemToCloud,
  pushProblemsToCloud,
  deleteProblemFromCloud,
  pushReviewToCloud,
  replaceReviewInCloud,
  pushReviewEventsToCloud,
  pushPreferencesToCloud,
  deduplicateProblems,
  mergeProblems,
  mergeReviewLog,
  mergeReviewEvents,
  mergeProblemTombstones,
  filterTombstonedProblems,
  filterTombstonesAfterDataReset,
  clearAllCloudData,
} from "../utils/sync";
import posthog from "posthog-js";
import type { DataReset, Problem, Preferences, SyncStatus, Confidence, LeetCodeProblem } from "../types";
import type { SyncResult } from "../utils/sync";

interface UseProblemsParams {
  user: User | null;
  showToast: (msg: string) => void;
}

interface UseProblemsReturn {
  problems: Problem[];
  preferences: Preferences;
  syncStatus: SyncStatus;
  reviewCount: number;
  handleSaveProblem: (problem: Problem, confidenceChanged?: boolean) => void;
  handleCreateProblemFromLeetCodeImport: (problem: Problem) => { status: "created" | "duplicate"; problem: Problem };
  handleDeleteConfirm: (deleteTarget: Problem | null) => void;
  handleReview: (problemId: string, newConfidence: Confidence, options?: { replaceSameDayReviewEvent?: boolean }) => void;
  handleUpdateNotes: (problemId: string, newNotes: string) => void;
  handleDismiss: (problemId: string) => void;
  handleImport: (file: File) => Promise<void>;
  handleUpdatePreferences: (updates: Partial<Preferences>) => void;
  handleBulkAdd: (lcProblems: LeetCodeProblem[], patternMap?: Map<number, string[]> | null) => void;
  handleToggleExclude: (problemId: string) => void;
  handleSetAllDue: () => void;
  handleClearAllData: () => Promise<void>;
}

function dataResetTime(reset: DataReset | null | undefined): number {
  if (!reset) return 0;
  const ms = new Date(reset.resetAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function newerDataReset(a: DataReset | null, b: DataReset | null): DataReset | null {
  return dataResetTime(a) >= dataResetTime(b) ? a : b;
}

export default function useProblems({ user, showToast }: UseProblemsParams): UseProblemsReturn {
  const {
    preferences,
    handleUpdatePreferences,
    replacePreferences,
    getCurrentPreferences,
    getPreferenceRevision,
  } = usePreferences({ user });

  const [problems, setProblems] = useState(() => {
    const loaded = loadProblems();
    const { problems: deduped, removedIds } = deduplicateProblems(loaded);
    if (removedIds.length > 0) {
      saveProblems(deduped);
    }
    return deduped;
  });
  // Tracks review-data mutations so App.tsx can re-read reviewLog/reviewEvents precisely
  const [reviewCount, setReviewCount] = useState(0);

  // Keep ref in sync so callbacks always read latest state without stale closures
  const problemsRef = useRef(problems);
  useEffect(() => { problemsRef.current = problems; });

  // Persist to localStorage on change
  useEffect(() => { saveProblems(problems); }, [problems]);

  // Sync with Supabase on sign-in
  const handleSyncComplete = useCallback((result: SyncResult, context?: SyncCompleteContext) => {
    const currentDataReset = loadDataReset();
    // F-20: a strictly-newer local reset can only mean clear-all ran while the
    // sync was in flight — the whole result predates it, so discard wholesale.
    if (dataResetTime(currentDataReset) > dataResetTime(result.dataReset)) return;
    const mergedDataReset = newerDataReset(currentDataReset, result.dataReset);
    const incomingResetIsNewer = dataResetTime(result.dataReset) > dataResetTime(currentDataReset);
    if (mergedDataReset) {
      saveDataReset(mergedDataReset);
    }

    const currentTombstones = filterTombstonesAfterDataReset(loadProblemTombstones(), mergedDataReset);
    const resultTombstones = filterTombstonesAfterDataReset(result.problemTombstones, mergedDataReset);
    const { tombstones } = mergeProblemTombstones(currentTombstones, resultTombstones);
    saveProblemTombstones(tombstones);

    setProblems((currentProblems) => {
      const localProblems = incomingResetIsNewer ? [] : currentProblems;
      const { problems: mergedProblems } = mergeProblems(localProblems, result.problems);
      const filteredProblems = filterTombstonedProblems(mergedProblems, tombstones);
      return deduplicateProblems(filteredProblems).problems;
    });

    const localReviewLog = incomingResetIsNewer ? [] : loadReviewLog();
    const localReviewEvents = incomingResetIsNewer ? [] : loadReviewEvents();
    saveReviewLog(mergeReviewLog(localReviewLog, result.reviewLog).log);
    saveReviewEvents(mergeReviewEvents(localReviewEvents, result.reviewEvents).events);
    if (!context || getPreferenceRevision() === context.preferenceRevisionAtStart) {
      replacePreferences(result.preferences);
    } else if (user) {
      pushPreferencesToCloud(user.id, getCurrentPreferences());
    }
    setReviewCount((c) => c + 1);
  }, [getCurrentPreferences, getPreferenceRevision, replacePreferences, user]);

  const { syncStatus, invalidateInFlightSync } = useCloudSync({
    user, problems, preferences, getPreferenceRevision, showToast,
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
    if (confidenceChanged) {
      logReviewToday();
      setReviewCount((c) => c + 1);
    }
    if (user) pushProblemToCloud(user.id, problem);
  }, [showToast, user]);

  const handleCreateProblemFromLeetCodeImport = useCallback((problem: Problem) => {
    if (problem.leetcodeNumber) {
      const duplicate = problemsRef.current.find((p) => p.leetcodeNumber === problem.leetcodeNumber);
      if (duplicate) {
        return { status: "duplicate" as const, problem: duplicate };
      }
    }

    problemsRef.current = [...problemsRef.current, problem];
    setProblems(problemsRef.current);
    posthog.capture("leetcode_import_confirmed", {
      difficulty: problem.difficulty,
      confidence: problem.confidence,
      pattern_count: problem.patterns.length,
      platform: "web",
    });
    if (user) pushProblemToCloud(user.id, problem);
    return { status: "created" as const, problem };
  }, [user]);

  const handleDeleteConfirm = useCallback((deleteTarget: Problem | null) => {
    if (deleteTarget) {
      const deletedAt = new Date().toISOString();
      recordProblemTombstone(deleteTarget.id, deletedAt);
      setProblems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`Deleted ${deleteTarget.title}`);
      posthog.capture("problem_deleted", { platform: "web" });
      if (user) deleteProblemFromCloud(user.id, deleteTarget.id, deletedAt);
    }
  }, [showToast, user]);

  const handleReview = useCallback(
    (problemId: string, newConfidence: Confidence, options?: { replaceSameDayReviewEvent?: boolean }) => {
      const current = problemsRef.current;
      const { currentReviewed, effectiveGoal } = computeReviewProgress(current, preferences.dailyReviewGoal);
      const original = current.find((p) => p.id === problemId);
      const updatedProblem = original ? buildReviewedProblem(original, newConfidence) : null;

      const reviewTimestamp = new Date().toISOString();
      const replaceSameDayReviewEvent = options?.replaceSameDayReviewEvent === true;

      setProblems((prev) =>
        prev.map((p) => (p.id === problemId ? (updatedProblem ?? buildReviewedProblem(p, newConfidence)) : p))
      );
      logReviewToday();
      if (replaceSameDayReviewEvent) {
        logOrReplaceReviewEvent(problemId, newConfidence, original?.patterns ?? [], reviewTimestamp);
      } else {
        logReviewEvent(problemId, newConfidence, original?.patterns ?? [], reviewTimestamp);
      }
      setReviewCount((c) => c + 1);
      posthog.capture("problem_reviewed", { old_confidence: original?.confidence, new_confidence: newConfidence, platform: "web" });

      if (user && updatedProblem && original) {
        pushProblemToCloud(user.id, updatedProblem);
        if (replaceSameDayReviewEvent) {
          replaceReviewInCloud(user.id, problemId, original.confidence, newConfidence, original.patterns, reviewTimestamp);
        } else {
          pushReviewToCloud(user.id, problemId, original.confidence, newConfidence, original.patterns, reviewTimestamp);
        }
      }

      const intervalDays = original ? getReviewIntervalDays(original, newConfidence) : getIntervalDays(newConfidence);
      const countsAsNewTodayReview =
        !(replaceSameDayReviewEvent && original?.lastReviewed === todayStr());
      const newReviewedCount = currentReviewed + (countsAsNewTodayReview ? 1 : 0);
      const progress = `${newReviewedCount} of ${effectiveGoal} done`;
      const interval = `Next review in ${intervalDays} day${intervalDays !== 1 ? "s" : ""}`;
      showToast(`${progress} · ${interval}`);
    },
    [showToast, preferences.dailyReviewGoal, user]
  );

  const handleUpdateNotes = useCallback((problemId: string, newNotes: string) => {
    const now = new Date().toISOString();
    const problem = problemsRef.current.find((p) => p.id === problemId);
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId ? { ...p, notes: newNotes.trim(), updatedAt: now } : p
      )
    );
    if (user && problem) {
      pushProblemToCloud(user.id, { ...problem, notes: newNotes.trim(), updatedAt: now });
    }
  }, [user]);

  const handleDismiss = useCallback((problemId: string) => {
    const tomorrow = addDays(todayStr(), 1);
    const now = new Date().toISOString();
    const problem = problemsRef.current.find((p) => p.id === problemId);
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
  }, [user]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const data = await importData(file);
        const { mergedProblems, addedCount, updatedCount, changedProblems, importedIdToCanonicalId } =
          mergeImportedProblems(problems, data.problems);
        setProblems(mergedProblems);
        if (data.reviewLog) {
          saveReviewLog(data.reviewLog);
        }
        // F-4: remap imported review events to the canonical local problem ids
        // so cross-device history stays attached to the surviving entry.
        const importedReviewEvents = data.reviewEvents?.map((event) => ({
          ...event,
          problemId: importedIdToCanonicalId.get(event.problemId) ?? event.problemId,
        }));
        if (importedReviewEvents) {
          saveReviewEvents(importedReviewEvents);
        }
        if (user) {
          // Push only added/updated problems: raw imported ids may have been
          // remapped, and pushing them verbatim would recreate cloud duplicates.
          pushProblemsToCloud(user.id, changedProblems);
          if (importedReviewEvents?.length) {
            pushReviewEventsToCloud(user.id, importedReviewEvents);
          }
        }
        setReviewCount((c) => c + 1);
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
    const problem = problemsRef.current.find((p) => p.id === problemId);
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
  }, [user]);

  const handleSetAllDue = useCallback(() => {
    const today = todayStr();
    const now = new Date().toISOString();
    setProblems((prev) =>
      prev.map((p) => ({ ...p, nextReviewDate: today, lastReviewed: null, updatedAt: now }))
    );
    if (user) {
      const current = problemsRef.current;
      pushProblemsToCloud(user.id, current.map((p) => ({ ...p, nextReviewDate: today, lastReviewed: null, updatedAt: now })));
    }
    showToast("All problems set to due");
  }, [user, showToast]);

  const handleClearAllData = useCallback(async () => {
    invalidateInFlightSync();
    const resetAt = new Date().toISOString();
    saveDataReset({ resetAt });
    saveProblemTombstones([]);
    setProblems([]);
    saveReviewLog([]);
    saveReviewEvents([]);
    setReviewCount((c) => c + 1);
    if (user) {
      await clearAllCloudData(user.id, resetAt);
    }
    showToast("All data cleared");
  }, [invalidateInFlightSync, showToast, user]);

  return {
    problems,
    preferences,
    syncStatus,
    reviewCount,
    handleSaveProblem,
    handleCreateProblemFromLeetCodeImport,
    handleDeleteConfirm,
    handleReview,
    handleUpdateNotes,
    handleDismiss,
    handleImport,
    handleUpdatePreferences,
    handleBulkAdd,
    handleToggleExclude,
    handleSetAllDue,
    handleClearAllData,
  };
}
