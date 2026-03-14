import { PATTERN_COLORS } from "../utils/constants";

interface Props {
  name: string;
}

export default function PatternTag({ name }: Props) {
  const pc = PATTERN_COLORS[name] || { text: "#7c6bf5", bg: "rgba(124,107,245,0.12)" };

  return (
    <span
      className="rounded px-2 py-0.5 text-[11px] font-medium"
      style={{ color: pc.text, backgroundColor: pc.bg }}
    >
      {name}
    </span>
  );
}
