export default function DailyGoalSection({ preferences, onUpdatePreferences }) {
  const adjustGoal = (delta) => {
    const current = preferences.dailyReviewGoal;
    const next = Math.min(10, Math.max(1, current + delta));
    if (next !== current) {
      onUpdatePreferences({ dailyReviewGoal: next });
    }
  };

  return (
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
  );
}
