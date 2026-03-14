interface Props {
  title: string;
  count?: number;
}

export default function SectionHeader({ title, count }: Props) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-[15px] font-semibold text-pb-text">{title}</h2>
      {count !== undefined && (
        <span className="rounded-[10px] bg-pb-bg px-2 py-px text-xs font-semibold text-pb-text-muted">
          {count}
        </span>
      )}
    </div>
  );
}
