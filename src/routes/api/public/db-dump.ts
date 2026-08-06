import { createFileRoute } from "@tanstack/react-router";

const TOKEN = "tmp-dump-9f2ac41b7e";

const TABLES = [
  "establishments",
  "product_catalog",
  "scans",
  "product_price_history",
  "product_price_stats",
  "product_comparison_cache",
  "product_catalog_audit",
  "analytics_events",
  "search_trends",
  "search_synonym_groups",
  "license_plans",
  "basket_item_sets",
  "profiles",
  "platform_stats_cache",
  "shopping_lists",
  "user_roles",
];

export const Route = createFileRoute("/api/public/db-dump")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("token") !== TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const out: Record<string, unknown[]> = {};
        for (const table of TABLES) {
          const rows: unknown[] = [];
          for (let from = 0; from < 20000; from += 1000) {
            const { data, error } = await (supabaseAdmin as any)
              .from(table)
              .select("*")
              .range(from, from + 999);
            if (error) {
              return new Response(`error ${table}: ${error.message}`, { status: 500 });
            }
            rows.push(...(data ?? []));
            if (!data || data.length < 1000) break;
          }
          out[table] = rows;
        }
        return new Response(JSON.stringify(out), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
