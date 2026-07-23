import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "pc-theme";

function apply(mode: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function useTheme() {
  // Padrão sempre claro; só muda se o usuário tiver salvo preferência.
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? (localStorage.getItem(STORAGE_KEY) as Theme | null)
        : null;
    const initial: Theme = stored === "dark" || stored === "light" ? stored : "light";
    setThemeState(initial);
    apply(initial);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    setThemeState(t);
    apply(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, mounted, isDark: mounted && theme === "dark" };
}
