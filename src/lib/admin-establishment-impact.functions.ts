/**
 * Contagem prévia dos registros vinculados a um estabelecimento que serão
 * removidos por cascade quando o admin excluir a loja. Usado no diálogo
 * de confirmação de exclusão para transparência.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const InputSchema = z.object({ id: z.string().uuid() });

export type EstablishmentImpactRow = {
  table: string;
  label: string;
  count: number;
  cascade: "delete" | "set_null" | "keep";
};

export type EstablishmentImpact = {
  establishmentName: string | null;
  totalDeleted: number;
  rows: EstablishmentImpactRow[];
};

const TARGETS: Array<{ table: string; label: string; column: string; cascade: EstablishmentImpactRow["cascade"] }> = [
  { table: "scans", label: "Capturas de preço", column: "establishment_id", cascade: "delete" },
  { table: "product_price_history", label: "Histórico de preços", column: "establishment_id", cascade: "delete" },
  { table: "receipts", label: "Cupons fiscais", column: "establishment_id", cascade: "delete" },
  { table: "price_reports", label: "Denúncias de preço", column: "establishment_id", cascade: "delete" },
  { table: "store_basket_alerts", label: "Alertas de cesta", column: "establishment_id", cascade: "delete" },
  { table: "price_alert_subscriptions", label: "Assinaturas de alerta", column: "establishment_id", cascade: "delete" },
  { table: "favorite_items", label: "Itens favoritos vinculados", column: "preferred_establishment_id", cascade: "set_null" },
  { table: "import_batches", label: "Lotes de importação", column: "establishment_id", cascade: "set_null" },
];

export const getEstablishmentDeletionImpact = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data }): Promise<EstablishmentImpact> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: est } = await supabaseAdmin
      .from("establishments")
      .select("name")
      .eq("id", data.id)
      .maybeSingle();

    const rows: EstablishmentImpactRow[] = [];
    let totalDeleted = 0;

    await Promise.all(
      TARGETS.map(async (t) => {
        try {
          const client = supabaseAdmin as unknown as {
            from: (t: string) => {
              select: (s: string, o: { count: "exact"; head: true }) => {
                eq: (c: string, v: string) => Promise<{ count: number | null }>;
              };
            };
          };
          const { count } = await client
            .from(t.table)
            .select("*", { count: "exact", head: true })
            .eq(t.column, data.id);
          const n = count ?? 0;
          rows.push({ table: t.table, label: t.label, count: n, cascade: t.cascade });
          if (t.cascade === "delete") totalDeleted += n;
        } catch {
          rows.push({ table: t.table, label: t.label, count: 0, cascade: t.cascade });
        }
      }),
    );


    // Ordena pelas mais impactantes
    rows.sort((a, b) => b.count - a.count);

    return {
      establishmentName: (est as { name?: string } | null)?.name ?? null,
      totalDeleted,
      rows,
    };
  });
