import type { Difficulty } from "../types";

const COLOR_MAP: Record<Difficulty, string> = {
  Easy: "text-pb-easy",
  Medium: "text-pb-medium",
  Hard: "text-pb-hard",
};

interface Props {
  difficulty: Difficulty;
}

// Coloured word, no pill — the way LeetCode itself shows difficulty.
export default function DifficultyBadge({ difficulty }: Props) {
  return (
    <span className={`text-xs font-semibold leading-none ${COLOR_MAP[difficulty] || "text-pb-text-muted"}`}>
      {difficulty}
    </span>
  );
}
