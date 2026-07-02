import { INTERVALS } from "@patternbank/core";
import type { Confidence } from "../types";

export type Distribution = [number, number, number, number, number];

export interface ProjectionDay {
  day: number;
  distribution: Distribution;
}

export type ProjectionSnapshot = ProjectionDay;

export interface ProjectionSeriesOptions {
  startDistribution: Distribution;
  dailyGoal: number;
  newPerWeek: number;
  days?: number;
  seed?: number;
  advanceRate?: number;
}

interface SimProblem {
  confidence: Confidence;
  dueDay: number;
}

// Mulberry32 seeded PRNG — deterministic for testing and stable useMemo
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toDistribution(problems: SimProblem[]): Distribution {
  const d: Distribution = [0, 0, 0, 0, 0];
  for (const p of problems) {
    d[p.confidence - 1]++;
  }
  return d;
}

export function simulateProjection(
  startDistribution: Distribution,
  dailyGoal: number,
  newPerWeek: number,
  days: number = 30,
  seed: number = 42,
): ProjectionSnapshot[] {
  const series = simulateProjectionSeries({
    startDistribution,
    dailyGoal,
    newPerWeek,
    days,
    seed,
    advanceRate: 1,
  });
  const snapshotDays = [0, 10, 20, days];
  return series.filter((day) => snapshotDays.includes(day.day));
}

export function simulateProjectionSeries({
  startDistribution,
  dailyGoal,
  newPerWeek,
  days = 30,
  seed = 42,
  advanceRate = 1,
}: ProjectionSeriesOptions): ProjectionDay[] {
  const rand = mulberry32(seed);
  const clampedAdvanceRate = Math.max(0, Math.min(1, advanceRate));

  // Seed individual problems from the distribution
  const problems: SimProblem[] = [];
  for (let star = 0; star < 5; star++) {
    const count = startDistribution[star];
    const confidence = (star + 1) as Confidence;
    const interval = INTERVALS[confidence];
    for (let i = 0; i < count; i++) {
      // Stagger due dates within the current interval
      problems.push({
        confidence,
        dueDay: Math.floor(rand() * interval),
      });
    }
  }

  const series: ProjectionDay[] = [];

  series.push({ day: 0, distribution: toDistribution(problems) });

  // Simulate each day
  for (let day = 1; day <= days; day++) {
    // Inject new problems spread across the week
    if (newPerWeek > 0) {
      const dayInWeek = ((day - 1) % 7); // 0–6
      // Distribute N problems across 7 day slots using floor division
      const cumulative = Math.floor(((dayInWeek + 1) * newPerWeek) / 7);
      const prevCumulative = Math.floor((dayInWeek * newPerWeek) / 7);
      const toAdd = cumulative - prevCumulative;
      for (let n = 0; n < toAdd; n++) {
        problems.push({ confidence: 1 as Confidence, dueDay: day });
      }
    }

    // Find due problems, sorted by lowest confidence then most overdue
    const due = problems
      .filter((p) => p.dueDay <= day)
      .sort((a, b) => {
        const confDiff = a.confidence - b.confidence;
        if (confDiff !== 0) return confDiff;
        return a.dueDay - b.dueDay; // lower dueDay = more overdue
      });

    // Review top N
    const toReview = due.slice(0, dailyGoal);
    for (const p of toReview) {
      const shouldAdvance =
        clampedAdvanceRate >= 1 ||
        (clampedAdvanceRate > 0 && rand() <= clampedAdvanceRate);
      if (shouldAdvance && p.confidence < 5) {
        p.confidence = (p.confidence + 1) as Confidence;
      }
      p.dueDay = day + INTERVALS[p.confidence];
    }

    series.push({ day, distribution: toDistribution(problems) });
  }

  return series;
}
