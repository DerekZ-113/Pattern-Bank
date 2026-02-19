import { STORAGE_KEY, REVIEW_LOG_KEY } from "./constants";
import { todayStr, addDays } from "./dateHelpers";

export function loadProblems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProblems(problems) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
}

export function loadReviewLog() {
  try {
    const raw = localStorage.getItem(REVIEW_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReviewLog(log) {
  localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(log));
}

export function logReviewToday() {
  const log = loadReviewLog();
  const today = todayStr();
  if (!log.some((entry) => entry.date === today)) {
    log.push({ date: today });
    saveReviewLog(log);
  }
}

export function calculateStreak() {
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

export function countReviewedToday(problems) {
  const today = todayStr();
  return problems.filter((p) => p.lastReviewed === today).length;
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
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

export function exportData() {
  const data = {
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
