// Shared display formatters for LeetCode activity surfaces.

export function formatLastSynced(value?: string | null): string {
  if (!value) return "Not synced yet";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms) || ms < 0) return "Last synced recently";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Last synced just now";
  if (minutes < 60) return `Last synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last synced ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Last synced ${days}d ago`;
}

export function formatClockTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
