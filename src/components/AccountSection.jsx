import { useState } from "react";

export default function AccountSection({
  user,
  onSignInGoogle,
  onSignInGitHub,
  onSignInApple,
  onSignOut,
}) {
  const [authLoading, setAuthLoading] = useState(false);

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

  const email = user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name;
  const initial = (fullName?.[0] || email?.[0] || "?").toUpperCase();

  return (
    <div>
      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
        Account
      </label>

      {user ? (
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
  );
}
