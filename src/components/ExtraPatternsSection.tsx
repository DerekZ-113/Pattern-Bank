import { EXTRA_PATTERNS, PATTERN_COLORS } from "../utils/constants";
import { SettingsSwitchMark } from "./SettingsGroup";

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
      <div className="-my-2 flex flex-col divide-y divide-pb-border-light">
        {EXTRA_PATTERNS.map((pattern) => {
          const enabled = enabledExtraPatterns.includes(pattern);
          return (
            <button
              key={pattern}
              type="button"
              aria-pressed={enabled}
              onClick={() => onToggle(pattern)}
              className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent py-2 text-left"
            >
              <span
                className={`text-sm font-medium ${enabled ? "text-pb-text" : "text-pb-text-muted"}`}
                style={enabled && PATTERN_COLORS[pattern] ? { color: PATTERN_COLORS[pattern].text } : undefined}
              >
                {pattern}
              </span>
              <SettingsSwitchMark on={enabled} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
