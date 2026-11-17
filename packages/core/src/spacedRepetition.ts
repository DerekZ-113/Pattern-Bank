import { dateOnlyToUtcMs, todayStr } from "./dateHelpers";
import type { Confidence, Problem } from "./types";

// V2 base intervals based on confidence rating.
// Explicit 5-star reviews can graduate beyond this base interval.
export const INTERVALS: Record<Confidence, number> = { 1: 1, 2: 2, 3: 5, 4: 10, 5: 30 };
export const FIVE_STAR_GRADUATION_INTERVALS = [30, 60, 120, 240, 365] as const;

export function getIntervalDays(confidence: Confidence): number {
  return INTERVALS[confidence] || 1;
}

export function getDefaultFiveStarStreak(confidence: number): number {
  return confidence === 5 ? 1 : 0;
}

export function getFiveStarGraduationIntervalDays(streak: number): number {
  if (streak <= 1) return FIVE_STAR_GRADUATION_INTERVALS[0];
  if (streak === 2) return FIVE_STAR_GRADUATION_INTERVALS[1];
  if (streak === 3) return FIVE_STAR_GRADUATION_INTERVALS[2];
  if (streak === 4) return FIVE_STAR_GRADUATION_INTERVALS[3];
  return FIVE_STAR_GRADUATION_INTERVALS[4];
}

export function getPreviousFiveStarStreak(problem: Problem): number {
  if (problem.confidence !== 5) return 0;
  return problem.fiveStarStreak ?? getDefaultFiveStarStreak(problem.confidence);
}

export function getNextFiveStarStreak(problem: Problem, newConfidence: Confidence): number {
  if (newConfidence !== 5) return 0;
  return getPreviousFiveStarStreak(problem) + 1;
}

export function getReviewIntervalDays(problem: Problem, newConfidence: Confidence): number {
  if (newConfidence !== 5) return getIntervalDays(newConfidence);
  return getFiveStarGraduationIntervalDays(getNextFiveStarStreak(problem, newConfidence));
}

// ============================================================
// Priority algorithm for daily review cap
// ============================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A problem's fixed place on a ring of 2^32 points, taken from its id.
// FNV-1a over the id's UTF-16 code units, then a 32-bit finalizer so ids that
// differ in one character land far apart. Unsigned 32-bit arithmetic that
// wraps; no floating point, so every platform computes the same value.
export function ringPosition(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Whole days from 1970-01-01 to `today`, reading the date-only string as UTC
// midnight. A string that is not a date counts as day 0.
export function dayNumber(today: string): number {
  const ms = dateOnlyToUtcMs(today);
  return Number.isFinite(ms) ? Math.floor(ms / MS_PER_DAY) : 0;
}

// Where the day's turn starts on the ring. Each day it moves 61.8% of the way
// round (0x9E3779B9 is 2^32 divided by the golden ratio), which spreads
// consecutive days as evenly as a rule with no memory can.
export function rotationPointer(today: string): number {
  return Math.imul(dayNumber(today), 0x9e3779b9) >>> 0;
}

// Distance from the day's pointer forward to the problem, wrapping at 2^32.
// Cards are taken in ascending order of this key.
export function rotationKey(id: string, today: string): number {
  return (ringPosition(id) - rotationPointer(today)) >>> 0;
}

// Takes already-filtered due problems and returns the top `limit` by priority.
// Sort order:
//   1. Lowest confidence first (weakest problems surface first)
//   2. Overdue before due today (so a card dismissed yesterday waits its turn)
//   3. Rotation key (cards inside a level take turns from day to day; the
//      order is fixed within a day, so reviewing one card moves no other)
//   4. Id, by UTF-16 code units (only when two ids share a rotation key)
export function prioritizeProblems(dueProblems: Problem[], limit: number, today = todayStr()): Problem[] {
  if (!dueProblems.length || limit <= 0) return [];

  const pointer = rotationPointer(today);
  const keyed = dueProblems.map((problem) => ({
    problem,
    confidence: problem.confidence || 3,
    dueToday: problem.nextReviewDate < today ? 0 : 1,
    key: (ringPosition(problem.id) - pointer) >>> 0,
  }));

  keyed.sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence - b.confidence;
    if (a.dueToday !== b.dueToday) return a.dueToday - b.dueToday;
    if (a.key !== b.key) return a.key - b.key;
    if (a.problem.id < b.problem.id) return -1;
    if (a.problem.id > b.problem.id) return 1;
    return 0;
  });

  return keyed.slice(0, limit).map((entry) => entry.problem);
}
