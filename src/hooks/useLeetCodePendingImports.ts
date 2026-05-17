import { useCallback, useEffect, useMemo, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import type {
  Confidence,
  LeetCodeIgnoredImport,
  LeetCodeSubmission,
  PendingLeetCodeImport,
  Problem,
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
  buildPendingLeetCodeImports,
  buildProblemFromLeetCodeImport,
  buildTodayLeetCodeItems,
} from "../utils/leetcodeImportTransforms";
import { todayStr } from "../utils/dateHelpers";

interface UseLeetCodePendingImportsParams {
  user: Pick<User, "id"> | null;
  problems: Problem[];
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
  confirmImport: (item: PendingLeetCodeImport, confidence: Confidence) => Promise<void>;
  ignoreImport: (item: PendingLeetCodeImport) => Promise<void>;
}

export default function useLeetCodePendingImports({
  user,
  problems,
  submissions,
  ignoredImports,
  loading,
  onCreateProblem,
  showToast,
  refreshLeetCodeActivity,
}: UseLeetCodePendingImportsParams): UseLeetCodePendingImportsState {
  const processedAutoImportsRef = useRef(new Set<string>());

  const todayLeetCodeItems = useMemo(
    () => buildTodayLeetCodeItems({
      submissions,
      problems,
      ignoredImports,
      today: todayStr(),
    }),
    [ignoredImports, problems, submissions],
  );
  const pendingImports = useMemo(
    () => buildPendingLeetCodeImports({
      submissions,
      problems,
      ignoredImports,
      today: todayStr(),
    }),
    [ignoredImports, problems, submissions],
  );

  const confirmImport = useCallback(async (
    item: PendingLeetCodeImport,
    confidence: Confidence,
    options: { autoExpired?: boolean; silent?: boolean } = {},
  ) => {
    const duplicate = item.leetcodeNumber === null
      ? null
      : problems.find((problem) => problem.leetcodeNumber === item.leetcodeNumber) ?? null;

    if (duplicate) {
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

    const result = await markLeetCodeImportImported(item.submissionDbId, createResult.problem.id);
    if (!result.error) {
      await refreshLeetCodeActivity();
      if (!options.silent) {
        showToast(`Added ${createResult.problem.title} from LeetCode`);
      }
    } else if (!options.silent) {
      showToast(result.error);
    }
  }, [onCreateProblem, problems, refreshLeetCodeActivity, showToast]);

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
    confirmImport,
    ignoreImport,
  };
}
