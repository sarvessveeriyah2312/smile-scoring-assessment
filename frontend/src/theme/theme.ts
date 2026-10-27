export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

// What the user picked last time, or whatever their system prefers if they
// haven't picked anything yet.
export function getPreferredTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Private mode or blocked storage. Not a big deal, fall through.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // If we can't save it, the theme still changes for this visit.
  }
}
