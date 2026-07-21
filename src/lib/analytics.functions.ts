import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Log leve de um evento de analytics. Aceito para visitantes anônimos
 * (o cliente já respeita consentimento LGPD antes de chamar).
 *
 * Nunca aceita PII: apenas nome do evento, rota, session_id opaco e meta curto.
 */
export const logAnalyticsEvent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      event_name: string;
      route?: string | null;
      session_id?: string | null;
      is_visitor?: boolean;
      user_id?: string | null;
      meta?: Record<string, string | number | boolean | null | undefined>;
    }) => input,
  )
  .handler(async ({ data }) => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const supa = createClient<Database>(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const event_name = String(data.event_name).slice(0, 80);
    const route = data.route ? String(data.route).slice(0, 200) : null;
    const session_id = data.session_id ? String(data.session_id).slice(0, 80) : null;
    // Normalize meta to a JSON-safe shape (Supabase types.Json).
    const rawMeta = data.meta ?? {};
    const meta: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(rawMeta)) {
      if (v === undefined) continue;
      meta[k] = v as string | number | boolean | null;
    }

    const { error } = await supa.from("analytics_events").insert({
      event_name,
      route,
      session_id,
      is_visitor: data.is_visitor ?? true,
      user_id: data.user_id ?? null,
      meta,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Métricas admin: dia a dia. */
export const getVisitorDailyMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => input ?? {})
  .handler(async ({ data, context }) => {
    const days = Math.min(Math.max(data.days ?? 14, 1), 90);
    const { data: rows, error } = await context.supabase.rpc(
      "get_visitor_daily_metrics",
      { days },
    );
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Métricas admin: taxa de clique em "desbloquear" por rota. */
export const getUnlockRateByRoute = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => input ?? {})
  .handler(async ({ data, context }) => {
    const days = Math.min(Math.max(data.days ?? 14, 1), 90);
    const { data: rows, error } = await context.supabase.rpc(
      "get_unlock_rate_by_route",
      { days },
    );
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
