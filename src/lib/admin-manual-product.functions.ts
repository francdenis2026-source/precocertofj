/**
 * Cadastro manual de produto (admin).
 *
 * Insere/atualiza uma entrada em `product_catalog` (por normalized_name)
 * e grava uma captura em `scans` com o preço inicial vinculada ao
 * estabelecimento escolhido. Como já existe cascade em
 * `scans.establishment_id`, remover o estabelecimento remove a captura.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const InputSchema = z.object({
  displayName: z.string().trim().min(2, "Nome do produto obrigatório").max(200),
  brand: z.string().trim().max(100).optional().nullable(),
  unit: z.string().trim().max(20).optional().nullable(),
  barcode: z.string().trim().max(64).optional().nullable(),
  establishmentId: z.string().uuid("Selecione um estabelecimento"),
  price: z.number().positive("Preço deve ser maior que zero").max(1_000_000),
  quantity: z.number().positive().max(10_000).optional().nullable(),
});

export type AdminManualProductInput = z.infer<typeof InputSchema>;

export const adminCreateManualProduct = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalized = normalize(data.displayName);

    // 1) Upsert no catálogo por normalized_name
    const catalog = supabaseAdmin.from("product_catalog") as unknown as {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
      insert: (p: Record<string, unknown>) => {
        select: (s: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
      update: (p: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };

    const { data: existing, error: findErr } = await catalog
      .select("id")
      .eq("normalized_name", normalized)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);

    let catalogId: string;
    if (existing) {
      catalogId = existing.id;
      const { error: updErr } = await catalog
        .update({
          display_name: data.displayName.trim(),
          brand: data.brand?.trim() || null,
          default_unit: data.unit?.trim() || null,
          barcode: data.barcode?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", catalogId);
      if (updErr) throw new Error(updErr.message);
    } else {
      const { data: inserted, error: insErr } = await catalog
        .insert({
          normalized_name: normalized,
          display_name: data.displayName.trim(),
          brand: data.brand?.trim() || null,
          default_unit: data.unit?.trim() || null,
          barcode: data.barcode?.trim() || null,
        })
        .select("id")
        .single();
      if (insErr || !inserted) throw new Error(insErr?.message ?? "Falha ao criar produto");
      catalogId = inserted.id;
    }

    // 2) Nome do estabelecimento para preencher market_name
    const { data: est } = await supabaseAdmin
      .from("establishments")
      .select("name")
      .eq("id", data.establishmentId)
      .maybeSingle();

    // 3) Insere captura de preço em scans
    const { data: scan, error: scanErr } = await supabaseAdmin
      .from("scans")
      .insert({
        user_id: context.userId,
        establishment_id: data.establishmentId,
        product_name: data.displayName.trim(),
        price_captured: data.price,
        quantity: data.quantity ?? null,
        unit: data.unit?.trim() || null,
        total_price: data.quantity ? Number((data.price * data.quantity).toFixed(2)) : data.price,
        market_name: est?.name ?? null,
        barcode: data.barcode?.trim() || null,
        verdict: "manual",
        status: "ok",
        verified: true,
        verified_by: context.userId,
        verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (scanErr) throw new Error(scanErr.message);

    // 4) Auditoria
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "product.manual_create",
      target_type: "product_catalog",
      target_id: catalogId,
      after: {
        establishment_id: data.establishmentId,
        price: data.price,
        scan_id: scan?.id,
      },
    });

    return { catalogId, scanId: scan?.id ?? null };
  });
