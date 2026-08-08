import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyThemePreference,
  updateMyThemePreference,
  type ThemePreference,
} from "@/lib/theme.functions";

export type Theme = ThemePreference; // "light" | "dark"

/** Chave legada (global do navegador) — usada por visitantes e migração. */
const LEGACY_KEY = "pc-theme";
/** Prefixo das chaves por usuário: `pc-theme.<userId>` (por dispositivo). */
const KEY_PREFIX = "pc-theme";

function storageKeyFor(userId: string | null): string {
  return userId ? `${KEY_PREFIX}.${userId}` : LEGACY_KEY;
}

// PreçoCerto ships a single, refined dark surface. The preference plumbing is
// kept intact (other screens still read/write it) but always resolves dark.
function resolveIsDark(_mode: Theme): boolean {
  return true;
}

function apply(mode: Theme) {
  if (typeof document === "undefined") return;
  const isDark = resolveIsDark(mode);
  document.documentElement.classList.add(isDark ? "dark" : "light");
  document.documentElement.classList.remove(isDark ? "light" : "dark");
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

function parse(raw: string | null): Theme | null {
  if (raw === "light" || raw === "dark") return raw;
  return null;
}

/**
 * Lê a preferência do dispositivo para o usuário informado.
 * Se ainda não existir chave própria (primeiro acesso após login neste
 * aparelho), herda o valor global legado — sem sobrescrever nada.
 */
function readStored(userId: string | null): Theme {
  void userId;
  void parse;
  void storageKeyFor;
  return "dark";
}

function writeStored(theme: Theme, userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKeyFor(userId), theme);
    // Espelha no valor global para manter o tema estável em telas públicas
    // (login, home) que renderizam antes da sessão ser conhecida.
    window.localStorage.setItem(LEGACY_KEY, theme);
  } catch {
    /* ignore */
  }
}

function notifyThemeChange(theme: Theme) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Theme>("pc-theme-change", { detail: theme }));
}

/**
 * Hook único de tema.
 * - Modos: 'light' | 'dark'.
 * - Persistência **por usuário e por dispositivo**:
 *   `localStorage["pc-theme.<userId>"]` (visitantes usam `pc-theme`).
 * - Persistência remota: `profiles.theme_preference` quando logado,
 *   sincronizada nas duas direções via server functions — assim o tema
 *   acompanha o usuário em um aparelho novo, mas cada aparelho pode manter
 *   sua própria escolha depois disso.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return readStored(null);
  });
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;

  const fetchRemote = useServerFn(getMyThemePreference);
  const pushRemote = useServerFn(updateMyThemePreference);
  const hasHydratedFromRemoteRef = useRef(false);

  // Boot local: aplica preferência salva neste dispositivo antes do sync remoto.
  useEffect(() => {
    const initial = readStored(userIdRef.current);
    setThemeState(initial);
    apply(initial);
    setMounted(true);

    const syncFromBrowser = (nextTheme?: Theme) => {
      const next = nextTheme ?? readStored(userIdRef.current);
      setThemeState(next);
      apply(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKeyFor(userIdRef.current) || event.key === LEGACY_KEY) {
        syncFromBrowser();
      }
    };
    const onCustomChange = (event: Event) => {
      const next = event instanceof CustomEvent ? event.detail : undefined;
      syncFromBrowser(next === "dark" ? "dark" : "light");
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pc-theme-change", onCustomChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pc-theme-change", onCustomChange);
    };
  }, []);

  // Sessão + boot remoto. A preferência do perfil só vence quando este
  // dispositivo ainda não tem escolha própria para o usuário logado.
  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        const uid = sessionRes.session?.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);
        userIdRef.current = uid;
        if (!uid) return;

        // 1) Preferência deste dispositivo para este usuário tem prioridade.
        const deviceOwn = parse(window.localStorage.getItem(storageKeyFor(uid)));
        if (deviceOwn) {
          setThemeState(deviceOwn);
          apply(deviceOwn);
          return;
        }

        // 2) Primeiro acesso neste aparelho: herda o perfil.
        const res = await fetchRemote();
        if (cancelled) return;
        if (res?.theme !== "dark" && res?.theme !== "light") return;
        const remote: Theme = res.theme;
        hasHydratedFromRemoteRef.current = true;
        writeStored(remote, uid);
        setThemeState(remote);
        apply(remote);
      } catch {
        /* usuário deslogado ou sem perfil — ignora silenciosamente */
      }
    }
    void pull();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void pull();
      if (event === "SIGNED_OUT") {
        hasHydratedFromRemoteRef.current = false;
        setUserId(null);
        userIdRef.current = null;
        const guest = readStored(null);
        setThemeState(guest);
        apply(guest);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [fetchRemote]);

  const setTheme = useCallback(
    (t: Theme) => {
      const uid = userIdRef.current;
      writeStored(t, uid);
      setThemeState(t);
      apply(t);
      notifyThemeChange(t);
      // Persiste no backend (silencioso). Só tenta se houver sessão.
      void (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (!data.session) return;
          await pushRemote({ data: { theme: t } });
        } catch {
          /* silencioso — preferência local já foi salva */
        }
      })();
    },
    [pushRemote],
  );

  const toggle = useCallback(() => {
    // Alterna binário usando o estado aplicado no DOM para evitar closures antigas.
    const isDark = typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : resolveIsDark(theme);
    setTheme(isDark ? "light" : "dark");
  }, [theme, setTheme]);

  const isDark = mounted && resolveIsDark(theme);
  return { theme, setTheme, toggle, mounted, isDark, userId };
}
