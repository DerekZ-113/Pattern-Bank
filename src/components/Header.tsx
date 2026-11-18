import type { ReactNode } from "react";
import Icon from "./Icon";
import type { SyncStatus } from "../types";
import { formatLastSynced } from "../utils/format";
import { iconButtonClass } from "../utils/buttonStyles";

interface StatusInfo {
  label: string;
  dotClass: string;
}

const SYNC_STATUS: Partial<Record<SyncStatus, StatusInfo>> = {
  syncing: { label: "Syncing", dotClass: "bg-pb-warning animate-[sync-pulse_1.5s_ease-in-out_infinite]" },
  synced: { label: "Cloud synced", dotClass: "bg-pb-success" },
  error: { label: "Sync issue", dotClass: "bg-pb-error" },
};

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
  /**
   * The primary navigation. It lives in the header row on wide screens and
   * pins itself to the bottom of the viewport on small ones (see NavBar).
   */
  nav?: ReactNode;
}

export default function Header({ onSettingsClick, onHelpClick, syncStatus, leetcodeSync, nav }: Props) {
  const status = SYNC_STATUS[syncStatus] ?? null;

  return (
    // No transform, filter or backdrop-filter here: any of them would make
    // this the containing block for the fixed bottom nav on small screens.
    <header className="sticky top-0 z-[800] border-b border-pb-border-light bg-pb-bg">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-6 px-5 md:px-8">
        <div className="flex shrink-0 items-center gap-2.5">
          <img src="/favicon-32.png" alt="" className="h-6 w-6 rounded-md" />
          <span className="text-[17px] font-bold tracking-tight text-pb-text">PatternBank</span>
        </div>
        {nav}
        <div className="ml-auto flex items-center gap-1">
          {status && (
            <span
              className="mr-2 inline-flex items-center gap-2 text-xs font-medium text-pb-text-muted"
              title={status.label}
              aria-label={status.label}
            >
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
              <span className="max-sm:hidden">{status.label}</span>
            </span>
          )}
          {leetcodeSync && (
            <button
              type="button"
              onClick={leetcodeSync.onSyncNow}
              disabled={leetcodeSync.syncing}
              title={formatLastSynced(leetcodeSync.lastSyncedAt)}
              aria-label="Sync LeetCode activity"
              className={iconButtonClass()}
            >
              <Icon name="sync" className={`h-[18px] w-[18px] ${leetcodeSync.syncing ? "animate-spin" : ""}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onHelpClick}
            title="Help"
            aria-label="Help"
            className={iconButtonClass()}
          >
            <Icon name="help" className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onSettingsClick}
            title="Settings"
            aria-label="Settings"
            className={iconButtonClass()}
          >
            <Icon name="settings" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
