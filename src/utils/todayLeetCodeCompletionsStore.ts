import {
  buildTodayLeetCodeCompletionsStorageKey,
  parseTodayLeetCodeCompletions,
  serializeTodayLeetCodeCompletions,
  todayStr,
  type TodayLeetCodeCompletion,
} from "@patternbank/core";

// Thin synchronous localStorage wrappers around core's pure parse/serialize —
// web hooks read completions during render, so these must stay sync.

export function loadTodayLeetCodeCompletions(today = todayStr()): TodayLeetCodeCompletion[] {
  if (typeof localStorage === "undefined") return [];
  return parseTodayLeetCodeCompletions(
    localStorage.getItem(buildTodayLeetCodeCompletionsStorageKey(today)),
    today,
  );
}

export function saveTodayLeetCodeCompletions(
  completions: TodayLeetCodeCompletion[],
  today = todayStr(),
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    buildTodayLeetCodeCompletionsStorageKey(today),
    serializeTodayLeetCodeCompletions(completions, today),
  );
}
