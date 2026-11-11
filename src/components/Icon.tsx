import type { ReactNode } from "react";

// One small stroke-icon set so controls stop borrowing text glyphs (⚙ ↻ × ↗)
// that render at different weights and baselines in every font.
const ICONS = {
  settings: (
    <>
      <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="8" cy="17" r="2.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.7 2.2c-.8.4-1.3 1-1.3 1.9" />
      <path d="M12 16.7v.01" />
    </>
  ),
  sync: (
    <>
      <path d="M19.4 9A8 8 0 0 0 5.4 7.4L4 9" />
      <path d="M4 4.5V9h4.5" />
      <path d="M4.6 15a8 8 0 0 0 14 1.6L20 15" />
      <path d="M20 19.5V15h-4.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  external: (
    <>
      <path d="M9 7h8v8" />
      <path d="M17 7 7 17" />
    </>
  ),
  check: <path d="M5 12.5 9.5 17 19 7.5" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="m6.5 7 .8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  // "Excluded from reviews": the no-entry sign.
  exclude: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.7 5.7 12.6 12.6" />
    </>
  ),
  note: (
    <>
      <path d="M6 4h9l4 4v12H6z" />
      <path d="M9 12h7M9 16h5" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7 10.5 5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="m7 9.5 5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5v.01" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  /** Tailwind size (and any other) classes; defaults to 16px. */
  className?: string;
}

/** Decorative by design: the control that contains it carries the label. */
export default function Icon({ name, className = "h-4 w-4" }: Props) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}
