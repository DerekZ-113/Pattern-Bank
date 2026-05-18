import {
  STORAGE_KEY,
  REVIEW_LOG_KEY,
  REVIEW_EVENTS_KEY,
  PREFERENCES_KEY,
  PROBLEM_TOMBSTONES_KEY,
  DATA_RESET_KEY,
  DEFAULT_PREFERENCES,
} from "./constants";
import { todayStr, addDays, utcToLocalDateStr } from "./dateHelpers";
import type { Problem, ReviewLogEntry, ReviewEvent, Preferences, BackupData, ProblemTombstone, DataReset } from "../types";

export function loadProblems(): Problem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Problem[]) : [];
  } catch {
    return [];
  }
}

export function saveProblems(problems: Problem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
  } catch (e) {
    console.error("Failed to save problems:", e);
  }
}

export function loadReviewLog(): ReviewLogEntry[] {
  try {
    const raw = localStorage.getItem(REVIEW_LOG_KEY);
    return raw ? (JSON.parse(raw) as ReviewLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveReviewLog(log: ReviewLogEntry[]): void {
  try {
    localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(log));
  } catch (e) {
    console.error("Failed to save review log:", e);
  }
}

export function logReviewToday(): void {
  const log = loadReviewLog();
  const today = todayStr();
  if (!log.some((entry) => entry.date === today)) {
    log.push({ date: today });
    saveReviewLog(log);
  }
}

export function calculateStreak(): number {
  const log = loadReviewLog();
  if (log.length === 0) return 0;
  const dates = new Set(log.map((e) => e.date));
  let streak = 0;
  let checkDate = todayStr();
  if (!dates.has(checkDate)) {
    checkDate = addDays(checkDate, -1);
    if (!dates.has(checkDate)) return 0;
  }
  while (dates.has(checkDate)) {
    streak++;
    checkDate = addDays(checkDate, -1);
  }
  return streak;
}

export function loadReviewEvents(): ReviewEvent[] {
  try {
    const raw = localStorage.getItem(REVIEW_EVENTS_KEY);
    return raw ? (JSON.parse(raw) as ReviewEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveReviewEvents(events: ReviewEvent[]): void {
  try {
    localStorage.setItem(REVIEW_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.error("Failed to save review events:", e);
  }
}

export function loadProblemTombstones(): ProblemTombstone[] {
  try {
    const raw = localStorage.getItem(PROBLEM_TOMBSTONES_KEY);
    return raw ? (JSON.parse(raw) as ProblemTombstone[]) : [];
  } catch {
    return [];
  }
}

export function saveProblemTombstones(tombstones: ProblemTombstone[]): void {
  try {
    localStorage.setItem(PROBLEM_TOMBSTONES_KEY, JSON.stringify(tombstones));
  } catch (e) {
    console.error("Failed to save problem tombstones:", e);
  }
}

export function recordProblemTombstone(problemId: string, deletedAt: string = new Date().toISOString()): ProblemTombstone {
  const tombstone = { problemId, deletedAt };
  const tombstones = loadProblemTombstones();
  const existingIndex = tombstones.findIndex((t) => t.problemId === problemId);
  if (existingIndex >= 0) {
    const existing = tombstones[existingIndex];
    if (new Date(existing.deletedAt).getTime() >= new Date(deletedAt).getTime()) {
      return existing;
    }
    tombstones[existingIndex] = tombstone;
  } else {
    tombstones.push(tombstone);
  }
  saveProblemTombstones(tombstones);
  return tombstone;
}

export function loadDataReset(): DataReset | null {
  try {
    const raw = localStorage.getItem(DATA_RESET_KEY);
    return raw ? (JSON.parse(raw) as DataReset) : null;
  } catch {
    return null;
  }
}

export function saveDataReset(reset: DataReset | null): void {
  try {
    if (reset) {
      localStorage.setItem(DATA_RESET_KEY, JSON.stringify(reset));
    } else {
      localStorage.removeItem(DATA_RESET_KEY);
    }
  } catch (e) {
    console.error("Failed to save data reset marker:", e);
  }
}

export function logReviewEvent(problemId: string, confidence: number, patterns: string[], timestamp?: string): void {
  const events = loadReviewEvents();
  events.push({
    date: todayStr(),
    problemId,
    confidence,
    patterns,
    timestamp: timestamp ?? new Date().toISOString(),
  });
  saveReviewEvents(events);
}

export function logOrReplaceReviewEvent(problemId: string, confidence: number, patterns: string[], timestamp?: string): void {
  const reviewTimestamp = timestamp ?? new Date().toISOString();
  const reviewDate = utcToLocalDateStr(reviewTimestamp) ?? todayStr();
  const events = loadReviewEvents();
  const withoutSameDayProblem = events.filter(
    (event) => !(event.problemId === problemId && event.date === reviewDate),
  );
  withoutSameDayProblem.push({
    date: reviewDate,
    problemId,
    confidence,
    patterns,
    timestamp: reviewTimestamp,
  });
  saveReviewEvents(withoutSameDayProblem);
}

export function countReviewedToday(problems: Problem[]): number {
  const today = todayStr();
  return problems.filter((p) => p.lastReviewed === today).length;
}

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    // Merge with defaults so new preference keys get picked up
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save preferences:", e);
  }
}

export function importData(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse((e.target as FileReader).result as string) as BackupData;
        // Validate structure
        if (!data.problems || !Array.isArray(data.problems)) {
          reject(new Error("Invalid backup file: missing problems array"));
          return;
        }
        // Validate each problem has required fields
        const valid = data.problems.every(
          (p) => p.id && p.title && p.difficulty && p.patterns
        );
        if (!valid) {
          reject(new Error("Invalid backup file: problems have missing fields"));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error("Could not parse file. Is it a valid JSON backup?"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function exportData(): void {
  const data: BackupData = {
    exportedAt: new Date().toISOString(),
    problems: loadProblems(),
    reviewLog: loadReviewLog(),
    reviewEvents: loadReviewEvents(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `patternbank-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
