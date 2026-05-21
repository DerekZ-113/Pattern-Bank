import { describe, it, expect } from "vitest";
import {
  simulateProjection,
  simulateProjectionSeries,
} from "../src/utils/projectionEngine";
import type { ProjectionSnapshot } from "../src/utils/projectionEngine";

function totalCount(d: [number, number, number, number, number]): number {
  return d[0] + d[1] + d[2] + d[3] + d[4];
}

describe("simulateProjection", () => {
  it("10 problems at star 1 with 5/day should have 0 at star 1 after 30 days", () => {
    const snapshots = simulateProjection([10, 0, 0, 0, 0], 5, 0, 30);
    const day30 = snapshots.find((s) => s.day === 30)!;
    expect(day30.distribution[0]).toBe(0);
    // All 10 should have advanced
    expect(totalCount(day30.distribution)).toBe(10);
  });

  it("0 daily goal means no change in existing problems", () => {
    const snapshots = simulateProjection([5, 3, 2, 0, 0], 0, 0, 30);
    const day0 = snapshots.find((s) => s.day === 0)!;
    const day30 = snapshots.find((s) => s.day === 30)!;
    expect(day30.distribution).toEqual(day0.distribution);
  });

  it("new problems/week increases total count correctly", () => {
    const snapshots = simulateProjection([0, 0, 0, 0, 0], 5, 3, 30);
    const day30 = snapshots.find((s) => s.day === 30)!;
    // 3 new per week spread across 7 days, 30 days = 4 full weeks + 2 extra days
    // 4 complete weeks × 3 = 12 new problems
    expect(totalCount(day30.distribution)).toBe(12);
  });

  it("confidence caps at 5 stars", () => {
    const snapshots = simulateProjection([0, 0, 0, 0, 20], 5, 0, 30);
    const day30 = snapshots.find((s) => s.day === 30)!;
    expect(day30.distribution[4]).toBe(20); // all still at 5
    expect(totalCount(day30.distribution)).toBe(20);
  });

  it("empty library returns all-zero snapshots when no new problems", () => {
    const snapshots = simulateProjection([0, 0, 0, 0, 0], 5, 0, 30);
    for (const s of snapshots) {
      expect(s.distribution).toEqual([0, 0, 0, 0, 0]);
    }
  });

  it("returns 4 snapshots at days 0, 10, 20, 30", () => {
    const snapshots = simulateProjection([5, 0, 0, 0, 0], 3, 0, 30);
    expect(snapshots).toHaveLength(4);
    expect(snapshots.map((s) => s.day)).toEqual([0, 10, 20, 30]);
  });
});

describe("simulateProjectionSeries", () => {
  it("returns one projection day for every day in the requested window", () => {
    const days = simulateProjectionSeries({
      startDistribution: [5, 0, 0, 0, 0],
      dailyGoal: 3,
      newPerWeek: 1,
      days: 30,
    });

    expect(days).toHaveLength(31);
    expect(days[0].day).toBe(0);
    expect(days[30].day).toBe(30);
  });

  it("matches the existing optimistic snapshot behavior when advanceRate is 1", () => {
    const snapshots = simulateProjection([5, 1, 0, 0, 0], 3, 2, 30, 7);
    const series = simulateProjectionSeries({
      startDistribution: [5, 1, 0, 0, 0],
      dailyGoal: 3,
      newPerWeek: 2,
      days: 30,
      seed: 7,
      advanceRate: 1,
    });

    expect(
      series
        .filter((day) => [0, 10, 20, 30].includes(day.day))
        .map((day) => day.distribution),
    ).toEqual(snapshots.map((snapshot) => snapshot.distribution));
  });

  it("realistic advancement never produces more mastered problems than optimistic", () => {
    const optimistic = simulateProjectionSeries({
      startDistribution: [20, 8, 5, 0, 0],
      dailyGoal: 6,
      newPerWeek: 4,
      days: 30,
      seed: 99,
      advanceRate: 1,
    });
    const realistic = simulateProjectionSeries({
      startDistribution: [20, 8, 5, 0, 0],
      dailyGoal: 6,
      newPerWeek: 4,
      days: 30,
      seed: 99,
      advanceRate: 0.7,
    });

    realistic.forEach((day, index) => {
      const realisticMastered = day.distribution[3] + day.distribution[4];
      const optimisticMastered =
        optimistic[index].distribution[3] + optimistic[index].distribution[4];
      expect(realisticMastered).toBeLessThanOrEqual(optimisticMastered);
    });
  });

  it("zero daily reviews only changes totals through new problem injection", () => {
    const series = simulateProjectionSeries({
      startDistribution: [5, 3, 2, 0, 0],
      dailyGoal: 0,
      newPerWeek: 7,
      days: 7,
    });

    expect(series[0].distribution).toEqual([5, 3, 2, 0, 0]);
    expect(series[7].distribution[1]).toBe(3);
    expect(series[7].distribution[2]).toBe(2);
    expect(totalCount(series[7].distribution)).toBe(17);
  });

  it("confidence remains capped at 5 stars", () => {
    const series = simulateProjectionSeries({
      startDistribution: [0, 0, 0, 0, 10],
      dailyGoal: 10,
      newPerWeek: 0,
      days: 30,
    });

    expect(series[30].distribution).toEqual([0, 0, 0, 0, 10]);
  });

  it("uses the seed deterministically", () => {
    const first = simulateProjectionSeries({
      startDistribution: [10, 5, 0, 0, 0],
      dailyGoal: 4,
      newPerWeek: 3,
      days: 30,
      seed: 123,
      advanceRate: 0.7,
    });
    const second = simulateProjectionSeries({
      startDistribution: [10, 5, 0, 0, 0],
      dailyGoal: 4,
      newPerWeek: 3,
      days: 30,
      seed: 123,
      advanceRate: 0.7,
    });

    expect(second).toEqual(first);
  });
});
