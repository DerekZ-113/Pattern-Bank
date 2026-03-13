export default function ProblemInfo({ form, isEdit, onClear }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-pb-border bg-pb-bg px-3 py-2.5">
      <span className="text-xs font-semibold text-pb-text-muted">
        #{form.leetcodeNumber}
      </span>
      <span className="flex-1 text-sm font-medium text-pb-text">
        {form.title}
      </span>
      <span
        className={`text-[11px] font-semibold uppercase ${
          form.difficulty === "Easy"
            ? "text-pb-easy"
            : form.difficulty === "Medium"
              ? "text-pb-medium"
              : "text-pb-hard"
        }`}
      >
        {form.difficulty}
      </span>
      {!isEdit && (
        <button
          onClick={onClear}
          className="cursor-pointer border-none bg-transparent text-xs text-pb-text-dim hover:text-pb-text-muted"
        >
          ✕
        </button>
      )}
    </div>
  );
}
