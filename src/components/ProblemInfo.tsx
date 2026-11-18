import type { Difficulty } from "../types";
import Icon from "./Icon";
import { iconButtonClass } from "../utils/buttonStyles";

interface ProblemInfoForm {
  leetcodeNumber: string | number;
  title: string;
  difficulty: Difficulty;
  url?: string;
}

interface Props {
  form: ProblemInfoForm;
  isEdit: boolean;
  onClear: () => void;
  isDuplicate?: boolean;
}

const DIFF_TEXT: Record<Difficulty, string> = {
  Easy: "text-pb-easy",
  Medium: "text-pb-medium",
  Hard: "text-pb-hard",
};

export default function ProblemInfo({ form, isEdit, onClear, isDuplicate }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-pb-border bg-pb-bg px-3 py-2">
      <span className={`font-mono text-xs font-semibold ${isDuplicate ? "text-pb-text-dim" : "text-pb-text-muted"}`}>
        #{form.leetcodeNumber}
      </span>
      <span className={`flex-1 text-sm font-medium ${isDuplicate ? "text-pb-text-dim line-through" : "text-pb-text"}`}>
        {form.title}
      </span>
      <span className={`text-xs font-semibold ${isDuplicate ? "text-pb-text-dim" : DIFF_TEXT[form.difficulty] ?? "text-pb-hard"}`}>
        {form.difficulty}
      </span>
      {form.url && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); window.open(form.url, "_blank"); }}
          title="Open problem"
          aria-label="Open problem"
          className={iconButtonClass("sm")}
        >
          <Icon name="external" />
        </button>
      )}
      {!isEdit && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selected problem"
          className={iconButtonClass("sm")}
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}
