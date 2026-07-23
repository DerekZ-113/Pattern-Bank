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
    const pc = PATTERN_COLORS[p] || { text: "#7c6bf5", bg: "rgba(124,107,245,0.12)" };
    return (
      <button
        key={p}
        onClick={() => toggle(p)}
        className="cursor-pointer rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-all duration-150"
        style={{
          borderColor: active
            ? pc.text
            : error
              ? "rgba(248,81,73,0.37)"
              : "#30363d",
          backgroundColor: active ? pc.bg : "transparent",
          color: active ? pc.text : "#8b949e",
        }}
      >
        {p}
      </button>
    );
  };

  const renderSection = (title: string, patterns: string[], separated: boolean) => (
    <div>
      {separated && <div className="my-2 border-t border-pb-border" />}
      <div className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-pb-text-dim first:mt-0">
        {title}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {patterns.map((p) => renderButton(p))}
      </div>
    </div>
  );

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
        Patterns * (select at least one)
      </label>
      {renderSection("Data Structures", groups.structures, false)}
      {renderSection("Strategies", groups.strategies, true)}
      {groups.custom.length > 0 && renderSection("Your Patterns", groups.custom, true)}
      <InlineError message={error} />
    </div>
  );
}
