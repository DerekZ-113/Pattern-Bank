// Text inputs and textareas share one look. Focus shows on the border, so
// fields opt out of the global focus ring with outline-none.
//
// Literal strings throughout so Tailwind's scanner can see every class.

const BASE =
  "w-full rounded-lg border px-3 py-2.5 text-sm text-pb-text outline-none transition-colors duration-150 placeholder:text-pb-text-dim focus:border-pb-accent disabled:opacity-60";

interface FieldOptions {
  error?: boolean;
  /** The field sits inside a `bg-pb-bg` inset, so it takes the surface fill. */
  inset?: boolean;
}

export function fieldClass({ error = false, inset = false }: FieldOptions = {}): string {
  return `${BASE} ${inset ? "bg-pb-surface" : "bg-pb-bg"} ${error ? "border-pb-error" : "border-pb-border"}`;
}
