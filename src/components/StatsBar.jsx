export default function StatsBar({ total, due, reviewedToday, streak }) {
  const stats = [
    { label: "Total", value: total, color: "text-pb-text" },
    { label: "Due", value: due, color: due > 0 ? "text-pb-star" : "text-pb-text-muted" },
    { label: "Done", value: reviewedToday, color: reviewedToday > 0 ? "text-pb-success" : "text-pb-text-muted" },
    { label: "Streak", value: `${streak}d`, color: streak > 0 ? "text-pb-accent" : "text-pb-text-muted" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-pb-border bg-pb-surface py-2.5 px-2 text-center"
        >
          <div className={`text-lg font-bold leading-tight ${s.color}`}>
            {s.value}
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-pb-text-muted">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
