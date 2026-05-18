import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { LeetCodeConnection, LeetCodeIgnoredImport, LeetCodeSubmission } from "../types";
import {
  connectLeetCodeActivity,
  disconnectLeetCodeActivity,
  fetchLeetCodeConnection,
  fetchLeetCodeIgnoredImports,
  fetchRecentLeetCodeSubmissions,
  LEETCODE_RECENT_ACTIVITY_LIMIT,
  markLeetCodeSubmissionRated,
  sanitizeLeetCodeActivityError,
  syncLeetCodeActivity,
  type LeetCodeActivityResult,
} from "../utils/leetcodeActivityData";

const APP_OPEN_SYNC_STALE_MS = 60 * 60 * 1000;

interface UseLeetCodeActivityParams {
  user: User | null;
  showToast?: (message: string) => void;
}

export interface UseLeetCodeActivityState {
  connection: LeetCodeConnection | null;
  submissions: LeetCodeSubmission[];
  ignoredImports: LeetCodeIgnoredImport[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  connect: (username: string) => Promise<LeetCodeActivityResult>;
  syncNow: () => Promise<LeetCodeActivityResult>;
  disconnect: () => Promise<LeetCodeActivityResult>;
  markRated: (submissionDbId: string, problemId: string) => Promise<LeetCodeActivityResult>;
  refresh: () => Promise<void>;
}

function isConnectionStale(connection: LeetCodeConnection): boolean {
  if (!connection.lastSyncedAt) return true;
  return Date.now() - new Date(connection.lastSyncedAt).getTime() >= APP_OPEN_SYNC_STALE_MS;
}

export default function useLeetCodeActivity({
  user,
  showToast: _showToast,
}: UseLeetCodeActivityParams): UseLeetCodeActivityState {
  const [connection, setConnection] = useState<LeetCodeConnection | null>(null);
  const [submissions, setSubmissions] = useState<LeetCodeSubmission[]>([]);
  const [ignoredImports, setIgnoredImports] = useState<LeetCodeIgnoredImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRunRef = useRef(0);
  const latestUserIdRef = useRef<string | null>(null);
  const backgroundSyncUsersRef = useRef(new Set<string>());
  const userId = user?.id ?? null;

  useEffect(() => {
    latestUserIdRef.current = userId;
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) {
      setConnection(null);
      setSubmissions([]);
      setIgnoredImports([]);
      setError(null);
      return;
    }

    const runId = loadRunRef.current + 1;
    loadRunRef.current = runId;
    setLoading(true);

    const connectionResult = await fetchLeetCodeConnection(userId);
    if (loadRunRef.current !== runId) return;

    if (connectionResult.error) {
      setError(sanitizeLeetCodeActivityError(connectionResult.error));
      setConnection(null);
      setSubmissions([]);
      setIgnoredImports([]);
      setLoading(false);
      return;
    }

    const nextConnection = connectionResult.data;
    setConnection(nextConnection);

    const submissionsResult = await fetchRecentLeetCodeSubmissions(userId, LEETCODE_RECENT_ACTIVITY_LIMIT);
    if (loadRunRef.current !== runId) return;

    const ignoredResult = await fetchLeetCodeIgnoredImports(userId);
    if (loadRunRef.current !== runId) return;

    if (submissionsResult.error) {
      setError(sanitizeLeetCodeActivityError(submissionsResult.error));
      setSubmissions([]);
    } else if (ignoredResult.error) {
      setError(sanitizeLeetCodeActivityError(ignoredResult.error));
      setIgnoredImports([]);
    } else {
      setError(null);
      setSubmissions(submissionsResult.data ?? []);
      setIgnoredImports(ignoredResult.data ?? []);
    }
    setLoading(false);

    if (
      nextConnection &&
      isConnectionStale(nextConnection) &&
      !backgroundSyncUsersRef.current.has(userId)
    ) {
      const activeUserId = userId;
      backgroundSyncUsersRef.current.add(userId);
      syncLeetCodeActivity(false).then((result) => {
        if (loadRunRef.current !== runId) return;
        if (latestUserIdRef.current !== activeUserId) return;
        if (result.data?.connection) setConnection(result.data.connection);
        if (result.data?.submissions) setSubmissions(result.data.submissions);
        if (result.data) setIgnoredImports(result.data.ignoredImports ?? []);
        if (result.error) setError(result.error);
      });
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => {
      loadRunRef.current += 1;
    };
  }, [load]);

  const connect = useCallback(async (username: string) => {
    if (!userId) {
      const result: LeetCodeActivityResult = {
        data: null,
        error: "Sign in to track LeetCode activity across devices.",
      };
      setError(result.error);
      return result;
    }
    setActionLoading(true);
    const result = await connectLeetCodeActivity(username);
    if (result.data) {
      setConnection(result.data.connection);
      setSubmissions(result.data.submissions);
      setIgnoredImports(result.data.ignoredImports ?? []);
    }
    setError(result.error);
    setActionLoading(false);
    return result;
  }, [userId]);

  const syncNow = useCallback(async () => {
    setActionLoading(true);
    const result = await syncLeetCodeActivity(true);
    if (result.data) {
      setConnection(result.data.connection);
      setSubmissions(result.data.submissions);
      setIgnoredImports(result.data.ignoredImports ?? []);
    }
    setError(result.error);
    setActionLoading(false);
    return result;
  }, []);

  const disconnect = useCallback(async () => {
    setActionLoading(true);
    const result = await disconnectLeetCodeActivity();
    if (!result.error) {
      setConnection(null);
      setSubmissions([]);
      setIgnoredImports([]);
    }
    setError(result.error);
    setActionLoading(false);
    return result;
  }, []);

  const markRated = useCallback(async (submissionDbId: string, problemId: string) => {
    const runId = loadRunRef.current + 1;
    loadRunRef.current = runId;
    const result = await markLeetCodeSubmissionRated(submissionDbId, problemId);
    if (loadRunRef.current !== runId) return result;
    if (result.data) {
      setConnection(result.data.connection);
      setSubmissions(result.data.submissions);
      setIgnoredImports(result.data.ignoredImports ?? []);
    }
    if (result.error) setError(result.error);
    return result;
  }, []);

  return {
    connection,
    submissions,
    ignoredImports,
    loading,
    actionLoading,
    error,
    connect,
    syncNow,
    disconnect,
    markRated,
    refresh: load,
  };
}
