const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateOnly(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

export function dateOnlyToUtcMs(dateStr: string): number {
  const { year, month, day } = parseDateOnly(dateStr);
  return Date.UTC(year, month - 1, day);
}

export function todayStr(): string {
  return formatLocalDate(new Date());
}

export function utcToLocalDateStr(isoTimestamp: string | null | undefined): string | null {
  if (!isoTimestamp) return null;
  const d = new Date(isoTimestamp);
  if (isNaN(d.getTime())) return null;
  return formatLocalDate(d);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateOnlyToUtcMs(dateStr) + days * MS_PER_DAY);
  return formatUtcDate(d);
}

export function formatRelativeDate(dateStr: string): string {
  const diffDays = Math.round((dateOnlyToUtcMs(dateStr) - dateOnlyToUtcMs(todayStr())) / MS_PER_DAY);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  return `${diffDays}d`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
