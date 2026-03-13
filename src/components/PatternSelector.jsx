import { PATTERNS, PATTERN_COLORS } from "../utils/constants";
import InlineError from "./InlineError";

export default function PatternSelector({ selected, onChange, error }) {
  const toggle = (pattern) => {
    onChange(
      selected.includes(pattern)
        ? selected.filter((p) => p !== pattern)
        : [...selected, pattern]
    );
  };

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
        Patterns * (select at least one)
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {PATTERNS.map((p) => {
          const active = selected.includes(p);
          const pc = PATTERN_COLORS[p];
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
        })}
      </div>
      <InlineError message={error} />
    </div>
  );
}
