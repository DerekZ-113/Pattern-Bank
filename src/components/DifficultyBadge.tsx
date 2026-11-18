import type { Difficulty } from "../types";

const COLOR_MAP: Record<Difficulty, string> = {
  Easy: "text-pb-easy",
  Medium: "text-pb-medium",
  Hard: "text-pb-hard",
};

interface Props {
  difficulty: Difficulty;
  /** Placement only (alignment, grid cell); the look is fixed here. */
  className?: string;
}

// A coloured word with no pill or border, the way LeetCode shows difficulty.
// It stays plain on purpose: pattern tags are the bordered chips, so a boxed
// difficulty would read as one more tag.
export default function DifficultyBadge({ difficulty, className = "" }: Props) {
  return (
    <span
      className={`text-xs font-semibold leading-none ${COLOR_MAP[difficulty] || "text-pb-text-muted"} ${className}`}
    >
      {difficulty}
    </span>
  );
}
