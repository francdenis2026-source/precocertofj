import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

/**
 * Fluxo rápido de registro de preços:
 * - sugestão de produto pelo nome (catálogo + histórico de scans)
 * - verificação por código de barras quando existir
 * - gravação em `scans` com poucos cliques
 */

export type QuickSuggestion = {
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  imageUrl: string | null;
  lastPrice: number | null;
  source: "catalogo" | "historico";
};

const deaccent = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const quickSuggestProducts = createServerFn({ method: "POST" })
  .validator((input: { q?: string; barcode?: string } | undefined) => ({
    q: (input?.q ?? "").trim().slice(0, 80),
    barcode: (input?.barcode ?? "").replace(/\D/g, "").slice(0, 20),
  }))
  .middleware([requireAdmin])
  .handler(async ({ data }): Promise<QuickSuggestion[]> => {
    if (!data.q && !data.barcode) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let catalogQ = supabaseAdmin
      .from("product_catalog")
      .select("display_name, brand, category, barcode, image_url")
      .limit(12);
    catalogQ = data.barcode
      ? catalogQ.eq("barcode", data.barcode)
      : catalogQ.ilike("display_name", `%${data.q}%`);

    let scansQ = supabaseAdmin
      .from("scans")
      .select("product_name, barcode, price_captured, created_at")
      .not("price_captured", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);
    scansQ = data.barcode
      ? scansQ.eq("barcode", data.barcode)
      : scansQ.ilike("product_name", `%${data.q}%`);

    const [catalog, scans] = await Promise.all([catalogQ, scansQ]);

    const out: QuickSuggestion[] = [];
    const seen = new Set<string>();

    for (const row of (catalog.data ?? []) as Array<Record<string, unknown>>) {
      const name = String(row.display_name ?? "").trim();
      if (!name || seen.has(deaccent(name))) continue;
      seen.add(deaccent(name));
      out.push({
        name,
        brand: (row.brand as string | null) ?? null,
        category: (row.category as string | null) ?? null,
        barcode: (row.barcode as string | null) ?? null,
        imageUrl: (row.image_url as string | null) ?? null,
        lastPrice: null,
        source: "catalogo",
      });
    }

    for (const row of (scans.data ?? []) as Array<Record<string, unknown>>) {
      const name = String(row.product_name ?? "").trim();
      if (!name) continue;
      const key = deaccent(name);
      const existing = out.find((o) => deaccent(o.name) === key);
      const price = Number(row.price_captured);
      if (existing) {
        if (existing.lastPrice == null && Number.isFinite(price)) existing.lastPrice = price;
        continue;
      }
      if (seen.has(key) || out.length >= 20) continue;
      seen.add(key);
      out.push({
        name,
        brand: null,
        category: null,
        barcode: (row.barcode as string | null) ?? null,
        imageUrl: null,
        lastPrice: Number.isFinite(price) ? price : null,
        source: "historico",
      });
    }

    return out.slice(0, 20);
  });

export type QuickRegisterResult = {
  ok: true;
  scanId: string;
  productName: string;
  price: number;
  storeName: string;
};

export const quickRegisterPrice = createServerFn({ method: "POST" })
  .validator(
    (input: {
      establishmentId: string;
      productName: string;
      price: number;
      quantity?: number | null;
      unit?: string | null;
      barcode?: string | null;
    }) => {
      const productName = String(input?.productName ?? "").trim();
      const price = Number(input?.price);
      if (!input?.establishmentId) throw new Error("Selecione o estabelecimento.");
      if (productName.length < 2) throw new Error("Informe o nome do produto.");
      if (!Number.isFinite(price) || price <= 0 || price > 1_000_000)
        throw new Error("Preço inválido.");
      return {
        establishmentId: String(input.establishmentId),
        productName,
        price: Number(price.toFixed(2)),
        quantity:
          input.quantity != null && Number.isFinite(Number(input.quantity))
            ? Number(input.quantity)
            : null,
        unit: input.unit?.trim() || null,
        barcode: (input.barcode ?? "").replace(/\D/g, "").slice(0, 20) || null,
      };
    },
  )
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<QuickRegisterResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: store, error: storeErr } = await supabaseAdmin
      .from("establishments")
      .select("id, name")
      .eq("id", data.establishmentId)
      .maybeSingle();
    if (storeErr) throw new Error(storeErr.message);
    if (!store) throw new Error("Estabelecimento não encontrado.");

    const total =
      data.quantity && data.quantity > 0
        ? Number((data.price * data.quantity).toFixed(2))
        : data.price;

    const { data: inserted, error } = await supabaseAdmin
      .from("scans")
      .insert({
        user_id: context.userId,
        establishment_id: data.establishmentId,
        market_name: (store as { name: string }).name,
        product_name: data.productName,
        price_captured: data.price,
        total_price: total,
        quantity: data.quantity,
        unit: data.unit,
        barcode: data.barcode,
        verdict: "ok",
        status: "salvo",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return {
      ok: true,
      scanId: String((inserted as { id: string }).id),
      productName: data.productName,
      price: data.price,
      storeName: (store as { name: string }).name,
    };
  });
