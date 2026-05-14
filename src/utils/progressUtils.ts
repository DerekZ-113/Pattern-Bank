import { addDays, dateOnlyToUtcMs } from "./dateHelpers";
import type { ReviewLogEntry, ReviewEvent } from "../types";

export const CONFIDENCE_BAR_COLORS = [
  "#f85149", // 1
  "#f0883e", // 2
  "#d29922", // 3
  "#8fbd3a", // 4
  "#3fb950", // 5
];

export function calculateLongestStreak(log: ReviewLogEntry[]): number {
  if (log.length === 0) return 0;
  const dates = [...new Set(log.map((e) => e.date))].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    if (addDays(dates[i - 1], 1) === dates[i]) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function buildReviewCountMap(
  reviewEvents: ReviewEvent[],
  reviewLog: ReviewLogEntry[],
): Map<string, number> {
  const countMap = new Map<string, number>();
  // Primary: actual event counts
  reviewEvents.forEach((e) =>
    countMap.set(e.date, (countMap.get(e.date) ?? 0) + 1),
  );
  // Fallback: legacy dates get count=1 if not already covered
  reviewLog.forEach((e) => {
    if (!countMap.has(e.date)) countMap.set(e.date, 1);
  });
  return countMap;
}

export function getWeekStart(dateStr: string): string {
  const day = new Date(dateOnlyToUtcMs(dateStr)).getUTCDay(); // 0=Sun
  return addDays(dateStr, -day);
}

export function groupEventsByWeek(
  events: ReviewEvent[],
  numWeeks: number,
  startDate: string,
): { weekStart: string; avg: number | null }[] {
  const byWeek = new Map<string, number[]>();
  events.forEach((e) => {
    if (e.date >= startDate) {
      const ws = getWeekStart(e.date);
      const arr = byWeek.get(ws) ?? [];
      arr.push(e.confidence);
      byWeek.set(ws, arr);
    }
  });

  const weeks: { weekStart: string; avg: number | null }[] = [];
  let ws = getWeekStart(startDate);
  for (let i = 0; i < numWeeks; i++) {
    const vals = byWeek.get(ws);
    weeks.push({
      weekStart: ws,
      avg: vals ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    });
    ws = addDays(ws, 7);
  }
  return weeks;
}

export function getConfidenceDistribution(
  confidences: number[],
): [number, number, number, number, number] {
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  confidences.forEach((c) => {
    if (c >= 1 && c <= 5) counts[c - 1]++;
  });
  return counts;
}

export function getTopPatterns(
  patterns: string[][],
  limit: number,
): [string, number][] {
  const map = new Map<string, number>();
  patterns.forEach((pats) =>
    pats.forEach((p) => map.set(p, (map.get(p) ?? 0) + 1)),
  );
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
