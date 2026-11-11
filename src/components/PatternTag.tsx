import { PATTERN_COLORS } from "../utils/constants";

interface Props {
  name: string;
}

// A pattern's colour is its identity: the same hue wherever the pattern shows
// up, and the same as in the iOS app. It is looked up here, never chosen at
// the call site. Patterns without an entry (custom ones) take the accent.
export default function PatternTag({ name }: Props) {
  const color = PATTERN_COLORS[name];

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-[3px] text-xs font-medium leading-none ${
        color ? "" : "border-pb-accent/40 bg-pb-accent-subtle text-pb-accent"
      }`}
      style={
        color
          ? {
              color: color.text,
              backgroundColor: color.bg,
              // A softened edge in the pattern's own hue.
              borderColor: `color-mix(in oklab, ${color.text} 40%, transparent)`,
            }
          : undefined
      }
    >
      {name}
    </span>
  );
}
