import useDialogFocus from "../hooks/useDialogFocus";
import { useEffect } from "react";
import useTheme from "../hooks/useTheme";
import Icon from "./Icon";
import { iconButtonClass } from "../utils/buttonStyles";
import { SETTINGS_ROW_CLASS, SettingsDisclosure, SettingsGroup, SettingsRow, SettingsSwitchMark } from "./SettingsGroup";
import AccountSection from "./AccountSection";
import MobileAppSection from "./MobileAppSection";
import DailyGoalSection from "./DailyGoalSection";
import type { UpcomingScheduleInfo } from "./DailyGoalSection";
import ProblemListPicker from "./ProblemListPicker";
import BulkAddSection from "./BulkAddSection";
import DataSection from "./DataSection";
import FeedbackSection from "./FeedbackSection";
import DangerZoneSection from "./DangerZoneSection";
import ExtraPatternsSection from "./ExtraPatternsSection";
import LeetCodeActivitySection from "./LeetCodeActivitySection";
import type { User } from "@supabase/supabase-js";
import type { Preferences, LeetCodeProblem } from "../types";
import type { UseLeetCodeActivityState } from "../hooks/useLeetCodeActivity";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preferences: Preferences;
  onUpdatePreferences: (updates: Partial<Preferences>) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onBulkAdd: (problems: LeetCodeProblem[], patternMap?: Map<number, string[]> | null) => void;
  problemCount: number;
  existingProblemNumbers: Set<number>;
  user: User | null;
  leetcodeActivity: UseLeetCodeActivityState;
  onSignInGoogle: () => Promise<{ error: Error | null }>;
  onSignInGitHub: () => Promise<{ error: Error | null }>;
  onSignInApple: () => Promise<{ error: Error | null }>;
  onSignOut: () => Promise<void>;
  onSetAllDue: () => void;
  onRequestClearData: () => void;
  upcomingScheduleInfo: UpcomingScheduleInfo | null;
  onRequestRespread: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  onExport,
  onImport,
  onBulkAdd,
  problemCount,
  existingProblemNumbers,
  user,
  leetcodeActivity,
  onSignInGoogle,
  onSignInGitHub,
  onSignInApple,
  onSignOut,
  onSetAllDue,
  onRequestClearData,
  upcomingScheduleInfo,
  onRequestRespread,
}: Props) {
  const { theme, toggleTheme } = useTheme();

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const panelRef = useDialogFocus<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 max-sm:p-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" className="outline-none w-full max-w-[440px] overflow-y-auto rounded-xl border border-pb-border bg-pb-bg max-sm:h-full max-sm:max-h-screen max-sm:max-w-full max-sm:rounded-none max-sm:border-0 sm:max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-pb-border-light bg-pb-bg px-5 py-3.5">
          <h2 id="settings-modal-title" className="text-base font-semibold text-pb-text">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className={iconButtonClass("sm")}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-4 pb-6 pt-5 sm:px-5">
          <AccountSection
            user={user}
            onSignInGoogle={onSignInGoogle}
            onSignInGitHub={onSignInGitHub}
            onSignInApple={onSignInApple}
            onSignOut={onSignOut}
          />

          <LeetCodeActivitySection
            user={user}
            connection={leetcodeActivity.connection}
            loading={leetcodeActivity.loading}
            actionLoading={leetcodeActivity.actionLoading}
            error={leetcodeActivity.error}
            onConnect={leetcodeActivity.connect}
            onSyncNow={leetcodeActivity.syncNow}
            onDisconnect={leetcodeActivity.disconnect}
          />

          <SettingsGroup title="Appearance">
            <SettingsRow label="Theme">
              <div className="inline-flex rounded-lg border border-pb-border bg-pb-bg p-0.5">
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={theme === t}
                    onClick={theme !== t ? toggleTheme : undefined}
                    className={`h-8 cursor-pointer rounded-md border-none px-3.5 text-[13px] font-medium transition-colors duration-150 ${
                      theme === t
                        ? "bg-pb-accent-solid text-white"
                        : "bg-transparent text-pb-text-muted hover:text-pb-text"
                    }`}
                  >
                    {t === "dark" ? "Dark" : "Light"}
                  </button>
                ))}
              </div>
            </SettingsRow>
          </SettingsGroup>

          <DailyGoalSection
            preferences={preferences}
            onUpdatePreferences={onUpdatePreferences}
            upcomingScheduleInfo={upcomingScheduleInfo}
            onRequestRespread={onRequestRespread}
          />

          <SettingsGroup
            title="Review"
            footer="Test your pattern recognition — tap to reveal on each card."
          >
            <button
              type="button"
              role="switch"
              aria-checked={preferences.hidePatternsDuringReview}
              onClick={() => onUpdatePreferences({ hidePatternsDuringReview: !preferences.hidePatternsDuringReview })}
              className={`${SETTINGS_ROW_CLASS} cursor-pointer border-none bg-transparent text-left transition-colors duration-150 hover:bg-pb-surface-hover`}
            >
              <span className="text-sm text-pb-text">Hide patterns during review</span>
              <SettingsSwitchMark on={preferences.hidePatternsDuringReview} />
            </button>
          </SettingsGroup>

          <SettingsGroup footer="Enable extra pattern categories for tracking.">
            <SettingsDisclosure title="Additional patterns">
              <ExtraPatternsSection
                hideLabel
                enabledExtraPatterns={preferences.enabledExtraPatterns}
                onToggle={(pattern) => {
                  const current = preferences.enabledExtraPatterns;
                  const updated = current.includes(pattern)
                    ? current.filter((p) => p !== pattern)
                    : [...current, pattern];
                  onUpdatePreferences({ enabledExtraPatterns: updated });
                }}
              />
            </SettingsDisclosure>
          </SettingsGroup>

          <SettingsGroup>
            <SettingsDisclosure title="Import problem list">
              <ProblemListPicker
                hideLabel
                existingIds={existingProblemNumbers}
                onBulkAdd={(problems, patternMap) => { onBulkAdd(problems, patternMap); onClose(); }}
              />
            </SettingsDisclosure>
            <SettingsDisclosure title="Bulk add">
              <BulkAddSection
                onBulkAdd={(problems) => { onBulkAdd(problems); onClose(); }}
                existingIds={existingProblemNumbers}
              />
            </SettingsDisclosure>
          </SettingsGroup>

          <SettingsGroup>
            <SettingsDisclosure title="Data">
              <DataSection
                hideLabel
                problemCount={problemCount}
                onExport={onExport}
                onImport={onImport}
                onClose={onClose}
              />
            </SettingsDisclosure>
            <SettingsDisclosure title="Feedback">
              <FeedbackSection user={user} />
            </SettingsDisclosure>
          </SettingsGroup>

          <MobileAppSection />

          <SettingsGroup>
            <SettingsDisclosure title="Danger zone">
              <DangerZoneSection
                hideLabel
                onSetAllDue={onSetAllDue}
                onRequestClearData={onRequestClearData}
              />
            </SettingsDisclosure>
          </SettingsGroup>

          <SettingsGroup title="About">
            <a
              href="https://linkedin.com/in/derekz113"
              target="_blank"
              rel="noopener noreferrer"
              className={`${SETTINGS_ROW_CLASS} text-sm text-pb-text no-underline transition-colors duration-150 hover:bg-pb-surface-hover`}
            >
              <span>
                Built by Derek Zhang
                <span className="sr-only">, on LinkedIn</span>
              </span>
              <Icon name="external" className="h-4 w-4 shrink-0 text-pb-text-dim" />
            </a>
          </SettingsGroup>
        </div>
      </div>
    </div>
  );
}
