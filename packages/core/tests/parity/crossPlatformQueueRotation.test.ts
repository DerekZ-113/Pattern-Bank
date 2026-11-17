import { describe, expect, it } from "vitest";
import fixture from "../fixtures/crossPlatformQueueRotation.json";
import {
  dayNumber,
  prioritizeProblems,
  ringPosition,
  rotationKey,
  rotationPointer,
} from "../../src/spacedRepetition";
import type { Problem } from "../../src/types";

// The queue rotation contract shared with the React Native and Swift apps.
//
// Unlike the other two shared fixtures this one is NOT date-shifted. Which
// cards get the day's turn depends on the absolute date, so shifting the
// dates would change the expected orders. Every case carries its own `today`
// and passes it to prioritizeProblems; nothing here reads the clock.

describe("cross-platform queue rotation fixture", () => {
  it("is version 1", () => {
    expect(fixture.version).toBe(1);
  });

  it.each(fixture.ringPositions)("ringPosition($id) = $value", ({ id, value }) => {
    expect(ringPosition(id)).toBe(value);
  });

  it.each(fixture.days)("$date is day $dayNumber with pointer $rotationPointer", (day) => {
    expect(dayNumber(day.date)).toBe(day.dayNumber);
    expect(rotationPointer(day.date)).toBe(day.rotationPointer);
  });

  it.each(fixture.rotationKeys)("rotationKey($id, $today) = $value", ({ id, today, value }) => {
    expect(rotationKey(id, today)).toBe(value);
  });

  it.each(fixture.cases)("$name", ({ today, limit, problems, expectedIds }) => {
    const ids = prioritizeProblems(problems as Problem[], limit, today).map((p) => p.id);
    expect(ids).toEqual(expectedIds);
  });

  it("holds the turn-taking the rule exists for", () => {
    const shown = fixture.cases
      .filter((c) => c.name.startsWith("backlog of 12"))
      .map((c) => new Set(c.expectedIds));
    expect(shown).toHaveLength(3);
    // Day 2 shows none of day 1's cards; within three days all twelve get a turn.
    expect([...shown[1]].filter((id) => shown[0].has(id))).toEqual([]);
    expect(new Set(shown.flatMap((s) => [...s])).size).toBe(12);
  });
});
