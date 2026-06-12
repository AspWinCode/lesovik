import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "oi-theme";

function readInitial(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* localStorage may be unavailable */
  }
  return "light";
}

/** Reflect the theme onto <html> so the scoped dark CSS in index.css applies. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("theme-dark", theme === "dark");
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readInitial(),
  toggle: () => get().set(get().theme === "dark" ? "light" : "dark"),
  set: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    applyTheme(theme);
    set({ theme });
  },
}));
