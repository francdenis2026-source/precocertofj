import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

/**
 * Server fns para o fluxo de "último scan": edição rápida (preço/marca/nome/peso)
 * e inserção com dedupe silencioso via `find_similar_scans` + comparação de peso/preço.
 *
 * Todas as fns são admin-only (requireAdmin verifica a role antes do handler).
 */

export type QuickEditPatch = {
  productName?: string;
  priceCaptured?: number;
  brand?: string; // stored inside product_name suffix if changed independently
  sizeLabel?: string; // idem — usado para reescrever product_name com peso normalizado
};

export type InsertDedupeInput = {
  productName: string;
  priceCaptured: number;
  establishmentId: string;
  barcode?: string | null;
  brand?: string | null;
  marketName?: string | null;
  force?: boolean;
};

export type InsertDedupeResult =
  | { status: "inserted"; id: string; productName: string }
  | {
      status: "duplicate";
      existingId: string;
      existingName: string;
      existingPrice: number;
      similarity: number;
    };

export const updateLastScan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string; patch: QuickEditPatch }) => {
    if (!input.id) throw new Error("id obrigatório");
    if (!input.patch || typeof input.patch !== "object") throw new Error("patch inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current, error: getErr } = await context.supabase
      .from("scans")
      .select("id, product_name, price_captured")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!current) throw new Error("Scan não encontrado");

    const patch: Record<string, unknown> = {};
    let nextName = current.product_name as string | null;

    if (typeof data.patch.productName === "string" && data.patch.productName.trim()) {
      nextName = data.patch.productName.trim();
    }
    // Anexa/atualiza sufixo de peso quando enviado isoladamente.
    if (typeof data.patch.sizeLabel === "string" && data.patch.sizeLabel.trim()) {
      const size = data.patch.sizeLabel.trim();
      const base = (nextName ?? "").replace(
        /\b\d+(?:[.,]\d+)?\s*(?:kg|g|mg|ml|l|un|und|unid|pct|cx)\b/gi,
        "",
      ).trim();
      nextName = `${base} ${size}`.replace(/\s+/g, " ").trim();
    }
    if (typeof data.patch.brand === "string" && data.patch.brand.trim()) {
      const b = data.patch.brand.trim();
      if (nextName && !nextName.toLowerCase().includes(b.toLowerCase())) {
        nextName = `${nextName} ${b}`;
      } else if (!nextName) {
        nextName = b;
      }
    }
    if (nextName && nextName !== current.product_name) {
      patch.product_name = nextName;
    }
    if (
      typeof data.patch.priceCaptured === "number" &&
      Number.isFinite(data.patch.priceCaptured) &&
      data.patch.priceCaptured > 0
    ) {
      patch.price_captured = data.patch.priceCaptured;
    }

    if (Object.keys(patch).length === 0) {
      return { ok: true as const, unchanged: true as const };
    }

    const { error: updErr } = await (supabaseAdmin.from("scans") as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    })
      .update(patch)
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true as const, unchanged: false as const, productName: nextName };
  });

export const insertScanWithDedupe = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: InsertDedupeInput) => {
    if (!input.productName?.trim()) throw new Error("productName obrigatório");
    if (!input.establishmentId) throw new Error("establishmentId obrigatório");
    if (!(input.priceCaptured > 0)) throw new Error("priceCaptured inválido");
    return input;
  })
  .handler(async ({ data, context }): Promise<InsertDedupeResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const name = data.productName.trim();

    // 1) Busca similares via fn Postgres já existente
    const { data: similar, error: simErr } = await context.supabase.rpc(
      "find_similar_scans" as never,
      {
        p_name: name,
        p_establishment_id: data.establishmentId,
        p_threshold: 0.55,
      } as never,
    );
    if (simErr) throw new Error(simErr.message);

    type Similar = { id: string; product_name: string; price_captured: number; similarity: number };
    const rows = (similar ?? []) as Similar[];

    // 2) Extrai peso do nome atual
    const { data: sizeRow } = await context.supabase.rpc(
      "extract_product_size" as never,
      { name } as never,
    );
    const size = (Array.isArray(sizeRow) ? sizeRow[0] : sizeRow) as
      | { size_value: number | null; size_unit: string | null }
      | null
      | undefined;
    const targetSizeValue = size?.size_value ?? null;
    const targetSizeUnit = size?.size_unit ?? "un";
    const targetPrice = Math.round(data.priceCaptured * 100) / 100;

    // 3) Verifica dedupe estrito: similaridade >= 0.85 + mesmo peso + mesmo preço
    if (!data.force) {
      for (const r of rows) {
        if (r.similarity < 0.85) continue;
        const { data: rSizeRaw } = await context.supabase.rpc(
          "extract_product_size" as never,
          { name: r.product_name } as never,
        );
        const rSize = (Array.isArray(rSizeRaw) ? rSizeRaw[0] : rSizeRaw) as
          | { size_value: number | null; size_unit: string | null }
          | null
          | undefined;
        const sameSize =
          (rSize?.size_value ?? null) === targetSizeValue &&
          (rSize?.size_unit ?? "un") === targetSizeUnit;
        const samePrice = Math.round(Number(r.price_captured) * 100) / 100 === targetPrice;
        if (sameSize && samePrice) {
          return {
            status: "duplicate",
            existingId: r.id,
            existingName: r.product_name,
            existingPrice: Number(r.price_captured),
            similarity: Number(r.similarity),
          };
        }
      }
    }

    // 4) Insere
    const payload = {
      product_name: name,
      price_captured: targetPrice,
      establishment_id: data.establishmentId,
      barcode: data.barcode ?? null,
      market_name: data.marketName ?? null,
      status: "salvo",
      verdict: "justo",
      user_id: null,
    };
    const scansTable = supabaseAdmin.from("scans") as unknown as {
      insert: (v: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: inserted, error: insErr } = await scansTable
      .insert(payload)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { status: "inserted", id: inserted!.id, productName: name };
  });

export type LastScanRow = {
  id: string;
  productName: string;
  priceCaptured: number;
  storeName: string | null;
  createdAt: string;
};

/**
 * Retorna o último scan (`status='salvo'`) inserido para um estabelecimento.
 * Persiste o card de "último scan" após refresh/login no painel admin.
 */
export const getLastScanByEstablishment = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((input: { establishmentId: string }) => {
    if (!input.establishmentId) throw new Error("establishmentId obrigatório");
    return input;
  })
  .handler(async ({ data, context }): Promise<LastScanRow | null> => {
    const { data: row, error } = await context.supabase
      .from("scans")
      .select("id, product_name, price_captured, market_name, created_at")
      .eq("establishment_id", data.establishmentId)
      .eq("status", "salvo")
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      id: row.id as string,
      productName: (row.product_name as string) ?? "",
      priceCaptured: Number(row.price_captured ?? 0),
      storeName: (row.market_name as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  });
