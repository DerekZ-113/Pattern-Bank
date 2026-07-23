import { useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import type { LeetCodeConnection } from "../types";
import { formatLastSynced } from "../utils/format";
import InlineError from "./InlineError";

interface Props {
  user: User | null;
  connection: LeetCodeConnection | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  onConnect: (username: string) => void | Promise<unknown>;
  onSyncNow: () => void | Promise<unknown>;
  onDisconnect: () => void | Promise<unknown>;
}

export default function LeetCodeActivitySection({
  user,
  connection,
  loading,
  actionLoading,
  error,
  onConnect,
  onSyncNow,
  onDisconnect,
}: Props) {
  const [username, setUsername] = useState("");
  const disabled = loading || actionLoading;

  const handleConnect = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    void onConnect(trimmed);
  };

  return (
    <div>
      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
        LeetCode Activity
      </label>

      {!user && (
        <div className="rounded-lg border border-pb-border bg-pb-bg px-3.5 py-3">
          <div className="text-sm font-semibold text-pb-text">
            Sign in to connect LeetCode
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-pb-text-muted">
            PatternBank can turn accepted LeetCode submissions into Today items after you sign in.
          </p>
        </div>
      )}

      {user && !connection && (
        <form onSubmit={handleConnect} className="rounded-lg border border-pb-border bg-pb-bg px-3.5 py-3">
          <p className="mb-3 text-xs leading-relaxed text-pb-text-dim">
            Track recent accepted submissions from your public LeetCode profile.
          </p>
          <label htmlFor="leetcode-username" className="mb-1.5 block text-xs font-medium text-pb-text-muted">
            Public LeetCode username
          </label>
          <div className="flex gap-2 max-sm:flex-col">
            <input
              id="leetcode-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="derek113"
              disabled={disabled}
              className="min-w-0 flex-1 rounded-lg border border-pb-border bg-pb-surface px-3 py-2 text-sm text-pb-text outline-none transition-colors placeholder:text-pb-text-dim focus:border-pb-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={disabled || !username.trim()}
              className="cursor-pointer rounded-lg border border-pb-accent bg-pb-accent px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Track activity
            </button>
          </div>
        </form>
      )}

      {user && connection && (
        <div className="rounded-lg border border-pb-border bg-pb-bg px-3.5 py-3">
          <div className="flex items-start justify-between gap-3 max-sm:flex-col">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-pb-text">
                Connected as {connection.leetcodeUsername}
              </div>
              <div className="mt-1 text-xs text-pb-text-dim">
                {formatLastSynced(connection.lastSyncedAt)}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void onSyncNow()}
                disabled={disabled}
                className="cursor-pointer rounded-lg border border-pb-border bg-transparent px-3 py-1.5 text-xs font-medium text-pb-text-muted transition-colors hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sync now
              </button>
              <button
                type="button"
                onClick={() => void onDisconnect()}
                disabled={disabled}
                className="cursor-pointer rounded-lg border border-pb-border bg-transparent px-3 py-1.5 text-xs font-medium text-pb-text-muted transition-colors hover:border-pb-hard hover:text-pb-hard disabled:cursor-not-allowed disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          </div>
          {connection.syncStatus === "no_visible_submissions" && (
            <p className="mt-3 rounded-lg border border-pb-border bg-pb-surface px-3 py-2 text-xs leading-relaxed text-pb-text-dim">
              We could not see recent accepted submissions. Check that recent submissions are visible on your public LeetCode profile.
            </p>
          )}
          {connection.syncStatus === "rate_limited" && (
            <p className="mt-3 rounded-lg border border-pb-border bg-pb-surface px-3 py-2 text-xs leading-relaxed text-pb-text-dim">
              LeetCode rate limited the request. Try again later.
            </p>
          )}
        </div>
      )}

      <InlineError message={error ?? undefined} />
    </div>
  );
}
