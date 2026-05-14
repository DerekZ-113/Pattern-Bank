import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { loadReviewLog, loadReviewEvents, loadProblemTombstones, loadDataReset } from "../utils/storage";
import { syncOnSignIn, SyncResult } from "../utils/sync";
import type { Problem, Preferences, SyncStatus } from "../types";

interface UseCloudSyncParams {
  user: User | null;
  problems: Problem[];
  preferences: Preferences;
  showToast: (msg: string) => void;
  onSyncComplete: (result: SyncResult) => void;
}

interface UseCloudSyncReturn {
  syncStatus: SyncStatus;
}

export default function useCloudSync({
  user,
  problems,
  preferences,
  showToast,
  onSyncComplete,
}: UseCloudSyncParams): UseCloudSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const hasSyncedRef = useRef(false);
  const syncRunRef = useRef(0);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      syncRunRef.current += 1;
      const reset = () => { hasSyncedRef.current = false; setSyncStatus("idle"); };
      reset();
      return;
    }
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    const runId = syncRunRef.current + 1;
    syncRunRef.current = runId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncStatus("syncing");

    syncOnSignIn(
      userId,
      problems,
      loadReviewLog(),
      loadReviewEvents(),
      preferences,
      loadProblemTombstones(),
      loadDataReset()
    ).then(
      (result) => {
        if (syncRunRef.current !== runId) return;
        if (result.error) {
          setSyncStatus("error");
          showToast("Sync failed — working offline");
          return;
        }
        onSyncComplete(result);
        setSyncStatus("synced");
        if (result.hasChanges) {
          showToast("Data synced");
        }
      }
    );
    return () => {
      if (syncRunRef.current === runId) {
        syncRunRef.current += 1;
      }
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { syncStatus };
}
