export type Theme = "dark" | "light";

const STORAGE_KEY = "patternbank-theme";

/**
 * Page background per theme, mirrored into <meta name="theme-color"> so the
 * mobile browser chrome matches. Keep in sync with --color-pb-bg in index.css
 * and the inline script in index.html.
 */
export const THEME_COLORS: Record<Theme, string> = {
  dark: "#121116",
  light: "#f6f5f9",
};

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("light", theme === "light");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[theme]);
}
