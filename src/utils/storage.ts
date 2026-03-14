import { STORAGE_KEY, REVIEW_LOG_KEY, PREFERENCES_KEY, DEFAULT_PREFERENCES } from "./constants";
import { todayStr, addDays } from "./dateHelpers";
import type { Problem, ReviewLogEntry, Preferences, BackupData } from "../types";

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
