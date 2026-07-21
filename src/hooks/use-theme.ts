import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "pc-theme";

function resolvedIsDark(mode: Theme): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(mode: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolvedIsDark(mode));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (localStorage.getItem(STORAGE_KEY) as Theme | null)
      : null) ?? "system";
    setThemeState(stored);
    apply(stored);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
      if (current === "system") apply("system");
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
    apply(t);
  }, []);


  const toggle = useCallback(() => {
    const isDark = resolvedIsDark(theme);
    setTheme(isDark ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, mounted, isDark: mounted && resolvedIsDark(theme) };
}
