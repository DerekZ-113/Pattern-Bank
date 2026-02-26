import { useState, useEffect, useRef } from "react";
import BulkAddSection from "./BulkAddSection";
import { submitFeedback } from "../utils/supabaseData";

export default function SettingsModal({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  onExport,
  onImport,
  onSetAllDue,
  onClearAllData,
  onBulkAdd,
  problemCount,
  existingProblemNumbers,
  user,
  onSignInGoogle,
  onSignInGitHub,
  onSignOut,
}) {
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const fileInputRef = useRef(null);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Reset state when modal opens or closes
  useEffect(() => {
    setAuthLoading(false);
    if (!isOpen) setDevToolsOpen(false);
  }, [isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = "";
    }
  };

  const adjustGoal = (delta) => {
    const current = preferences.dailyReviewGoal;
    const next = Math.min(10, Math.max(1, current + delta));
    if (next !== current) {
      onUpdatePreferences({ dailyReviewGoal: next });
    }
  };

  const handleSignInGoogle = async () => {
    setAuthLoading(true);
    const { error } = await onSignInGoogle();
    if (error) {
      setAuthLoading(false);
      console.error("Sign-in error:", error.message);
    }
  };

  const handleSignInGitHub = async () => {
    setAuthLoading(true);
    const { error } = await onSignInGitHub();
    if (error) {
      setAuthLoading(false);
      console.error("Sign-in error:", error.message);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    await onSignOut();
    setAuthLoading(false);
  };

  if (!isOpen) return null;

  // Extract user info from Google metadata
  const email = user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name;
  const initial = (fullName?.[0] || email?.[0] || "?").toUpperCase();

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
          {/* Account */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Account
            </label>

            {user ? (
              /* Signed in state */
              <div className="flex items-center gap-3 rounded-lg border border-pb-border px-3.5 py-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pb-accent-subtle text-sm font-semibold text-pb-accent">
                    {initial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {fullName && (
                    <div className="truncate text-sm font-medium text-pb-text">
                      {fullName}
                    </div>
                  )}
                  <div className="truncate text-xs text-pb-text-muted">
                    {email}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="cursor-pointer rounded-lg border border-pb-border bg-transparent px-3 py-1.5 text-xs font-medium text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              /* Signed out state */
              <div>
                <p className="mb-2.5 text-xs leading-relaxed text-pb-text-dim">
                  Sign in to sync your data across devices.
                </p>
                <div className="flex gap-3">
                  <button
                    disabled={true}
                    aria-label="Sign in with Apple (coming soon)"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  </button>
                  <button
                    onClick={handleSignInGoogle}
                    disabled={authLoading}
                    aria-label="Sign in with Google"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent transition-all duration-150 hover:border-pb-text-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>
                  <button
                    onClick={handleSignInGitHub}
                    disabled={authLoading}
                    aria-label="Sign in with GitHub"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* iOS Version */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              iOS Version
            </label>
            <p className="mb-2.5 text-xs leading-relaxed text-pb-text-dim">
              iOS version available! Sign in to sync your progress across platforms.
            </p>
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
            >
              {showQR ? "Hide QR code" : "Show QR code"}
            </button>
            {showQR && (
              <div className="mt-3 flex justify-center">
                <div className="relative overflow-hidden rounded-lg" style={{ width: 160, height: 160 }}>
                  <img
                    src="data:image/png;base64,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"
                    alt=""
                    className="block h-full w-full"
                    style={{ filter: "blur(8px)" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="rounded-full bg-pb-surface px-4 py-1.5 text-xs font-semibold text-pb-text-muted">
                      Coming soon
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Daily Review Goal */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Daily Review Goal
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => adjustGoal(-1)}
                disabled={preferences.dailyReviewGoal <= 1}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-base font-semibold text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-30"
              >
                −
              </button>
              <span className="min-w-[32px] text-center text-2xl font-bold text-pb-text">
                {preferences.dailyReviewGoal}
              </span>
              <button
                onClick={() => adjustGoal(1)}
                disabled={preferences.dailyReviewGoal >= 10}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-base font-semibold text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-pb-text-dim">
              Maximum reviews shown on your dashboard each day.
              You can always see more from All Problems.
            </p>
          </div>

          {/* Bulk Add */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Bulk Add
            </label>
            <BulkAddSection
              onBulkAdd={(problems) => { onBulkAdd(problems); onClose(); }}
              existingIds={existingProblemNumbers}
            />
          </div>

          {/* Data */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Data
            </label>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              {problemCount > 0 && (
                <button
                  onClick={() => { onExport(); onClose(); }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
                >
                  <span className="text-sm">↓</span>
                  Export Backup
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
              >
                <span className="text-sm">↑</span>
                Import Backup
              </button>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Feedback
            </label>
            <FeedbackSection user={user} />
          </div>

          {/* Dev Tools — collapsible */}
          <div className="border-t border-pb-border pt-4">
            <button
              onClick={() => setDevToolsOpen(!devToolsOpen)}
              className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[13px] font-medium text-pb-text-dim transition-colors duration-150 hover:text-pb-text-muted"
            >
              <span
                className="inline-block text-[10px] transition-transform duration-150"
                style={{ transform: devToolsOpen ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                ▶
              </span>
              Dev Tools
            </button>

            {devToolsOpen && (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={() => { onSetAllDue(); onClose(); }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-dim transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text-muted"
                >
                  Set all problems due today
                </button>
                <button
                  onClick={onClearAllData}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-pb-hard/40 bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-hard/60 transition-all duration-150 hover:border-pb-hard hover:text-pb-hard"
                >
                  Clear all data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackSection({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus("sending");
    const { error } = await submitFeedback(user?.id, message);
    if (error) {
      setStatus("error");
      console.error("Feedback submit failed:", error);
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("sent");
      setMessage("");
      setTimeout(() => {
        setStatus("idle");
        setIsOpen(false);
      }, 2500);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
      >
        {status === "sent" ? "Feedback sent ✓" : "Leave Feedback"}
      </button>
    );
  }

  if (status === "sent") {
    return (
      <div className="rounded-lg border border-pb-success/30 bg-pb-success/8 px-3.5 py-3 text-center text-[13px] text-pb-success">
        Thanks for your feedback!
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-pb-border bg-pb-bg p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-semibold text-pb-text-muted">What's on your mind?</label>
        <button
          onClick={() => { setIsOpen(false); setMessage(""); }}
          className="cursor-pointer border-none bg-transparent px-1 text-xs text-pb-text-dim hover:text-pb-text-muted"
        >
          ✕
        </button>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's working? What's not? Ideas?"
        rows={3}
        autoFocus
        className="w-full resize-y rounded-lg border border-pb-border bg-pb-surface px-3 py-2.5 text-sm font-[inherit] leading-relaxed text-pb-text placeholder:text-pb-text-dim outline-none transition-colors duration-150 focus:border-pb-accent"
      />
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || status === "sending"}
        className="mt-2 w-full cursor-pointer rounded-lg border border-pb-border bg-transparent py-2.5 text-[13px] font-semibold text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "sending" ? "Sending..." : status === "error" ? "Failed — try again" : "Send Feedback"}
      </button>
    </div>
  );
}
