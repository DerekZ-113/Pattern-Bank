import { EXTRA_PATTERNS, PATTERN_COLORS } from "../utils/constants";

interface Props {
  enabledExtraPatterns: string[];
  onToggle: (pattern: string) => void;
  hideLabel?: boolean;
}

export default function ExtraPatternsSection({ enabledExtraPatterns, onToggle, hideLabel }: Props) {
  return (
    <div>
      {!hideLabel && (
        <>
          <label className="mb-1.5 block text-[13px] font-semibold text-pb-text-muted">
            Additional Patterns
          </label>
          <p className="mb-3 text-xs leading-relaxed text-pb-text-dim">
            Enable extra pattern categories for tracking.
          </p>
        </>
      )}
      <div className="flex flex-col gap-1.5">
        {EXTRA_PATTERNS.map((pattern) => {
          const enabled = enabledExtraPatterns.includes(pattern);
          return (
            <button
              key={pattern}
              type="button"
              aria-pressed={enabled}
              onClick={() => onToggle(pattern)}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-pb-border bg-transparent px-3 py-2 text-left transition-colors duration-150 hover:border-pb-text-muted"
            >
              <span
                className={`text-sm font-medium ${enabled ? "text-pb-text" : "text-pb-text-muted"}`}
                style={enabled && PATTERN_COLORS[pattern] ? { color: PATTERN_COLORS[pattern].text } : undefined}
              >
                {pattern}
              </span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                  enabled ? "bg-pb-accent-solid" : "bg-pb-border-strong"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${
                    enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
