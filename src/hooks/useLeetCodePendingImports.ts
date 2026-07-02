import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type {
  Confidence,
  LeetCodeIgnoredImport,
  LeetCodeSubmission,
  PendingLeetCodeImport,
  Problem,
  ReviewEvent,
  TodayLeetCodeItem,
  ToastState,
} from "../types";
import {
  ignoreLeetCodeImport,
  markLeetCodeImportImported,
  markLeetCodeImportLinkedExisting,
  restoreIgnoredLeetCodeImport,
} from "../utils/leetcodeActivityData";
import {
  buildProblemFromLeetCodeImport,
} from "@patternbank/core";
import { todayStr } from "@patternbank/core";
import {
  loadTodayLeetCodeCompletions,
  mergeTodayLeetCodeCompletion,
  saveTodayLeetCodeCompletions,
  type LeetCodeCompletionIdentity,
  type TodayLeetCodeCompletionAction,
} from "../utils/todayLeetCodeCompletions";
import {
  buildReviewedTodayLeetCodeCompletions,
  logTodayLeetCodeDebugSnapshot,
  resolveTodayLeetCodeState,
} from "../utils/todayLeetCodeResolver";

interface UseLeetCodePendingImportsParams {
  user: Pick<User, "id"> | null;
  problems: Problem[];
  reviewEvents?: ReviewEvent[];
  submissions: LeetCodeSubmission[];
  ignoredImports: LeetCodeIgnoredImport[];
  loading: boolean;
  onCreateProblem: (problem: Problem) => { status: "created" | "duplicate"; problem: Problem };
  showToast: (message: string, action?: ToastState["action"]) => void;
  refreshLeetCodeActivity: () => Promise<void>;
}

export interface UseLeetCodePendingImportsState {
  pendingImports: PendingLeetCodeImport[];
  todayLeetCodeItems: TodayLeetCodeItem[];
  leetcodeSubmissionsForTodayFeed: LeetCodeSubmission[];
  confirmImport: (item: PendingLeetCodeImport, confidence: Confidence) => Promise<void>;
  ignoreImport: (item: PendingLeetCodeImport) => Promise<void>;
  recordRatedCompletion: (source: LeetCodeCompletionIdentity & { submissionDbId: string }, problemId: string) => void;
}

export default function useLeetCodePendingImports({
  user,
  problems,
  reviewEvents = [],
  submissions,
  ignoredImports,
  loading,
  onCreateProblem,
  showToast,
  refreshLeetCodeActivity,
}: UseLeetCodePendingImportsParams): UseLeetCodePendingImportsState {
  const processedAutoImportsRef = useRef(new Set<string>());
  const today = todayStr();
  const [todayCompletions, setTodayCompletions] = useState(() => loadTodayLeetCodeCompletions(today));

  useEffect(() => {
    setTodayCompletions(loadTodayLeetCodeCompletions(today));
  }, [today]);

  const recordCompletion = useCallback((
    source: LeetCodeCompletionIdentity & { submissionDbId: string },
    action: TodayLeetCodeCompletionAction,
    problemId: string,
  ) => {
    setTodayCompletions((current) => {
      const next = mergeTodayLeetCodeCompletion(current, {
        submissionDbId: source.submissionDbId,
        leetcodeSubmissionId: source.leetcodeSubmissionId,
        titleSlug: source.titleSlug,
        leetcodeNumber: source.leetcodeNumber,
        problemId,
        action,
      }, today);
      saveTodayLeetCodeCompletions(next, today);
      return next;
    });
  }, [today]);
  const reviewedTodayCompletions = useMemo(
    () => buildReviewedTodayLeetCodeCompletions({
      submissions,
      problems,
      reviewEvents,
      today,
    }),
    [problems, reviewEvents, submissions, today],
  );

  useEffect(() => {
    if (reviewedTodayCompletions.length === 0) return;
    setTodayCompletions((current) => {
      let next = current;
      for (const completion of reviewedTodayCompletions) {
        next = mergeTodayLeetCodeCompletion(next, completion, today);
      }
      if (next === current) return current;
      saveTodayLeetCodeCompletions(next, today);
      return next;
    });
  }, [reviewedTodayCompletions, today]);

  const resolvedTodayLeetCodeState = useMemo(
    () => resolveTodayLeetCodeState({
      problems,
      reviewEvents,
      leetcodeSubmissions: submissions,
      ignoredImports,
      todayCompletions,
      today,
    }),
    [ignoredImports, problems, reviewEvents, submissions, today, todayCompletions],
  );

  useEffect(() => {
    logTodayLeetCodeDebugSnapshot("resolved-state", {
      submissions,
      completions: resolvedTodayLeetCodeState.effectiveCompletions,
      fromLeetCodeItems: resolvedTodayLeetCodeState.fromLeetCodeItems,
      doneTodayLeetCodeSubmissions: resolvedTodayLeetCodeState.doneTodayLeetCodeSubmissions,
      reviewEvents,
      problems,
    });
  }, [problems, reviewEvents, resolvedTodayLeetCodeState, submissions]);

  const todayLeetCodeItems = resolvedTodayLeetCodeState.fromLeetCodeItems;
  const pendingImports = useMemo(
    () => todayLeetCodeItems.filter((item): item is PendingLeetCodeImport & {
      kind: "pending_import";
      status: "detected";
      matchedProblemId: null;
      statusLabel: "Rate to add";
    } => item.kind === "pending_import"),
    [todayLeetCodeItems],
  );
  const leetcodeSubmissionsForTodayFeed = resolvedTodayLeetCodeState.doneTodayLeetCodeSubmissions;

  const confirmImport = useCallback(async (
    item: PendingLeetCodeImport,
    confidence: Confidence,
    options: { autoExpired?: boolean; silent?: boolean } = {},
  ) => {
    const duplicate = item.leetcodeNumber === null
      ? null
      : problems.find((problem) => problem.leetcodeNumber === item.leetcodeNumber) ?? null;

    if (duplicate) {
      recordCompletion(item, "linked_existing", duplicate.id);
      const result = await markLeetCodeImportLinkedExisting(item.submissionDbId, duplicate.id);
      if (!result.error) {
        await refreshLeetCodeActivity();
        if (!options.silent) {
          showToast("Already in your library — linked LeetCode activity.");
        }
      } else if (!options.silent) {
        showToast(result.error);
      }
      return;
    }

    const problem = buildProblemFromLeetCodeImport(item, confidence, {
      today: todayStr(),
      now: new Date().toISOString(),
      autoExpired: options.autoExpired,
    });
    const createResult = onCreateProblem(problem);

    if (createResult.status === "duplicate") {
      recordCompletion(item, "linked_existing", createResult.problem.id);
      const result = await markLeetCodeImportLinkedExisting(item.submissionDbId, createResult.problem.id);
      if (!result.error) {
        await refreshLeetCodeActivity();
        if (!options.silent) {
          showToast("Already in your library — linked LeetCode activity.");
        }
      } else if (!options.silent) {
        showToast(result.error);
      }
      return;
    }

    recordCompletion(item, "imported", createResult.problem.id);
    const result = await markLeetCodeImportImported(item.submissionDbId, createResult.problem.id);
    if (!result.error) {
      await refreshLeetCodeActivity();
      if (!options.silent) {
        showToast(`Added ${createResult.problem.title} from LeetCode`);
      }
    } else if (!options.silent) {
      showToast(result.error);
    }
  }, [onCreateProblem, problems, recordCompletion, refreshLeetCodeActivity, showToast]);

  const recordRatedCompletion = useCallback((
    source: LeetCodeCompletionIdentity & { submissionDbId: string },
    problemId: string,
  ) => {
    recordCompletion(source, "rated", problemId);
  }, [recordCompletion]);

  const ignoreImport = useCallback(async (item: PendingLeetCodeImport) => {
    const result = await ignoreLeetCodeImport(item.submissionDbId);
    if (result.error) {
      showToast(result.error);
      return;
    }

    await refreshLeetCodeActivity();
    showToast(`Ignored ${item.title}.`, {
      label: "Undo",
      onClick: () => {
        void restoreIgnoredLeetCodeImport(item.titleSlug).then(async (restoreResult) => {
          if (restoreResult.error) {
            showToast(restoreResult.error);
            return;
          }
          await refreshLeetCodeActivity();
        });
      },
    });
  }, [refreshLeetCodeActivity, showToast]);

  useEffect(() => {
    if (!user || loading) return;

    for (const item of pendingImports) {
      if (!item.expired || processedAutoImportsRef.current.has(item.submissionDbId)) continue;
      processedAutoImportsRef.current.add(item.submissionDbId);
      void confirmImport(item, 1, { autoExpired: true, silent: true });
    }
  }, [confirmImport, loading, pendingImports, user]);

  return {
    pendingImports,
    todayLeetCodeItems,
    leetcodeSubmissionsForTodayFeed,
    confirmImport,
    ignoreImport,
    recordRatedCompletion,
  };
}
