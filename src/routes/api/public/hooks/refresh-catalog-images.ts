import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint público chamado por pg_cron para reprocessar imagens
 * automaticamente conforme configuração salva em `integrations.image_search`.
 *
 * Segurança: verifica `apikey` header contra SUPABASE_ANON_KEY (padrão Lovable).
 */
export const Route = createFileRoute("/api/public/hooks/refresh-catalog-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_ANON_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Lê configuração
        const cfgTable = supabaseAdmin.from("integrations" as never) as unknown as {
          select: (s: string) => {
            eq: (
              c: string,
              v: string,
            ) => {
              maybeSingle: () => Promise<{
                data: {
                  config: {
                    scheduleEnabled?: boolean;
                    refreshOlderThanDays?: number;
                  } | null;
                } | null;
              }>;
            };
          };
        };
        const { data: cfg } = await cfgTable
          .select("config")
          .eq("id", "image_search")
          .maybeSingle();

        if (!cfg?.config?.scheduleEnabled) {
          return Response.json({ ok: true, skipped: "schedule disabled" });
        }

        const olderThanDays = Math.max(
          0,
          Math.min(365, Math.floor(cfg.config.refreshOlderThanDays ?? 30)),
        );

        const { data: rows, error } = await supabaseAdmin.rpc(
          "enqueue_catalog_image_refresh_internal" as never,
          { _force: true, _older_than_days: olderThanDays } as never,
        );

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        const row = Array.isArray(rows) ? (rows[0] as { enqueued: number } | undefined) : null;
        return Response.json({
          ok: true,
          enqueued: row?.enqueued ?? 0,
          olderThanDays,
          at: new Date().toISOString(),
        });
      },
    },
  },
});
