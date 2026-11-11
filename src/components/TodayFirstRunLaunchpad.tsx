import DifficultyBadge from "./DifficultyBadge";
import PatternTag from "./PatternTag";
import ProblemListPicker from "./ProblemListPicker";
import StarPicker from "./StarPicker";
import { buttonClass } from "../utils/buttonStyles";
import type { LeetCodeProblem } from "../types";

interface Props {
  signedIn: boolean;
  onOpenLeetCodeSettings?: () => void;
  onAddClick: () => void;
  onBulkAdd: (problems: LeetCodeProblem[], patternMap?: Map<number, string[]> | null) => void;
  existingProblemNumbers: Set<number>;
}

const steps = [
  {
    title: "Sign in",
    copy: "Save your library and unlock LeetCode Activity setup.",
  },
  {
    title: "Connect LeetCode",
    copy: "Add your public username. No password or extension required.",
  },
  {
    title: "Solve + rate",
    copy: "Accepted solves appear on Today, then confidence schedules review.",
  },
];

export default function TodayFirstRunLaunchpad({
  signedIn,
  onOpenLeetCodeSettings,
  onAddClick,
  onBulkAdd,
  existingProblemNumbers,
}: Props) {
  return (
    <section
      aria-labelledby="today-first-run-title"
      className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="min-w-0">
        <h2
          id="today-first-run-title"
          className="m-0 text-[22px] font-bold leading-tight tracking-tight text-pb-text"
        >
          Start tracking your practice
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-pb-text-muted">
          Connect LeetCode to pull accepted solves automatically, or start manually
          with a problem or curated list.
        </p>

        <ol className="m-0 mt-6 grid list-none gap-x-6 gap-y-4 p-0 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="border-t border-pb-border pt-3">
              <div className="flex items-baseline gap-2">
                <span aria-hidden="true" className="text-[13px] font-semibold tabular-nums text-pb-text-dim">
                  {index + 1}
                </span>
                <h3 className="m-0 text-[13px] font-semibold text-pb-text">{step.title}</h3>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-pb-text-muted">{step.copy}</p>
            </li>
          ))}
        </ol>

        <div className="mt-7 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-pb-border-light bg-pb-surface p-4">
            <h3 className="m-0 mb-1.5 text-[13px] font-semibold text-pb-text">
              Start with LeetCode Activity
            </h3>
            <p className="mb-3.5 text-xs leading-relaxed text-pb-text-muted">
              The fastest setup: sign in, add your public username, then solve on LeetCode.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onOpenLeetCodeSettings} className={buttonClass("primary")}>
                {signedIn ? "Set up LeetCode Activity" : "Sign in to set up LeetCode"}
              </button>
              <button type="button" onClick={onAddClick} className={buttonClass("outline")}>
                Add Problem
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-pb-border-light bg-pb-surface p-4">
            <h3 className="m-0 mb-1.5 text-[13px] font-semibold text-pb-text">Import a curated list</h3>
            <p className="mb-3.5 text-xs leading-relaxed text-pb-text-muted">
              Start with a popular set, already tagged by pattern.
            </p>
            <ProblemListPicker
              existingIds={existingProblemNumbers}
              onBulkAdd={onBulkAdd}
              hideLabel
            />
          </div>
        </div>
      </div>

      {/* A static sample of the card a LeetCode solve becomes. Built from the
          real tag, difficulty and star components so it cannot drift from them. */}
      <div>
        <div className="mb-3 flex items-baseline gap-2">
          <p className="m-0 text-[15px] font-semibold text-pb-text">From LeetCode</p>
          <p className="m-0 ml-auto text-xs text-pb-text-dim">Solved on LC today</p>
        </div>
        <div className="rounded-xl border border-pb-border-light bg-pb-surface p-4">
          <div className="flex items-baseline gap-2">
            <p className="m-0 text-[15px] font-semibold text-pb-text">Two Sum</p>
            <span className="font-mono text-[13px] text-pb-text-dim">#1</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <DifficultyBadge difficulty="Easy" />
            <PatternTag name="Hash Table" />
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-pb-border-light pt-3.5">
            <span className="text-xs font-medium text-pb-text-muted">Rate confidence</span>
            <StarPicker mode="display" size="lg" value={3} label="Sample rating: 3 out of 5 stars" />
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-pb-text-muted">
          The same card becomes your daily action: rate confidence, then PatternBank
          schedules the next review.
        </p>
      </div>
    </section>
  );
}
