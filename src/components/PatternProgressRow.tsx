import { PATTERN_COLORS } from "../utils/constants";

interface Props {
  pattern: string;
  count: number;
  avgConfidence: number;
}

export default function PatternProgressRow({ pattern, count, avgConfidence }: Props) {
  const barWidth = Math.min((avgConfidence / 5) * 100, 100);
  const barColor =
    avgConfidence >= 4 ? "#3fb950" : avgConfidence >= 2.5 ? "#e3b341" : "#f85149";
  const pc = PATTERN_COLORS[pattern] || { text: "#e6edf3" };

  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="min-w-[130px] text-[13px] font-medium"
        style={{ color: pc.text }}
      >
        {pattern}
      </span>
      <div className="flex-1 h-1.5 rounded-sm bg-pb-bg overflow-hidden">
        <div
          className="h-full rounded-sm transition-[width] duration-300"
          style={{ width: `${barWidth}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="min-w-[20px] text-right text-xs text-pb-text-muted">
        {count}
      </span>
      <span className="min-w-[50px] text-right text-xs text-pb-star">
        {avgConfidence.toFixed(1)} ★
      </span>
    </div>
  );
}
