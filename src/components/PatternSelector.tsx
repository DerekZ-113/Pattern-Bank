import { groupPatternsByCategory, PATTERN_COLORS, getVisiblePatterns } from "../utils/constants";
import InlineError from "./InlineError";

interface Props {
  selected: string[];
  onChange: (patterns: string[]) => void;
  error?: string;
  enabledExtraPatterns?: string[];
}

export default function PatternSelector({ selected, onChange, error, enabledExtraPatterns }: Props) {
  const toggle = (pattern: string) => {
    onChange(
      selected.includes(pattern)
        ? selected.filter((p) => p !== pattern)
        : [...selected, pattern]
    );
  };

  const visiblePatterns = getVisiblePatterns(enabledExtraPatterns ?? []);
  // Also include any patterns already selected on the problem (edit case where
  // the user disabled the extra later, or a custom pattern).
  const selectedNotVisible = selected.filter((s) => !visiblePatterns.includes(s));
  const groups = groupPatternsByCategory([...visiblePatterns, ...selectedNotVisible]);

  const renderButton = (p: string) => {
    const active = selected.includes(p);
    const color = PATTERN_COLORS[p];
    return (
      <button
        key={p}
        type="button"
        aria-pressed={active}
        onClick={() => toggle(p)}
        // A selected pattern wears its own colour; custom ones use the accent.
        style={
          active && color
            ? { borderColor: color.text, backgroundColor: color.bg, color: color.text }
            : undefined
        }
        className={`cursor-pointer rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors duration-150 ${
          active
            ? color
              ? ""
              : "border-pb-accent/60 bg-pb-accent-subtle text-pb-accent"
            : `bg-transparent text-pb-text-muted hover:border-pb-border-strong hover:text-pb-text ${
                error ? "border-pb-error/40" : "border-pb-border"
              }`
        }`}
      >
        {p}
      </button>
    );
  };

  const renderSection = (title: string, patterns: string[], separated: boolean) => (
    <div>
      {separated && <div className="my-2 border-t border-pb-border" />}
      <div className="mb-1.5 mt-2 text-xs font-medium text-pb-text-dim first:mt-0">
        {title}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {patterns.map((p) => renderButton(p))}
      </div>
    </div>
  );

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-pb-text-muted">
        Patterns * (select at least one)
      </label>
      {renderSection("Data Structures", groups.structures, false)}
      {renderSection("Strategies", groups.strategies, true)}
      {groups.custom.length > 0 && renderSection("Your Patterns", groups.custom, true)}
      <InlineError message={error} />
    </div>
  );
}
