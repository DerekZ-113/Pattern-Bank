import { REVIEW_EVENTS_PRUNED_BEFORE_KEY } from "../constants";
import { timestampMs } from "../dateHelpers";
import type { CoreHooks } from "../hooks";
import { mergePreferences, preferencesEqual } from "../preferences";
import { deduplicateProblems } from "../problemTransforms";
import type { StorageAdapter } from "../storage/adapter";
import { pruneOldEvents } from "../storage/logic";
import type { CloudData } from "../supabase/data";
import type {
  CorePreferences,
  DataReset,
  Problem,
  ProblemTombstone,
  ReviewEvent,
  ReviewLogEntry,
} from "../types";
import {
  compareDataResets,
  filterProblemsAfterDataReset,
  filterReviewEventsAfterDataReset,
  filterReviewEventsToProblems,
  filterTombstonedProblems,
  filterTombstonesAfterDataReset,
  mergeProblems,
  mergeProblemTombstones,
  mergeReviewLog,
  newestDataReset,
  reviewLogFromEvents,
} from "./merge";
import { mergeReviewEvents } from "./reviewEvents";

/** The slice of the cloud-data surface performFullSync drives; the full CloudData satisfies it. */
export type FullSyncCloud = Pick<
  CloudData,
  | "fetchProblems"
  | "fetchProblemTombstones"
  | "fetchDataReset"
  | "fetchReviewLog"
  | "fetchReviewEvents"
  | "fetchPreferences"
  | "upsertDataReset"
  | "deleteAllUserProblems"
  | "deleteAllUserReviewLog"
  | "upsertProblemTombstones"
  | "deleteProblems"
  | "upsertProblems"
  | "batchInsertReviewLogs"
  | "upsertPreferences"
>;

export interface FullSyncLocalState<P extends CorePreferences = CorePreferences> {
  problems: Problem[];
  reviewLog: ReviewLogEntry[];
  reviewEvents: ReviewEvent[];
  preferences: P;
  problemTombstones: ProblemTombstone[];
  dataReset: DataReset | null;
}

export interface FullSyncDeps<P extends CorePreferences = CorePreferences> {
  userId: string;
  cloud: FullSyncCloud;
  /**
   * Used only for the prune watermark (F-3). Merged data is RETURNED, never
   * written here — the platform persists it, so a failed sync leaves local
   * state untouched (F-5).
   */
  storage: StorageAdapter;
  local: FullSyncLocalState<P>;
  /** Local review-event retention: null never prunes (web); mobile passes 180. */
  eventRetentionDays: number | null;
  hooks?: CoreHooks;
}

export interface FullSyncSuccess<P extends CorePreferences = CorePreferences>
  extends FullSyncLocalState<P> {
  status: "success";
  hasChanges: boolean;
}

export interface FullSyncFailure {
  status: "error";
  error: unknown;
}

export type FullSyncResult<P extends CorePreferences = CorePreferences> =
  | FullSyncSuccess<P>
  | FullSyncFailure;

/**
 * Full sign-in sync: pull everything, merge with the provided local snapshot,
 * repair the cloud, and return the merged state for the platform to persist.
 *
 * Fail-closed (F-5): any critical fetch or any cloud write failure aborts with
 * `{ status: "error" }` and no partial local writes. Tolerated degradations
 * (kept from both platforms): review-event and preference fetch failures skip
 * their backfill/merge instead of aborting.
 */
export async function performFullSync<P extends CorePreferences = CorePreferences>(
  deps: FullSyncDeps<P>,
): Promise<FullSyncResult<P>> {
  const { userId, cloud, storage, local, eventRetentionDays, hooks = {} } = deps;
  const warn = hooks.warn ?? (() => undefined);
  const fail = (message: string, error: unknown): FullSyncFailure => {
    warn(message, error);
    return { status: "error", error };
  };

  try {
    const [
      cloudProblemsRes,
      cloudTombstonesRes,
      cloudResetRes,
      cloudLogRes,
      cloudEventsRes,
      cloudPrefsRes,
    ] = await Promise.all([
      cloud.fetchProblems(userId),
      cloud.fetchProblemTombstones(userId),
      cloud.fetchDataReset(userId),
      cloud.fetchReviewLog(userId),
      cloud.fetchReviewEvents(userId),
      cloud.fetchPreferences(userId),
    ]);

    if (cloudProblemsRes.error) {
      return fail("Sync: failed to fetch problems", cloudProblemsRes.error);
    }
    if (cloudTombstonesRes.error) {
      return fail("Sync: failed to fetch problem tombstones", cloudTombstonesRes.error);
    }
    if (cloudResetRes.error) {
      return fail("Sync: failed to fetch data reset marker", cloudResetRes.error);
    }
    const reviewEventsFetchFailed = !!cloudEventsRes.error;
    if (reviewEventsFetchFailed) {
      warn("Sync: failed to fetch review events", cloudEventsRes.error);
    }
    const preferencesFetchFailed = !!cloudPrefsRes.error;
    if (preferencesFetchFailed) {
      warn("Sync: failed to fetch preferences", cloudPrefsRes.error);
    }

    const cloudProblems = cloudProblemsRes.data ?? [];
    const cloudTombstones = cloudTombstonesRes.data ?? [];
    const cloudDataReset = cloudResetRes.data ?? null;
    const resetWinner = compareDataResets(local.dataReset, cloudDataReset);
    const dataReset = newestDataReset(local.dataReset, cloudDataReset);

    let effectiveLocalProblems = local.problems;
    let effectiveLocalLog = local.reviewLog;
    let effectiveLocalEvents = local.reviewEvents;
    let effectiveCloudProblems = cloudProblems;
    let effectiveCloudLog = cloudLogRes.data ?? [];
    let effectiveCloudEvents = reviewEventsFetchFailed ? [] : cloudEventsRes.data ?? [];
    let resetRemovedCloudProblemIds: string[] = [];

    if (resetWinner === "cloud") {
      effectiveLocalProblems = [];
      effectiveLocalLog = [];
      effectiveLocalEvents = [];
      const filteredCloud = filterProblemsAfterDataReset(cloudProblems, dataReset);
      effectiveCloudProblems = filteredCloud.problems;
      effectiveCloudEvents = filterReviewEventsAfterDataReset(effectiveCloudEvents, dataReset);
      effectiveCloudLog = reviewLogFromEvents(effectiveCloudEvents);
      resetRemovedCloudProblemIds = filteredCloud.removedIds;
    } else if (resetWinner === "local") {
      effectiveCloudProblems = [];
      effectiveCloudLog = [];
      effectiveCloudEvents = [];
      // Durable reset marker must land before the destructive wipe, and the
      // wipe must complete before survivors are re-upserted below.
      const resetResult = await cloud.upsertDataReset(userId, local.dataReset!);
      if (resetResult.error) {
        return fail("Sync: failed to upsert local data reset marker", resetResult.error);
      }
      const [problemsDeleteResult, logDeleteResult] = await Promise.all([
        cloud.deleteAllUserProblems(userId),
        cloud.deleteAllUserReviewLog(userId),
      ]);
      if (problemsDeleteResult.error) {
        return fail("Sync: failed to repair cloud reset (problems):", problemsDeleteResult.error);
      }
      if (logDeleteResult.error) {
        return fail("Sync: failed to repair cloud reset (review log):", logDeleteResult.error);
      }
    } else if (dataReset) {
      const filteredCloud = filterProblemsAfterDataReset(cloudProblems, dataReset);
      effectiveCloudProblems = filteredCloud.problems;
      effectiveCloudEvents = filterReviewEventsAfterDataReset(effectiveCloudEvents, dataReset);
      effectiveCloudLog = reviewLogFromEvents(effectiveCloudEvents);
      resetRemovedCloudProblemIds = filteredCloud.removedIds;
    }

    const validLocalTombstones = filterTombstonesAfterDataReset(local.problemTombstones, dataReset);
    const validCloudTombstones = filterTombstonesAfterDataReset(cloudTombstones, dataReset);
    const {
      tombstones: mergedTombstones,
      addedFromCloud: tombstonesAddedFromCloud,
    } = mergeProblemTombstones(validLocalTombstones, validCloudTombstones);

    const filteredLocalProblems = filterTombstonedProblems(effectiveLocalProblems, mergedTombstones);
    const filteredCloudProblems = filterTombstonedProblems(effectiveCloudProblems, mergedTombstones);
    const tombstoneIds = new Set(mergedTombstones.map((t) => t.problemId));
    const tombstonedCloudIds = effectiveCloudProblems
      .filter((p) => tombstoneIds.has(p.id))
      .map((p) => p.id);

    const { problems: merged, cloudAdded, cloudWon } = mergeProblems(filteredLocalProblems, filteredCloudProblems);
    const { problems: mergedProblems, removedIds: dupIds } = deduplicateProblems(merged);

    // Durable tombstone markers must be safe before the rows they cover die.
    if (mergedTombstones.length > 0) {
      const { error } = await cloud.upsertProblemTombstones(userId, mergedTombstones);
      if (error) {
        return fail("Sync: failed to upsert problem tombstones", error);
      }
    }

    const idsToDelete = new Set(dupIds);
    tombstonedCloudIds.forEach((id) => idsToDelete.add(id));
    resetRemovedCloudProblemIds.forEach((id) => idsToDelete.add(id));
    const idsToDeleteList = Array.from(idsToDelete);
    if (idsToDeleteList.length > 0) {
      const { error } = await cloud.deleteProblems(idsToDeleteList);
      if (error) {
        return fail("Sync: failed to delete stale cloud problems", error);
      }
    }

    const cloudIds = new Set(filteredCloudProblems.map((p) => p.id));
    const localIds = new Set(filteredLocalProblems.map((p) => p.id));
    const cloudMap = new Map(filteredCloudProblems.map((p) => [p.id, p]));
    const problemsToPush: Problem[] = [];

    for (const problem of mergedProblems) {
      if (!cloudIds.has(problem.id)) {
        problemsToPush.push(problem);
      } else if (localIds.has(problem.id)) {
        const cloudProblem = cloudMap.get(problem.id)!;
        if (timestampMs(problem.updatedAt) > timestampMs(cloudProblem.updatedAt)) {
          problemsToPush.push(problem);
        }
      }
    }

    // Problems upload before review-event backfill so events never reference
    // a problem the cloud has not seen yet.
    if (problemsToPush.length > 0) {
      const { error } = await cloud.upsertProblems(userId, problemsToPush);
      if (error) {
        return fail("Sync: failed to push local problems", error);
      }
    }

    // F-7: drop review events orphaned by deletes/tombstones/dedup on either side.
    const mergedProblemIds = new Set(mergedProblems.map((problem) => problem.id));
    const validLocalEvents = filterReviewEventsToProblems(effectiveLocalEvents, mergedProblemIds);
    const validCloudEvents = filterReviewEventsToProblems(effectiveCloudEvents, mergedProblemIds);
    const removedOrphanReviewEvents =
      validLocalEvents.length !== effectiveLocalEvents.length ||
      validCloudEvents.length !== effectiveCloudEvents.length;

    let prunedBefore: string | null = null;
    try {
      prunedBefore = await storage.getItem(REVIEW_EVENTS_PRUNED_BEFORE_KEY);
    } catch (err) {
      warn("Sync: failed to read the review-event prune watermark", err);
    }

    const { log: mergedLog, addedFromCloud: logAddedFromCloud } = mergeReviewLog(
      effectiveLocalLog,
      effectiveCloudLog,
    );
    const {
      events: mergedEvents,
      addedFromCloud: eventsAddedFromCloud,
      localOnlyEvents,
    } = mergeReviewEvents(validLocalEvents, validCloudEvents, { prunedBefore });

    if (localOnlyEvents.length > 0 && !reviewEventsFetchFailed) {
      const { error } = await cloud.batchInsertReviewLogs(userId, localOnlyEvents);
      if (error) {
        return fail("Sync: failed to backfill local review events", error);
      }
    }

    // Preferences: newest-wins with the epoch shim (F-6).
    const cloudPrefs = cloudPrefsRes.data ?? null;
    let mergedPreferences: P = local.preferences;
    let preferencesChanged = false;
    if (!preferencesFetchFailed) {
      if (!cloudPrefs) {
        // First sign-in — seed the cloud from local.
        const { error } = await cloud.upsertPreferences(userId, local.preferences);
        if (error) {
          return fail("Sync: failed to initialize cloud preferences", error);
        }
      } else {
        const prefsMerge = mergePreferences(local.preferences, cloudPrefs);
        mergedPreferences = prefsMerge.preferences;
        if (prefsMerge.winner === "cloud") {
          preferencesChanged = !preferencesEqual(cloudPrefs, local.preferences);
        } else {
          // Local is strictly newer — propagate so other devices converge.
          const { error } = await cloud.upsertPreferences(userId, local.preferences);
          if (error) {
            return fail("Sync: failed to push newer local preferences", error);
          }
        }
      }
    }

    // Optional post-sync prune (F-3): cloud keeps full history; the watermark
    // is persisted BEFORE the pruned set is adopted so a failed write cannot
    // strand pruned-but-resurrectable events.
    let reviewEvents = mergedEvents;
    let prunedCount = 0;
    if (eventRetentionDays != null) {
      const { kept, cutoffIso } = pruneOldEvents(mergedEvents, { retentionDays: eventRetentionDays });
      if (cutoffIso) {
        try {
          if (timestampMs(cutoffIso) > timestampMs(prunedBefore)) {
            await storage.setItem(REVIEW_EVENTS_PRUNED_BEFORE_KEY, cutoffIso);
          }
          reviewEvents = kept;
          prunedCount = mergedEvents.length - kept.length;
        } catch (err) {
          warn("Sync: failed to persist the review-event prune watermark; skipping prune", err);
        }
      }
    }

    const hasChanges =
      cloudAdded > 0 ||
      cloudWon > 0 ||
      idsToDeleteList.length > 0 ||
      tombstonesAddedFromCloud > 0 ||
      removedOrphanReviewEvents ||
      resetWinner === "cloud" ||
      logAddedFromCloud > 0 ||
      eventsAddedFromCloud > 0 ||
      prunedCount > 0 ||
      preferencesChanged;

    return {
      status: "success",
      problems: mergedProblems,
      reviewLog: mergedLog,
      reviewEvents,
      preferences: mergedPreferences,
      problemTombstones: mergedTombstones,
      dataReset,
      hasChanges,
    };
  } catch (err) {
    return fail("Sync: unexpected error", err);
  }
}
