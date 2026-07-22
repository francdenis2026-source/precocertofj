import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type ImportBatch = {
  id: string;
  source: string;
  establishment_id: string | null;
  market_name: string | null;
  note: string | null;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  total_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ImportItem = {
  id: string;
  batch_id: string;
  product_name: string;
  price: number | null;
  quantity: number | null;
  unit: string | null;
  scan_id: string | null;
  status: string;
  confidence: number | null;
  log: string | null;
  created_at: string;
};

export const listImportBatches = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ImportBatch[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("import_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as ImportBatch[];
  });

export const listImportItems = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((input: { batch_id: string }) => {
    if (!input?.batch_id) throw new Error("batch_id obrigatório");
    return input;
  })
  .handler(async ({ data }): Promise<ImportItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("import_items")
      .select("*")
      .eq("batch_id", data.batch_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ImportItem[];
  });

/** Backfill: cria um lote a partir de scans recentes de um mercado. */
export const backfillBatchFromScans = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: {
    market_name: string;
    hours: number;
    source?: string;
    note?: string;
  }) => {
    if (!input?.market_name) throw new Error("market_name obrigatório");
    return {
      market_name: input.market_name,
      hours: Math.max(1, Math.min(720, input.hours || 24)),
      source: input.source || "photos_manual",
      note: input.note || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();

    const { data: scans, error: sErr } = await supabaseAdmin
      .from("scans")
      .select("id, product_name, price_captured, quantity, unit, establishment_id, created_at")
      .eq("market_name", data.market_name)
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (sErr) throw new Error(sErr.message);

    const rows = scans ?? [];
    if (rows.length === 0) {
      throw new Error("Nenhum scan encontrado no período informado.");
    }

    const establishment_id = rows[0].establishment_id ?? null;

    const { data: batch, error: bErr } = await supabaseAdmin
      .from("import_batches")
      .insert({
        source: data.source,
        establishment_id,
        market_name: data.market_name,
        note: data.note,
        created_count: rows.length,
        updated_count: 0,
        skipped_count: 0,
        error_count: 0,
        total_count: rows.length,
        status: "completed",
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (bErr) throw new Error(bErr.message);

    const items = rows
      .filter((s) => !!s.product_name)
      .map((s) => ({
        batch_id: batch.id as string,
        product_name: s.product_name as string,
        price: s.price_captured,
        quantity: s.quantity,
        unit: s.unit,
        scan_id: s.id,
        status: "created",
        confidence: null,
        log: null,
      }));
    if (items.length > 0) {
      const { error: iErr } = await supabaseAdmin.from("import_items").insert(items);
      if (iErr) throw new Error(iErr.message);
    }

    return { batch_id: batch.id as string, count: rows.length };
  });

export const deleteImportBatch = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("import_batches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
