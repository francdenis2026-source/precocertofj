import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type KpiEvolutionPoint = {
  day: string;
  avgPrice: number;
  minPrice: number;
  samples: number;
};

export type StoreShare = {
  id: string;
  name: string;
  neighborhood: string | null;
  city: string | null;
  prices: number;
  products: number;
  share: number;
  avgPrice: number;
  cheapestWins: number;
};

export type VariationAlert = {
  id: string;
  productName: string;
  storeName: string;
  price: number;
  previousPrice: number | null;
  changePct: number;
  capturedAt: string;
  direction: "up" | "down";
};

export type AdminKpiBoard = {
  evolution: KpiEvolutionPoint[];
  stores: StoreShare[];
  alerts: VariationAlert[];
  totals: {
    prices: number;
    stores: number;
    products: number;
    upAlerts: number;
    downAlerts: number;
  };
  range: { from: string; to: string; days: number };
  generatedAt: string;
};

export type BestPriceRow = {
  productKey: string;
  productName: string;
  price: number;
  avgPrice: number;
  maxPrice: number;
  savingsPct: number;
  storeName: string;
  neighborhood: string | null;
  city: string | null;
  storeCount: number;
  lastSeenAt: string | null;
};

/* ------------------------------------------------------------------ */
/* Painel de KPIs                                                      */
/* ------------------------------------------------------------------ */

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export const getAdminKpiBoard = createServerFn({ method: "POST" })
  .inputValidator((input: { days?: number; minChangePct?: number } | undefined) => ({
    days: Math.min(180, Math.max(7, Math.round(Number(input?.days ?? 30)) || 30)),
    minChangePct: Math.min(90, Math.max(1, Number(input?.minChangePct ?? 8))),
  }))
  .middleware([requireAdmin])
  .handler(async ({ data }): Promise<AdminKpiBoard> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const to = new Date();
    const from = new Date(to.getTime() - (data.days - 1) * 86_400_000);
    const since = `${isoDay(from)}T00:00:00.000Z`;

    const [scansRes, storesRes, histRes] = await Promise.all([
      supabaseAdmin
        .from("scans")
        .select("id, product_name, price_captured, created_at, establishment_id")
        .eq("status", "salvo")
        .not("price_captured", "is", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20000),
      supabaseAdmin.from("establishments").select("id, name, neighborhood, city, active"),
      supabaseAdmin
        .from("product_price_history")
        .select("id, product_name, price, previous_price, change_pct, captured_at, establishment_id")
        .gte("captured_at", since)
        .not("change_pct", "is", null)
        .order("captured_at", { ascending: false })
        .limit(4000),
    ]);
    if (scansRes.error) throw new Error(scansRes.error.message);
    if (storesRes.error) throw new Error(storesRes.error.message);

    const stores = (storesRes.data ?? []) as Array<{
      id: string;
      name: string;
      neighborhood: string | null;
      city: string | null;
      active: boolean | null;
    }>;
    const storeById = new Map(stores.map((s) => [s.id, s]));

    const scans = (scansRes.data ?? []) as Array<{
      id: string;
      product_name: string | null;
      price_captured: number | string | null;
      created_at: string;
      establishment_id: string | null;
    }>;

    const norm = (n: string | null) =>
      (n ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    /* Evolução diária */
    const perDay = new Map<string, { sum: number; count: number; min: number }>();
    /* Participação por estabelecimento */
    const perStore = new Map<
      string,
      { prices: number; sum: number; products: Set<string> }
    >();
    /* Menor preço por produto (para "vitórias" de preço) */
    const cheapest = new Map<string, { price: number; storeId: string }>();
    const products = new Set<string>();

    for (const s of scans) {
      const price = Number(s.price_captured);
      if (!Number.isFinite(price) || price <= 0) continue;
      const key = norm(s.product_name);
      if (key) products.add(key);

      const day = s.created_at.slice(0, 10);
      const bucket = perDay.get(day) ?? { sum: 0, count: 0, min: price };
      bucket.sum += price;
      bucket.count += 1;
      bucket.min = Math.min(bucket.min, price);
      perDay.set(day, bucket);

      if (s.establishment_id) {
        const st = perStore.get(s.establishment_id) ?? {
          prices: 0,
          sum: 0,
          products: new Set<string>(),
        };
        st.prices += 1;
        st.sum += price;
        if (key) st.products.add(key);
        perStore.set(s.establishment_id, st);

        if (key) {
          const cur = cheapest.get(key);
          if (!cur || price < cur.price) cheapest.set(key, { price, storeId: s.establishment_id });
        }
      }
    }

    const wins = new Map<string, number>();
    for (const { storeId } of cheapest.values()) wins.set(storeId, (wins.get(storeId) ?? 0) + 1);

    const totalPrices = scans.length || 1;
    const storeShare: StoreShare[] = [...perStore.entries()]
      .map(([id, v]) => {
        const st = storeById.get(id);
        return {
          id,
          name: st?.name ?? "Estabelecimento",
          neighborhood: st?.neighborhood ?? null,
          city: st?.city ?? null,
          prices: v.prices,
          products: v.products.size,
          share: Number(((v.prices / totalPrices) * 100).toFixed(1)),
          avgPrice: Number((v.sum / Math.max(1, v.prices)).toFixed(2)),
          cheapestWins: wins.get(id) ?? 0,
        };
      })
      .sort((a, b) => b.prices - a.prices);

    const evolution: KpiEvolutionPoint[] = [...perDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({
        day,
        avgPrice: Number((v.sum / v.count).toFixed(2)),
        minPrice: Number(v.min.toFixed(2)),
        samples: v.count,
      }))
      .slice(-90);

    const hist = (histRes.error ? [] : (histRes.data ?? [])) as Array<{
      id: string;
      product_name: string | null;
      price: number | string | null;
      previous_price: number | string | null;
      change_pct: number | string | null;
      captured_at: string;
      establishment_id: string | null;
    }>;

    const alerts: VariationAlert[] = hist
      .map((h) => {
        const pct = Number(h.change_pct);
        const price = Number(h.price);
        const prev = h.previous_price == null ? null : Number(h.previous_price);
        return {
          id: h.id,
          productName: h.product_name ?? "—",
          storeName: h.establishment_id
            ? (storeById.get(h.establishment_id)?.name ?? "—")
            : "—",
          price: Number.isFinite(price) ? price : 0,
          previousPrice: prev != null && Number.isFinite(prev) ? prev : null,
          changePct: Number.isFinite(pct) ? Number(pct.toFixed(1)) : 0,
          capturedAt: h.captured_at,
          direction: (pct >= 0 ? "up" : "down") as "up" | "down",
        };
      })
      .filter((a) => Math.abs(a.changePct) >= data.minChangePct)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 60);

    return {
      evolution,
      stores: storeShare,
      alerts,
      totals: {
        prices: scans.length,
        stores: storeShare.length,
        products: products.size,
        upAlerts: alerts.filter((a) => a.direction === "up").length,
        downAlerts: alerts.filter((a) => a.direction === "down").length,
      },
      range: { from: isoDay(from), to: isoDay(to), days: data.days },
      generatedAt: new Date().toISOString(),
    };
  });

/* ------------------------------------------------------------------ */
/* Relatório de melhores preços                                        */
/* ------------------------------------------------------------------ */

export const getBestPricesReport = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { limit?: number; city?: string | null; neighborhood?: string | null } | undefined) => ({
      limit: Math.min(1000, Math.max(10, Math.round(Number(input?.limit ?? 200)) || 200)),
      city: input?.city?.trim() || null,
      neighborhood: input?.neighborhood?.trim() || null,
    }),
  )
  .middleware([requireAdmin])
  .handler(async ({ data }): Promise<BestPriceRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [cacheRes, storesRes] = await Promise.all([
      supabaseAdmin
        .from("product_comparison_cache")
        .select(
          "product_key, display_name, min_price, avg_price, max_price, savings_pct, cheapest_store, cheapest_establishment_id, store_count, last_seen_at",
        )
        .not("min_price", "is", null)
        .order("savings_pct", { ascending: false })
        .limit(2000),
      supabaseAdmin.from("establishments").select("id, name, neighborhood, city"),
    ]);
    if (cacheRes.error) throw new Error(cacheRes.error.message);

    const storeById = new Map(
      ((storesRes.data ?? []) as Array<{
        id: string;
        name: string;
        neighborhood: string | null;
        city: string | null;
      }>).map((s) => [s.id, s]),
    );

    const rows = ((cacheRes.data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const store = r.cheapest_establishment_id
        ? storeById.get(String(r.cheapest_establishment_id))
        : undefined;
      return {
        productKey: String(r.product_key ?? ""),
        productName: String(r.display_name ?? r.product_key ?? "—"),
        price: Number(r.min_price ?? 0),
        avgPrice: Number(r.avg_price ?? 0),
        maxPrice: Number(r.max_price ?? 0),
        savingsPct: Number(r.savings_pct ?? 0),
        storeName: String(r.cheapest_store ?? store?.name ?? "—"),
        neighborhood: store?.neighborhood ?? null,
        city: store?.city ?? null,
        storeCount: Number(r.store_count ?? 0),
        lastSeenAt: (r.last_seen_at as string | null) ?? null,
      } satisfies BestPriceRow;
    });

    const match = (v: string | null, filter: string | null) =>
      !filter ||
      (v ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(
          filter
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
        );

    return rows
      .filter((r) => match(r.city, data.city) && match(r.neighborhood, data.neighborhood))
      .slice(0, data.limit);
  });
