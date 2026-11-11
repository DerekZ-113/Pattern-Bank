// The app's button vocabulary. Buttons used to be ~80 hand-written class
// strings that had drifted apart; every button and button-like link now picks
// a variant here so they stay the same height, radius and weight.
//
// Literal strings throughout so Tailwind's scanner can see every class.

export type ButtonVariant = "primary" | "soft" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border no-underline transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  // The one committing action on a surface: Save, Done, Add.
  primary:
    "border-transparent bg-pb-accent-solid font-semibold text-white hover:bg-pb-accent-solid-hover",
  // A repeated call to action (one per card), so it must not shout.
  soft:
    "border-transparent bg-pb-accent-subtle font-semibold text-pb-accent hover:bg-pb-accent-solid hover:text-white",
  outline:
    "border-pb-border bg-transparent font-medium text-pb-text-muted hover:border-pb-border-strong hover:text-pb-text",
  ghost:
    "border-transparent bg-transparent font-medium text-pb-text-muted hover:bg-pb-surface-hover hover:text-pb-text",
  danger:
    "border-pb-error/40 bg-transparent font-semibold text-pb-error hover:bg-pb-error/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-4 text-[13px]",
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

export function buttonClass(variant: ButtonVariant = "outline", size: ButtonSize = "md"): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}

/** Square, icon-only. Always pair with an aria-label. */
export function iconButtonClass(size: ButtonSize = "md", variant: ButtonVariant = "ghost"): string {
  return `${BASE} ${VARIANTS[variant]} ${ICON_SIZES[size]} shrink-0`;
}
