import { PATTERN_COLORS } from "../utils/constants";

interface Props {
  name: string;
}

export default function PatternTag({ name }: Props) {
  const pc = PATTERN_COLORS[name] || { text: "#7c6bf5", bg: "rgba(124,107,245,0.12)" };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none"
      style={{ color: pc.text, backgroundColor: pc.bg, borderColor: pc.text }}
    >
      {name}
    </span>
  );
}
