import type { ReactNode } from "react";

interface Props {
  id?: string;
  title: string;
  count?: number | string;
  subcopy?: string;
  accent?: boolean;
  children?: ReactNode;
}

export default function TodaySectionHeader({ id, title, count, subcopy, accent, children }: Props) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <h2 id={id} className="text-[15px] font-semibold text-pb-text">{title}</h2>
      {count !== undefined && (
        <span
          className={`inline-flex min-w-6 items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            accent
              ? "border-pb-accent/35 bg-pb-accent-subtle text-pb-accent"
              : "border-pb-border bg-pb-surface-2 text-pb-text-muted"
          }`}
        >
          {count}
        </span>
      )}
      {subcopy && (
        <span className="ml-auto text-xs text-pb-text-dim max-sm:hidden">
          {subcopy}
        </span>
      )}
      {children}
    </div>
  );
}
