export type Theme = "dark" | "light";

/** Web-only visual constants (moved out of progressUtils when it went to core). */
export const CONFIDENCE_BAR_COLORS = [
  "#f85149", // 1
  "#f0883e", // 2
  "#d29922", // 3
  "#8fbd3a", // 4
  "#3fb950", // 5
];

const STORAGE_KEY = "patternbank-theme";

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
}

export function applyTheme(theme: Theme): void {
  if (theme === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
  }
}
