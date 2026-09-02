import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Confidence } from "../types";

export type StarPickerSize = "xs" | "sm" | "md" | "lg" | "xl";

const STARS: Confidence[] = [1, 2, 3, 4, 5];

// Literal class strings so Tailwind emits them and tests can pin geometry.
// Interactive stars always get the box (tap target); display stars only at
// the two sizes that sit next to interactive rows and must align with them.
const SIZE_CLASSES: Record<StarPickerSize, { glyph: string; box: string; gap: string; displayBox: boolean }> = {
  xs: { glyph: "text-xs", box: "h-5 w-5", gap: "gap-0.5", displayBox: false },
  sm: { glyph: "text-sm", box: "h-6 w-6", gap: "gap-0.5", displayBox: false },
  md: { glyph: "text-base", box: "h-6 w-6", gap: "gap-0.5", displayBox: false },
  lg: { glyph: "text-[19px]", box: "h-7 w-7", gap: "gap-1.5", displayBox: true },
  xl: { glyph: "text-[22px]", box: "h-8 w-8", gap: "gap-1.5", displayBox: true },
};

interface CommonProps {
  size?: StarPickerSize;
  className?: string;
}

interface DisplayProps extends CommonProps {
  mode: "display";
  /** `null` renders every star empty (nothing recorded yet). */
  value: number | null;
  label?: string;
}

interface InteractiveProps extends CommonProps {
  /** Accessible name of the radiogroup. */
  label?: string;
  getStarLabel?: (star: Confidence) => string;
  disabled?: boolean;
  /** Focus the group on mount (after it replaces a trigger button) so keyboard users are not dropped to <body>. */
  autoFocus?: boolean;
}

/** Controlled selection — a Save/Done button elsewhere commits it. */
interface SelectProps extends InteractiveProps {
  mode: "select";
  value: Confidence;
  onChange: (value: Confidence) => void;
}

/** Clicking a star commits immediately; the picker stays disabled while awaiting. */
interface CommitProps extends InteractiveProps {
  mode: "commit";
  value?: Confidence | null;
  onCommit: (value: Confidence) => void | Promise<void>;
}

export type StarPickerProps = DisplayProps | SelectProps | CommitProps;

function defaultStarLabel(star: Confidence): string {
  return `${star} star${star === 1 ? "" : "s"}`;
}

/**
 * The one star control. Every rater in the app (edit modal, review panels,
 * LeetCode cards, Done-today feed) renders through here so fill/preview
 * behaviour cannot drift: `shown = preview ?? pending ?? recorded ?? 0`.
 */
export default function StarPicker(props: StarPickerProps) {
  if (props.mode === "display") {
    const size = SIZE_CLASSES[props.size ?? "md"];
    const value = props.value;
    return (
      <span
        role="img"
        aria-label={props.label ?? `${value ?? 0} out of 5 stars`}
        className={`inline-flex items-center leading-none ${size.gap} ${props.className ?? ""}`}
      >
        {STARS.map((star) => (
          <span
            key={star}
            aria-hidden="true"
            className={`inline-flex items-center justify-center leading-none ${size.displayBox ? size.box : ""} ${size.glyph} ${
              value !== null && star <= value ? "text-pb-star" : "text-pb-star-empty"
            }`}
          >
            ★
          </span>
        ))}
      </span>
    );
  }
  return <InteractiveStarPicker {...props} />;
}

function InteractiveStarPicker(props: SelectProps | CommitProps) {
  const [preview, setPreview] = useState<Confidence | null>(null);
  const [pendingStar, setPendingStar] = useState<Confidence | null>(null);
  const [busy, setBusy] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const group = useRef<HTMLDivElement>(null);

  const size = SIZE_CLASSES[props.size ?? "lg"];
  const recorded: Confidence | null = props.mode === "select" ? props.value : (props.value ?? null);
  const shown = preview ?? pendingStar ?? recorded ?? 0;
  const disabled = !!props.disabled || busy;
  const getStarLabel = props.getStarLabel ?? defaultStarLabel;

  const autoFocus = props.autoFocus;
  useEffect(() => {
    if (autoFocus) group.current?.focus();
  }, [autoFocus]);

  const handleActivate = (star: Confidence) => {
    // aria-disabled (not native disabled) keeps the focused star focusable.
    if (disabled) return;
    if (props.mode === "select") {
      props.onChange(star);
      return;
    }
    if (busy) return;
    setPendingStar(star);
    setBusy(true);
    void (async () => {
      try {
        await props.onCommit(star);
      } catch (err) {
        console.warn("Rating failed:", err);
      } finally {
        setBusy(false);
        setPendingStar(null);
      }
    })();
  };

  // Arrows move focus only — committing on arrow would be destructive on the
  // LeetCode surfaces where a click is the commit.
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(index + 1, STARS.length - 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(index - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = STARS.length - 1;
    if (next === null) return;
    event.preventDefault();
    buttons.current[next]?.focus();
  };

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={props.label ?? "Confidence"}
      aria-busy={busy || undefined}
      tabIndex={autoFocus ? -1 : undefined}
      className={`flex items-center ${size.gap} ${props.className ?? ""}`}
      onMouseLeave={() => setPreview(null)}
    >
      {STARS.map((star, index) => {
        const filled = star <= shown;
        const active = star === shown;
        return (
          <button
            key={star}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={star === recorded}
            aria-label={getStarLabel(star)}
            aria-disabled={disabled}
            onMouseEnter={() => setPreview(star)}
            onFocus={() => setPreview(star)}
            onBlur={() => setPreview(null)}
            onClick={() => handleActivate(star)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`inline-flex ${size.box} cursor-pointer items-center justify-center rounded border p-0 ${size.glyph} leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-70 ${
              filled ? "text-pb-star" : "text-pb-text-muted hover:text-pb-star"
            } ${
              active
                ? "border-pb-star/60 bg-pb-star/10"
                : "border-transparent hover:border-pb-star/40 hover:bg-pb-star/5"
            }`}
          >
            {/* Outline vs filled glyph: state survives colour-vision loss and the
                near-identical luminance of the light-theme yellow and grey. */}
            <span aria-hidden="true" className="block leading-none">
              {filled ? "★" : "☆"}
            </span>
          </button>
        );
      })}
      {props.mode === "select" && (
        <span className="ml-1.5 text-xs text-pb-text-muted">{shown}/5</span>
      )}
    </div>
  );
}
