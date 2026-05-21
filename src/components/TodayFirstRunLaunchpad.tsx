import ProblemListPicker from "./ProblemListPicker";
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
      className="overflow-hidden rounded-[12px] border border-pb-border bg-pb-surface"
    >
      <div className="h-0.5 bg-gradient-to-r from-transparent via-pb-accent to-transparent" />
      <div className="grid gap-6 px-5 py-5 md:px-6 md:py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-pb-accent">
              PatternBank V2
            </p>
            <h2
              id="today-first-run-title"
              className="text-[22px] font-semibold leading-tight tracking-normal text-pb-text"
            >
              Start tracking your practice
            </h2>
            <p className="mt-2 max-w-[680px] text-[13px] leading-relaxed text-pb-text-muted">
              Connect LeetCode to pull accepted solves automatically, or start manually
              with a problem or curated list.
            </p>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-[10px] border border-pb-border bg-pb-bg/70 p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-pb-accent/35 bg-pb-accent-subtle text-[11px] font-semibold text-pb-accent">
                    {index + 1}
                  </span>
                  <h3 className="text-[13px] font-semibold text-pb-text">{step.title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-pb-text-muted">{step.copy}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)]">
            <div className="rounded-[10px] border border-pb-border bg-pb-bg/70 p-4">
              <h3 className="mb-1.5 text-[13px] font-semibold text-pb-text">
                Start with LeetCode Activity
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-pb-text-muted">
                The fastest V2 setup is sign in, public username, then solve on LeetCode.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenLeetCodeSettings}
                  className="h-9 cursor-pointer rounded-lg border border-pb-accent/40 bg-pb-accent px-3.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
                >
                  {signedIn ? "Set up LeetCode Activity" : "Sign in to set up LeetCode"}
                </button>
                <button
                  type="button"
                  onClick={onAddClick}
                  className="h-9 cursor-pointer rounded-lg border border-pb-border bg-transparent px-3.5 text-[13px] font-semibold text-pb-text-muted transition-colors hover:border-pb-border-strong hover:text-pb-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
                >
                  Add Problem
                </button>
              </div>
            </div>

            <div className="rounded-[10px] border border-pb-border bg-pb-bg/70 p-4">
              <h3 className="mb-1.5 text-[13px] font-semibold text-pb-text">Import a curated list</h3>
              <p className="mb-3 text-xs leading-relaxed text-pb-text-muted">
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

        <div className="rounded-[10px] border border-pb-border bg-pb-bg p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pb-accent">
                From LeetCode
              </p>
              <p className="mt-1 text-xs text-pb-text-dim">Solved on LC today</p>
            </div>
            <span className="rounded-full border border-pb-accent/35 bg-pb-accent-subtle px-2 py-0.5 text-xs font-semibold text-pb-accent">
              Preview
            </span>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface">
            <div className="h-0.5 bg-pb-accent" />
            <div className="p-4">
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="text-[15px] font-semibold text-pb-text">Two Sum</h3>
                <span className="text-[13px] font-semibold text-pb-text-dim">#1</span>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-lg border border-pb-easy/25 bg-pb-easy/12 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-pb-easy">
                  Easy
                </span>
                <span className="rounded-full border border-pb-pattern-hash-table-text/35 bg-pb-pattern-hash-table-bg px-2.5 py-1 text-xs font-semibold text-pb-pattern-hash-table-text">
                  Hash Table
                </span>
              </div>
              <div className="border-t border-dashed border-pb-border pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-pb-text-muted">Rate confidence</span>
                  <div aria-hidden="true" className="flex gap-1 text-[19px] leading-none text-pb-star">
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span className="text-pb-star-empty">★</span>
                    <span className="text-pb-star-empty">★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-pb-text-muted">
            The same card becomes your daily action: rate confidence, then PatternBank
            schedules the next review.
          </p>
        </div>
      </div>
    </section>
  );
}
