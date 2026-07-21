import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type ImageSearchSettings = {
  preferredDomains: string[];
  scheduleEnabled: boolean;
  scheduleFrequency: "weekly" | "monthly";
  refreshOlderThanDays: number;
};

const DEFAULTS: ImageSearchSettings = {
  preferredDomains: [
    "amazon.com.br",
    "mercadolivre.com.br",
    "carrefour.com.br",
    "paodeacucar.com",
    "extra.com.br",
    "americanas.com.br",
  ],
  scheduleEnabled: false,
  scheduleFrequency: "monthly",
  refreshOlderThanDays: 30,
};

const KEY = "image_search";

type IntegrationsRow = { id: string; config: ImageSearchSettings | null };

export const getImageSearchSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ImageSearchSettings> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("integrations" as never) as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          maybeSingle: () => Promise<{
            data: IntegrationsRow | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data, error } = await table.select("id, config").eq("id", KEY).maybeSingle();
    if (error) throw new Error(error.message);
    const cfg = (data?.config ?? {}) as Partial<ImageSearchSettings>;
    return {
      preferredDomains: Array.isArray(cfg.preferredDomains)
        ? cfg.preferredDomains.filter((d): d is string => typeof d === "string")
        : DEFAULTS.preferredDomains,
      scheduleEnabled: typeof cfg.scheduleEnabled === "boolean"
        ? cfg.scheduleEnabled
        : DEFAULTS.scheduleEnabled,
      scheduleFrequency:
        cfg.scheduleFrequency === "weekly" || cfg.scheduleFrequency === "monthly"
          ? cfg.scheduleFrequency
          : DEFAULTS.scheduleFrequency,
      refreshOlderThanDays:
        typeof cfg.refreshOlderThanDays === "number" && cfg.refreshOlderThanDays >= 0
          ? cfg.refreshOlderThanDays
          : DEFAULTS.refreshOlderThanDays,
    };
  });

export const saveImageSearchSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: ImageSearchSettings) => {
    if (!Array.isArray(input.preferredDomains)) throw new Error("preferredDomains inválido");
    return {
      preferredDomains: input.preferredDomains
        .map((d) => String(d).trim().toLowerCase())
        .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
        .slice(0, 20),
      scheduleEnabled: !!input.scheduleEnabled,
      scheduleFrequency: input.scheduleFrequency === "weekly" ? "weekly" : "monthly",
      refreshOlderThanDays: Math.max(0, Math.min(365, Math.floor(input.refreshOlderThanDays ?? 30))),
    } satisfies ImageSearchSettings;
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("integrations" as never) as unknown as {
      upsert: (p: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
    const { error } = await table.upsert({ id: KEY, config: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
