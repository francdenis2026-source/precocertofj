import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serverPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
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
}

export type CollabPublicStats = {
  collaborators: number;
  submissions: number;
  cities: number;
  establishments: number;
};

/**
 * Contagens agregadas para prova social:
 *  - colaboradores únicos e envios (view collaborator_public_stats)
 *  - cidades e estabelecimentos cobertos (tabela establishments)
 *
 * Público (visitantes anônimos podem ler).
 */
export const getCollaboratorPublicStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<CollabPublicStats> => {
    const supa = serverPublicClient();
    const [statsRes, estRes] = await Promise.all([
      supa
        .from("collaborator_public_stats" as never)
        .select("collaborators_count, submissions_count, cities_count")
        .maybeSingle(),
      supa.from("establishments").select("id, city"),
    ]);
    const stats = (statsRes.data ?? {}) as {
      collaborators_count?: number;
      submissions_count?: number;
      cities_count?: number;
    };
    const rows = (estRes.data ?? []) as Array<{ city: string | null }>;
    const cityFromEst = new Set<string>();
    for (const r of rows) {
      if (r.city && r.city.trim()) cityFromEst.add(r.city.trim().toLowerCase());
    }
    return {
      collaborators: stats.collaborators_count ?? 0,
      submissions: stats.submissions_count ?? 0,
      cities: Math.max(stats.cities_count ?? 0, cityFromEst.size),
      establishments: rows.length,
    };
  },
);

export type MySubmission = {
  id: string;
  market_name: string | null;
  city: string | null;
  purchase_date: string | null;
  receipts_count: number;
  status: "received" | "review" | "approved" | "rejected";
  admin_notes: string | null;
  rejection_reason: string | null;
  reward_granted: boolean;
  reward_days: number | null;
  reviewed_at: string | null;
  created_at: string;
};

/**
 * Lista os envios de notas fiscais do próprio usuário autenticado.
 */
export const getMyCollaboratorSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySubmission[]> => {
    const { data, error } = await context.supabase
      .from("collaborator_submissions" as never)
      .select(
        "id, market_name, city, purchase_date, receipts_count, status, admin_notes, rejection_reason, reward_granted, reward_days, reviewed_at, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MySubmission[];
  });

