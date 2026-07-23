import type { SyncStatus } from "../types";
import { formatLastSynced } from "../utils/format";

interface DotInfo {
  color: string;
  title: string;
  animation: string;
  label: string;
}

interface Props {
  onSettingsClick: () => void;
  onHelpClick: () => void;
  syncStatus: SyncStatus;
  // Present only when signed in with a LeetCode connection.
  leetcodeSync?: {
    syncing: boolean;
    lastSyncedAt: string | null;
    onSyncNow: () => void;
  };
}

export default function Header({ onSettingsClick, onHelpClick, syncStatus, leetcodeSync }: Props) {
  const dot: Partial<Record<SyncStatus, DotInfo>> = {
    syncing: { color: "#d29922", title: "Syncing...", label: "Syncing", animation: "sync-pulse 1.5s ease-in-out infinite" },
    synced: { color: "#3fb950", title: "Cloud synced", label: "Cloud synced", animation: "none" },
    error: { color: "#f85149", title: "Sync issue", label: "Sync issue", animation: "none" },
  };

  const statusInfo = dot[syncStatus] || null;

  return (
    <div className="sticky top-0 z-[800] flex items-center justify-between border-b border-pb-border bg-pb-surface px-5 py-4">
      <div className="flex items-center gap-2.5">
        <img src="/favicon-32.png" alt="" className="h-5 w-5 rounded" />
        <h1 className="text-lg font-bold tracking-tight text-pb-text">
          PatternBank
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {statusInfo && (
          <span
            className="inline-flex items-center gap-2 rounded-full border border-pb-border bg-pb-bg px-3 py-1.5 text-xs font-medium text-pb-text-muted max-sm:px-2 max-sm:[&>span:last-child]:hidden"
            title={statusInfo.title}
            aria-label={statusInfo.title}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: statusInfo.color,
                animation: statusInfo.animation,
                boxShadow: `0 0 0 3px ${statusInfo.color}22`,
                display: "inline-block",
              }}
            />
            <span>{statusInfo.label}</span>
          </span>
        )}
        {leetcodeSync && (
          <button
            onClick={leetcodeSync.onSyncNow}
            disabled={leetcodeSync.syncing}
            title={formatLastSynced(leetcodeSync.lastSyncedAt)}
            aria-label="Sync LeetCode activity"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-[17px] text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true" className={leetcodeSync.syncing ? "animate-spin" : undefined}>
              ↻
            </span>
          </button>
        )}
        <button
          onClick={onHelpClick}
          title="Help"
          aria-label="Help"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-[18px] font-semibold text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
        >
          ?
        </button>
        <button
          onClick={onSettingsClick}
          title="Settings"
          aria-label="Settings"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-[23px] text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
        >
          ⚙
        </button>
      </div>
    </div>
  );
}
