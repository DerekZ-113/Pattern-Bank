interface Props {
  signedIn: boolean;
  onOpenSettings?: () => void;
  onDismiss?: () => void;
}

export default function TodayLeetCodeIntroCard({
  signedIn,
  onOpenSettings,
  onDismiss,
}: Props) {
  return (
    <section
      aria-labelledby="today-leetcode-intro-title"
      className="relative overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface px-4 py-4"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-pb-accent" />
      <div className="flex items-start gap-4 max-sm:flex-col">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-pb-accent/35 bg-pb-accent-subtle text-xs font-semibold text-pb-accent"
            >
              LC
            </span>
            <h2 id="today-leetcode-intro-title" className="text-[15px] font-semibold text-pb-text">
              New in V2: LeetCode Activity
            </h2>
          </div>
          <p className="max-w-[680px] text-[13px] leading-relaxed text-pb-text-muted">
            Add your public LeetCode username to automatically track accepted solves and rate them in PatternBank.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
          <button
            type="button"
            onClick={onOpenSettings}
            className="h-9 cursor-pointer rounded-lg border border-pb-accent/40 bg-pb-accent-subtle px-3 text-[13px] font-semibold text-pb-accent transition-colors hover:bg-pb-accent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent max-sm:flex-1"
          >
            {signedIn ? "Set up LeetCode Activity" : "Sign in to set up LeetCode"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss V2 LeetCode Activity intro"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-lg leading-none text-pb-text-dim transition-colors hover:border-pb-border-strong hover:text-pb-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
          >
            ×
          </button>
        </div>
      </div>
    </section>
  );
}
