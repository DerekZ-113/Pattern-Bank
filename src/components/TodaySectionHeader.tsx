import type { ReactNode } from "react";

interface Props {
  id?: string;
  title: string;
  count?: number | string;
  subcopy?: string;
  children?: ReactNode;
}

export default function TodaySectionHeader({ id, title, count, subcopy, children }: Props) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h2 id={id} className="m-0 text-[15px] font-semibold text-pb-text">{title}</h2>
      {count !== undefined && (
        <span className="text-[13px] font-medium tabular-nums text-pb-text-dim">{count}</span>
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
