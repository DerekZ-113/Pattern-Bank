import { timestampMs } from "../dateHelpers";
import type { ReviewEvent } from "../types";

export function reviewEventKey(event: ReviewEvent): string {
  return `${event.problemId}|${event.timestamp}`;
}

/**
 * Two events are the same review when their keys match exactly, or when they
 * hit the same problem within 5 seconds ON THE SAME calendar date (legacy
 * timestamp mismatch between platforms). The date gate is canonical core
 * behavior: near-midnight events on different dates are distinct streak days
 * and must both survive a merge.
 */
export function reviewEventsMatch(a: ReviewEvent, b: ReviewEvent): boolean {
  if (reviewEventKey(a) === reviewEventKey(b)) return true;
  if (a.problemId !== b.problemId) return false;
  if (a.date !== b.date) return false;
  const aTime = timestampMs(a.timestamp);
  const bTime = timestampMs(b.timestamp);
  if (!aTime || !bTime) return false;
  return Math.abs(aTime - bTime) < 5000;
}

export interface MergeReviewEventsOptions {
  /**
   * F-3 prune watermark (ISO): cloud events strictly older than this were
   * pruned locally on purpose and are dropped instead of resurrected.
   */
  prunedBefore?: string | null;
}

export interface MergeReviewEventsResult {
  events: ReviewEvent[];
  addedFromCloud: number;
  localOnlyEvents: ReviewEvent[];
}

export function mergeReviewEvents(
  localEvents: ReviewEvent[],
  cloudEvents: ReviewEvent[],
  options: MergeReviewEventsOptions = {},
): MergeReviewEventsResult {
  const watermarkMs = timestampMs(options.prunedBefore);
  const effectiveCloudEvents = watermarkMs
    ? cloudEvents.filter((event) => timestampMs(event.timestamp) >= watermarkMs)
    : cloudEvents;

  const all = [
    ...localEvents.map((event) => ({ event, source: "local" as const })),
    ...effectiveCloudEvents.map((event) => ({ event, source: "cloud" as const })),
  ].sort((a, b) => a.event.timestamp.localeCompare(b.event.timestamp));
  const kept: Array<{ event: ReviewEvent; source: "local" | "cloud" }> = [];

  for (const item of all) {
    if (kept.some((existing) => reviewEventsMatch(existing.event, item.event))) continue;
    kept.push(item);
  }

  let addedFromCloud = 0;
  const localOnlyEvents: ReviewEvent[] = [];

  for (const { event, source } of kept) {
    const hasLocalMatch = localEvents.some((localEvent) => reviewEventsMatch(localEvent, event));
    const hasCloudMatch = effectiveCloudEvents.some((cloudEvent) => reviewEventsMatch(cloudEvent, event));
    if (source === "cloud" && !hasLocalMatch) addedFromCloud++;
    if (source === "local" && !hasCloudMatch) localOnlyEvents.push(event);
  }

  return { events: kept.map(({ event }) => event), addedFromCloud, localOnlyEvents };
}
