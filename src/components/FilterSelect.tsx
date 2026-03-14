interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}

export default function FilterSelect({ value, onChange, options }: Props) {
  return (
    <div className="relative min-w-[130px] flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-lg border border-pb-border bg-pb-surface py-2 pr-7 pl-2.5 text-[13px] text-pb-text outline-none transition-colors duration-150 focus:border-pb-accent"
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-pb-surface text-pb-text"
          >
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-pb-text-dim">
        ▼
      </span>
    </div>
  );
}
