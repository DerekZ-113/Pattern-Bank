export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function formatRelativeDate(dateStr) {
  const today = new Date(todayStr());
  const target = new Date(dateStr);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  return `${diffDays}d`;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
