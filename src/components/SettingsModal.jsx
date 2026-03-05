import { useState, useEffect, useRef } from "react";
import posthog from "posthog-js";
import BulkAddSection from "./BulkAddSection";
import ProblemListPicker from "./ProblemListPicker";
import { submitFeedback } from "../utils/supabaseData";
import qrAppStore from "../assets/qr-appstore.png";

const APP_STORE_URL = "https://apps.apple.com/app/patternbank/id6759760762";

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
  onSignInApple,
  onSignOut,
}) {
  // const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
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
    // if (!isOpen) setDevToolsOpen(false);
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

  const handleSignInApple = async () => {
    setAuthLoading(true);
    const { error } = await onSignInApple();
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
                    onClick={handleSignInApple}
                    disabled={authLoading}
                    aria-label="Sign in with Apple"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-50"
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

          {/* Mobile App */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Mobile App
            </label>

            {/* Desktop: QR code */}
            <div className="mb-3 hidden flex-col items-center md:flex">
              <div className="mb-2 rounded-xl border border-pb-border bg-white p-3">
                <img
                  src={qrAppStore}
                  alt="Download PatternBank on the App Store"
                  width={148}
                  height={148}
                  className="block"
                />
              </div>
              <span className="text-xs text-pb-text-dim">
                Scan to download on iOS
              </span>
            </div>

            <p className="mb-2.5 text-xs leading-relaxed text-pb-text-dim">
              Your data syncs automatically when signed in.
            </p>

            {/* Mobile: download button */}
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted no-underline transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text md:hidden"
            >
              Download on App Store
            </a>

            {/* Desktop: subtle text link fallback */}
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-xs text-pb-text-dim no-underline transition-colors duration-150 hover:text-pb-accent md:inline-flex md:items-center md:gap-1"
            >
              App Store ↗
            </a>
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

          {/* Import Problem List */}
          <ProblemListPicker
            existingIds={existingProblemNumbers}
            onBulkAdd={(problems, patternMap) => { onBulkAdd(problems, patternMap); onClose(); }}
          />

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
                  onClick={() => { posthog.capture("data_exported", { problem_count: problemCount, platform: "web" }); onExport(); onClose(); }}
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

          {/* Dev Tools — commented out for launch
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
          */}

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
      posthog.capture("feedback_submitted", { platform: "web" });
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
