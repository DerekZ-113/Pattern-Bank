import { useState } from "react";
import Icon from "./Icon";
import type { ReactNode } from "react";

// The pieces Settings is built from, the way the iPhone app builds its own:
// a group is a card with an optional title above and a note below; inside it
// are rows, with the name on the left and the control on the right.

/** The inside of a row: one height, one padding, wherever a row appears. */
export const SETTINGS_ROW_CLASS = "flex min-h-[52px] w-full items-center justify-between gap-4 px-4 py-2.5";

export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  // A plain block with a heading, not a labelled region: eleven regions would
  // drown the page's landmarks, and headings already let a reader jump.
  return (
    <div data-settings-group>
      {title && (
        <h3 className="m-0 mb-2 px-1 text-[13px] font-semibold text-pb-text-muted">
          {title}
        </h3>
      )}
      <div className="divide-y divide-pb-border-light overflow-hidden rounded-xl border border-pb-border-light bg-pb-surface">
        {children}
      </div>
      {footer && <p className="m-0 mt-2 px-1 text-xs leading-relaxed text-pb-text-dim">{footer}</p>}
    </div>
  );
}

/** A name on the left, its control on the right. */
export function SettingsRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className={SETTINGS_ROW_CLASS}>
      <span className="min-w-0 text-sm text-pb-text">{label}</span>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/** A row that opens in place to show a longer section. */
export function SettingsDisclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`${SETTINGS_ROW_CLASS} cursor-pointer border-none bg-transparent text-left text-sm text-pb-text transition-colors duration-150 hover:bg-pb-surface-hover`}
      >
        <span>{title}</span>
        <Icon
          name="chevronDown"
          className={`h-4 w-4 shrink-0 text-pb-text-dim transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="border-t border-pb-border-light px-4 py-3.5">{children}</div>}
    </div>
  );
}

/** The switch's track and thumb. The row that holds it carries the state. */
export function SettingsSwitchMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ${
        on ? "bg-pb-accent-solid" : "bg-pb-border-strong"
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] rounded-full bg-white transition-transform duration-200 ${
          on ? "translate-x-[19px]" : "translate-x-[3px]"
        }`}
      />
    </span>
  );
}
