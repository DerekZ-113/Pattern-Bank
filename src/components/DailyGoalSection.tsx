import { useEffect, useState } from "react";
import { Preferences } from "../types";
import Icon from "./Icon";
import { buttonClass, iconButtonClass } from "../utils/buttonStyles";
import { SettingsGroup, SettingsRow } from "./SettingsGroup";

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
    <SettingsGroup
      title="Daily review goal"
      footer="Caps how many reviews appear on Today each day, and sets the pace for bulk imports — new lists are spread at this rate. You can always review more from Problems."
    >
      <SettingsRow label="Reviews per day">
        <button
          type="button"
          onClick={() => adjustGoal(-1)}
          disabled={goal <= MIN_GOAL}
          aria-label="Decrease daily goal"
          className={iconButtonClass("md", "outline")}
        >
          <Icon name="minus" />
        </button>
        <input
          id="daily-goal-input"
          aria-label="Daily review goal"
          type="number"
          inputMode="numeric"
          min={MIN_GOAL}
          max={MAX_GOAL}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => e.key === "Enter" && commitDraft()}
          className="h-9 w-12 rounded-lg border border-pb-border bg-pb-bg text-center text-base font-semibold tabular-nums text-pb-text outline-none [appearance:textfield] focus:border-pb-accent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => adjustGoal(1)}
          disabled={goal >= MAX_GOAL}
          aria-label="Increase daily goal"
          className={iconButtonClass("md", "outline")}
        >
          <Icon name="plus" />
        </button>
      </SettingsRow>
      {showRespread && (
        <div className="px-4 py-3.5">
          <p className="m-0 text-xs leading-relaxed text-pb-text-muted">
            {upcomingScheduleInfo.count} upcoming problem
            {upcomingScheduleInfo.count !== 1 ? "s are" : " is"} paced at ~
            {upcomingScheduleInfo.currentPace}/day.
          </p>
          <button
            type="button"
            onClick={onRequestRespread}
            className={`${buttonClass("primary", "sm")} mt-2`}
          >
            Reschedule at {goal}/day
          </button>
        </div>
      )}
    </SettingsGroup>
  );
}
