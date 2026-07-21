/**
 * Telemetria leve de conversão de visitantes.
 *
 * - Emite `CustomEvent` no window (para integrações futuras).
 * - Agrega contadores em `localStorage` para inspeção rápida.
 * - Persiste no banco (`analytics_events`) via server function.
 * - Nunca envia PII — só nome do evento, rota, session_id opaco e meta curto.
 */

import { logAnalyticsEvent } from "@/lib/analytics.functions";

const STORAGE_KEY = "pc.analytics.counters.v1";
const SESSION_KEY = "pc.analytics.session.v1";
const PENDING_UNLOCK_KEY = "pc.analytics.pending_unlock.v1";
const EVENT_NAME = "pc:analytics";

export type AnalyticsEvent =
  | "visitor_view_search_aggregate"
  | "visitor_view_comparador"
  | "visitor_view_melhores_precos"
  | "visitor_click_unlock_comparador"
  | "visitor_click_unlock_melhores_precos"
  | "visitor_click_unlock_generic"
  | "user_view_search"
  | "user_open_comparador_drilldown"
  | "unlock_conversion";

type Payload = Record<string, string | number | boolean | null | undefined>;

function readCounters(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeCounters(next: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota — ignore */
  }
}

/** ID de sessão opaco, gerado uma vez por aba/janela. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const cur = window.sessionStorage.getItem(SESSION_KEY);
    if (cur) return cur;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return "no-session";
  }
}

/** Rota atual (path curto) — safe para SSR. */
function currentRoute(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.pathname;
}

export function trackEvent(event: AnalyticsEvent, payload: Payload = {}): void {
  if (typeof window === "undefined") return;

  // 1) Contador local (sempre) — respeita "essential-only" mode.
  const counters = readCounters();
  counters[event] = (counters[event] ?? 0) + 1;
  writeCounters(counters);

  // 2) CustomEvent para plugins/integrações locais.
  try {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { event, payload, at: Date.now() } }),
    );
  } catch {
    /* ignore */
  }

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, payload);
  }

  // 3) Envio ao servidor.

  const route = (payload.route as string) ?? currentRoute();
  const session_id = getSessionId();
  const user_id = (payload.user_id as string) ?? null;
  const is_visitor = !user_id;

  // Não bloqueia UX. Envelope estreito (sem PII).
  const meta: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === "route" || k === "user_id") continue;
    if (v === undefined) continue;
    meta[k] = v ?? null;
  }

  void logAnalyticsEvent({
    data: {
      event_name: event,
      route: route ?? null,
      session_id,
      is_visitor,
      user_id,
      meta,
    },
  }).catch(() => {
    /* fire-and-forget */
  });
}

export function getAnalyticsCounters(): Record<string, number> {
  return readCounters();
}

// ---------------------------------------------------------------------------
// "Pending unlock" — usado para correlacionar clique em "desbloquear" com login.
// O LockOverlay grava a intenção; o UnlockConversionTracker consome no SIGNED_IN.
// ---------------------------------------------------------------------------

export type PendingUnlock = {
  event: AnalyticsEvent;
  route: string;
  at: number;
  session_id: string;
};

export function markPendingUnlock(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  const entry: PendingUnlock = {
    event,
    route: currentRoute() ?? "unknown",
    at: Date.now(),
    session_id: getSessionId(),
  };
  try {
    window.sessionStorage.setItem(PENDING_UNLOCK_KEY, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

export function consumePendingUnlock(): PendingUnlock | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_UNLOCK_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_UNLOCK_KEY);
    const parsed = JSON.parse(raw) as PendingUnlock;
    // Descartar se muito antigo (> 30 min).
    if (Date.now() - parsed.at > 30 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}
