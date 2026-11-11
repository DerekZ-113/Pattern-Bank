import Icon from "./Icon";

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
        className={`h-9 w-full cursor-pointer appearance-none rounded-lg border bg-pb-surface py-0 pr-8 pl-3 text-[13px] outline-none transition-colors duration-150 hover:border-pb-border-strong focus:border-pb-accent ${
          active
            ? "border-pb-accent/60 font-medium text-pb-accent"
            : "border-pb-border text-pb-text"
        }`}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-pb-surface font-normal text-pb-text"
          >
            {opt.label}
          </option>
        ))}
      </select>
      <span
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${
          active ? "text-pb-accent" : "text-pb-text-dim"
        }`}
      >
        <Icon name="chevronDown" className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
