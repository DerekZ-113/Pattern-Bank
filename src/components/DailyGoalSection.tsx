import { useEffect, useState } from "react";
import { Preferences } from "../types";

export interface UpcomingScheduleInfo {
  count: number;
  currentPace: number;
}

interface Props {
  preferences: Preferences;
  onUpdatePreferences: (updates: Partial<Preferences>) => void;
  upcomingScheduleInfo: UpcomingScheduleInfo | null;
  onRequestRespread: () => void;
}

const MIN_GOAL = 1;
const MAX_GOAL = 20;

export default function DailyGoalSection({
  preferences,
  onUpdatePreferences,
  upcomingScheduleInfo,
  onRequestRespread,
}: Props) {
  const goal = preferences.dailyReviewGoal;
  const [draft, setDraft] = useState(String(goal));

  useEffect(() => {
    setDraft(String(goal));
  }, [goal]);

  const commitDraft = () => {
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(goal));
      return;
    }
    const next = Math.min(MAX_GOAL, Math.max(MIN_GOAL, parsed));
    setDraft(String(next));
    if (next !== goal) {
      onUpdatePreferences({ dailyReviewGoal: next });
    }
  };

  const adjustGoal = (delta: number) => {
    const next = Math.min(MAX_GOAL, Math.max(MIN_GOAL, goal + delta));
    if (next !== goal) {
      onUpdatePreferences({ dailyReviewGoal: next });
    }
  };

  // Offer rescheduling only when the goal rose above the pace already baked
  // into upcoming review dates — never on a decrease.
  const showRespread =
    upcomingScheduleInfo !== null && upcomingScheduleInfo.currentPace < goal;

  return (
    <div>
      <label
        htmlFor="daily-goal-input"
        className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted"
      >
        Daily Review Goal
      </label>
      <div className="flex items-center gap-4">
        <button
          onClick={() => adjustGoal(-1)}
          disabled={goal <= MIN_GOAL}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-base font-semibold text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>
        <input
          id="daily-goal-input"
          type="number"
          inputMode="numeric"
          min={MIN_GOAL}
          max={MAX_GOAL}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => e.key === "Enter" && commitDraft()}
          className="h-10 w-16 rounded-lg border border-pb-border bg-transparent text-center text-2xl font-bold text-pb-text [appearance:textfield] focus:border-pb-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          onClick={() => adjustGoal(1)}
          disabled={goal >= MAX_GOAL}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-base font-semibold text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-pb-text-dim">
        Caps how many reviews appear each day, and sets the pace for bulk
        imports — new lists are spread at this rate. You can always see more
        from All Problems.
      </p>
      {showRespread && (
        <div className="mt-3 rounded-lg border border-pb-border bg-pb-bg px-3 py-2.5">
          <p className="text-xs leading-relaxed text-pb-text-muted">
            {upcomingScheduleInfo.count} upcoming problem
            {upcomingScheduleInfo.count !== 1 ? "s are" : " is"} paced at ~
            {upcomingScheduleInfo.currentPace}/day.
          </p>
          <button
            onClick={onRequestRespread}
            className="mt-2 cursor-pointer rounded-lg border-none bg-pb-accent px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-85"
          >
            Reschedule at {goal}/day
          </button>
        </div>
      )}
    </div>
  );
}
