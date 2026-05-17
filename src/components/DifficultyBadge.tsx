import type { Difficulty } from "../types";

const COLOR_MAP: Record<Difficulty, string> = {
  Easy: "border-pb-easy/20 bg-pb-easy/10 text-pb-easy",
  Medium: "border-pb-medium/25 bg-pb-medium/10 text-pb-medium",
  Hard: "border-pb-hard/25 bg-pb-hard/10 text-pb-hard",
};

interface Props {
  difficulty: Difficulty;
}

export default function DifficultyBadge({ difficulty }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-wide ${
        COLOR_MAP[difficulty] || "border-pb-border text-pb-text-muted"
      }`}
    >
      {difficulty}
    </span>
  );
}
