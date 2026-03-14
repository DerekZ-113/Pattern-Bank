interface Props {
  mode: string;
  onModeChange: (mode: string) => void;
}

export default function ModeToggle({ mode, onModeChange }: Props) {
  return (
    <div className="flex gap-1 rounded-lg bg-pb-bg p-1">
      <button
        onClick={() => onModeChange("leetcode")}
        className={`flex-1 cursor-pointer rounded-md border-none py-1.5 text-[13px] font-semibold transition-all duration-150 ${
          mode === "leetcode"
            ? "bg-pb-accent-subtle text-pb-accent"
            : "bg-transparent text-pb-text-dim hover:text-pb-text-muted"
        }`}
      >
        LeetCode
      </button>
      <button
        onClick={() => onModeChange("custom")}
        className={`flex-1 cursor-pointer rounded-md border-none py-1.5 text-[13px] font-semibold transition-all duration-150 ${
          mode === "custom"
            ? "bg-pb-accent-subtle text-pb-accent"
            : "bg-transparent text-pb-text-dim hover:text-pb-text-muted"
        }`}
      >
        Custom
      </button>
    </div>
  );
}
