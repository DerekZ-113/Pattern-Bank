import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import { fetchProblemReviewHistory } from "../utils/supabaseData";
import { formatRelativeDate, utcToLocalDateStr } from "../utils/dateHelpers";
import type { ReviewHistoryEntry } from "../types";

interface Props {
  problemId: string;
  isOpen: boolean;
}

function MiniStars({ count }: { count: number }) {
  return (
    <span className="text-xs tracking-wide">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= count ? "#e3b341" : "#30363d" }}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ReviewHistory({ problemId, isOpen }: Props) {
  const { user } = useAuth();
  const [history, setHistory] = useState<ReviewHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!isOpen || !problemId || !user) {
      setHistory([]);
      setFetched(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchProblemReviewHistory(user.id, problemId).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error("Failed to fetch review history:", error);
      setHistory(data || []);
      setFetched(true);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [problemId, isOpen, user]);

  // Signed out
  if (!user) {
    return (
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
          Review History
        </label>
        <div className="rounded-lg bg-pb-bg p-3">
          <p className="m-0 text-[13px] text-pb-text-muted">
            Sign in to start tracking your review history and sync across devices.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading && !fetched) {
    return (
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
          Review History
        </label>
        <div className="rounded-lg bg-pb-bg p-3">
          <p className="m-0 text-[13px] text-pb-text-dim">Loading...</p>
        </div>
      </div>
    );
  }

  // No reviews yet
  if (fetched && history.length === 0) {
    return (
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
          Review History
        </label>
        <div className="rounded-lg bg-pb-bg p-3">
          <p className="m-0 text-[13px] text-pb-text-dim">
            No reviews yet. Review this problem to start tracking.
          </p>
        </div>
      </div>
    );
  }

  // Has reviews
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <label className="text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
          Review History
        </label>
        <span className="rounded-full bg-pb-bg px-2 py-0.5 text-[11px] font-medium text-pb-text-dim">
          {history.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 rounded-lg bg-pb-bg p-3">
        {history.map((entry, i) => (
          <div key={entry.createdAt || i} className="flex items-center gap-3">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-pb-text-dim"
            />
            <span className="min-w-[72px] text-[13px] text-pb-text-muted">
              {formatRelativeDate(utcToLocalDateStr(entry.createdAt) || entry.reviewDate)}
            </span>
            <span className="ml-auto">
              <MiniStars count={entry.newConfidence} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
