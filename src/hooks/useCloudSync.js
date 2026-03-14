import { useState, useEffect, useRef } from "react";
import { loadReviewLog } from "../utils/storage";
import { syncOnSignIn } from "../utils/sync";

export default function useCloudSync({ user, problems, preferences, showToast, onSyncComplete }) {
  const [syncStatus, setSyncStatus] = useState("idle");
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
        onSyncComplete(result);
        setSyncStatus("synced");
        if (result.problems.length > 0) {
          showToast("Data synced");
        }
      }
    );
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return { syncStatus };
}
