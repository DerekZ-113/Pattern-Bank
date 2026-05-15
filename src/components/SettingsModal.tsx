import { useState, useEffect } from "react";
import useTheme from "../hooks/useTheme";
import AccountSection from "./AccountSection";
import MobileAppSection from "./MobileAppSection";
import DailyGoalSection from "./DailyGoalSection";
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

function CollapsibleSection({ title, defaultOpen = false, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent py-0 text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted"
      >
        <span>{title}</span>
        <span
          className="text-[20px] text-pb-text-muted transition-transform duration-150"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▸
        </span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

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
}: Props) {
  const { theme, toggleTheme } = useTheme();

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[420px] overflow-y-auto rounded-[14px] border border-pb-border bg-pb-surface max-sm:max-h-screen max-sm:max-w-full max-sm:rounded-none sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pb-border px-6 py-4">
          <h2 className="text-base font-semibold text-pb-text">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-xl leading-none text-pb-text-muted hover:text-pb-text"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6 px-6 py-5">
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

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Theme
            </label>
            <div className="flex overflow-hidden rounded-lg border border-pb-border">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={theme !== t ? toggleTheme : undefined}
                  className={`flex-1 cursor-pointer border-none px-3 py-2 text-sm font-medium capitalize transition-colors duration-150 ${
                    theme === t
                      ? "bg-pb-accent text-white"
                      : "bg-transparent text-pb-text-muted hover:text-pb-text"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <MobileAppSection />

          <DailyGoalSection
            preferences={preferences}
            onUpdatePreferences={onUpdatePreferences}
          />

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Hide Patterns During Review
            </label>
            <button
              onClick={() => onUpdatePreferences({ hidePatternsDuringReview: !preferences.hidePatternsDuringReview })}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-pb-border bg-transparent px-3 py-2.5 text-left transition-colors duration-150 hover:border-pb-text-muted"
            >
              <span className="text-sm text-pb-text">
                {preferences.hidePatternsDuringReview ? "On" : "Off"}
              </span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                  preferences.hidePatternsDuringReview ? "bg-pb-accent" : "bg-pb-border"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${
                    preferences.hidePatternsDuringReview ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </span>
            </button>
            <p className="mt-2 text-xs leading-relaxed text-pb-text-dim">
              Test your pattern recognition — tap to reveal on each card.
            </p>
          </div>

          <CollapsibleSection title="Additional Patterns">
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
          </CollapsibleSection>

          <CollapsibleSection title="Import Problem List">
            <ProblemListPicker
              hideLabel
              existingIds={existingProblemNumbers}
              onBulkAdd={(problems, patternMap) => { onBulkAdd(problems, patternMap); onClose(); }}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Bulk Add">
            <BulkAddSection
              onBulkAdd={(problems) => { onBulkAdd(problems); onClose(); }}
              existingIds={existingProblemNumbers}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Data">
            <DataSection
              hideLabel
              problemCount={problemCount}
              onExport={onExport}
              onImport={onImport}
              onClose={onClose}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Feedback">
            <FeedbackSection user={user} />
          </CollapsibleSection>

          <CollapsibleSection title="Danger Zone">
            <DangerZoneSection
              hideLabel
              onSetAllDue={onSetAllDue}
              onRequestClearData={onRequestClearData}
            />
          </CollapsibleSection>

          {/* Built by footer */}
          <div className="border-t border-pb-border pt-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[14px] text-pb-text-dim">Built by Derek Zhang</span>
              <a
                href="https://linkedin.com/in/derekz113"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Derek Zhang on LinkedIn"
                className="inline-flex text-pb-text-dim transition-colors duration-150 hover:text-pb-accent"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
