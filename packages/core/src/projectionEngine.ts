import { INTERVALS } from "./spacedRepetition";
import type { Confidence } from "./types";

export type ProjectionDistribution = [number, number, number, number, number];

export interface ProjectionSnapshot {
  day: number;
  distribution: ProjectionDistribution;
}

export type ProjectionDay = ProjectionSnapshot;

export interface ProjectionSeriesOptions {
  startDistribution: ProjectionDistribution;
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

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toDistribution(problems: SimProblem[]): ProjectionDistribution {
  const distribution: ProjectionDistribution = [0, 0, 0, 0, 0];
  for (const problem of problems) {
    distribution[problem.confidence - 1]++;
  }
  return distribution;
}

export function simulateProjection(
  startDistribution: ProjectionDistribution,
  dailyGoal: number,
  newPerWeek: number,
  days = 30,
  seed = 42,
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
  const reviewLimit = Math.max(0, dailyGoal);
  const clampedAdvanceRate = Math.max(0, Math.min(1, advanceRate));

  const problems: SimProblem[] = [];
  for (let star = 0; star < 5; star++) {
    const count = startDistribution[star];
    const confidence = (star + 1) as Confidence;
    const interval = INTERVALS[confidence];
    for (let index = 0; index < count; index++) {
      problems.push({
        confidence,
        dueDay: Math.floor(rand() * interval),
      });
    }
  }

  const series: ProjectionDay[] = [{ day: 0, distribution: toDistribution(problems) }];

  for (let day = 1; day <= days; day++) {
    if (newPerWeek > 0) {
      const dayInWeek = (day - 1) % 7;
      const cumulative = Math.floor(((dayInWeek + 1) * newPerWeek) / 7);
      const previousCumulative = Math.floor((dayInWeek * newPerWeek) / 7);
      const toAdd = cumulative - previousCumulative;
      for (let index = 0; index < toAdd; index++) {
        problems.push({ confidence: 1, dueDay: day });
      }
    }

    const due = problems
      .filter((problem) => problem.dueDay <= day)
      .sort((a, b) => {
        const confidenceDiff = a.confidence - b.confidence;
        if (confidenceDiff !== 0) return confidenceDiff;
        return a.dueDay - b.dueDay;
      });

    const toReview = due.slice(0, reviewLimit);
    for (const problem of toReview) {
      const shouldAdvance =
        clampedAdvanceRate >= 1 ||
        (clampedAdvanceRate > 0 && rand() <= clampedAdvanceRate);
      if (shouldAdvance && problem.confidence < 5) {
        problem.confidence = (problem.confidence + 1) as Confidence;
      }
      problem.dueDay = day + INTERVALS[problem.confidence];
    }

    series.push({ day, distribution: toDistribution(problems) });
  }

  return series;
}
