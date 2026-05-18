interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  ariaLabel?: string;
  active?: boolean;
}

export default function FilterSelect({ value, onChange, options, ariaLabel, active = false }: Props) {
  return (
    <div
      data-active-filter={active ? "true" : "false"}
      className="relative min-w-0"
    >
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 w-full cursor-pointer appearance-none rounded-lg border py-0 pr-8 pl-3 text-[13px] outline-none transition-colors duration-150 hover:border-pb-border-strong hover:bg-pb-surface-2 focus:border-pb-accent ${
          active
            ? "border-pb-accent/45 bg-pb-accent-subtle text-pb-accent"
            : "border-pb-border bg-pb-surface text-pb-text"
        }`}
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
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 ${
          active ? "text-pb-accent" : "text-pb-text-dim"
        }`}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
