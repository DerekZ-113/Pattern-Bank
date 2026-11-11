interface Props {
  reviewedToday: number;
  /** Today's goal, already capped to what is actually reviewable. */
  effectiveGoal: number;
  totalDueCount: number;
}

/**
 * Today's goal as a row of tiles: accent while a review is still to do, green
 * once it is done. It is also the only place the daily goal is visible
 * outside Settings.
 */
export default function TodayGoalMeter({ reviewedToday, effectiveGoal, totalDueCount }: Props) {
  if (effectiveGoal <= 0) return null;

  const done = Math.min(reviewedToday, effectiveGoal);
  const goalMet = done >= effectiveGoal;
  // Due problems that today's goal will not reach.
  const beyondGoal = Math.max(0, totalDueCount - (effectiveGoal - done));

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
      <div
        role="img"
        aria-label={`${done} of ${effectiveGoal} reviews done today`}
        className="flex flex-wrap gap-1"
      >
        {Array.from({ length: effectiveGoal }, (_, index) => (
          <span
            key={index}
            data-done={index < done}
            className={`h-3.5 w-3.5 rounded-[4px] transition-colors duration-300 ${
              index < done ? "bg-pb-success" : "bg-pb-accent/30"
            }`}
          />
        ))}
      </div>
      <p className="m-0 text-sm text-pb-text-muted">
        <span className="font-semibold text-pb-text">
          {goalMet ? "Goal met" : `${done} of ${effectiveGoal} done`}
        </span>
        {goalMet ? `, ${reviewedToday} done today.` : " today."}
        {beyondGoal > 0 &&
          ` ${beyondGoal} more due ${goalMet ? "if you want to keep going" : "beyond today’s goal"}.`}
      </p>
    </div>
  );
}
