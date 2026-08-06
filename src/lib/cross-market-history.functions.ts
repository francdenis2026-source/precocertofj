import { createServerFn } from "@tanstack/react-start";

export type MarketPricePoint = {
  establishmentId: string;
  storeName: string;
  price: number;
  productName: string;
  createdAt: string;
};

export type MarketAggregate = {
  establishmentId: string;
  storeName: string;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  lastPrice: number;
  lastSeenAt: string;
  samples: number;
  points: { date: string; price: number }[];
};

export type CrossMarketHistory = {
  productKey: string;
  displayName: string | null;
  overallMin: number | null;
  overallAvg: number | null;
  overallMax: number | null;
  markets: MarketAggregate[];
  timeline: MarketPricePoint[];
};

/**
 * Histórico de preços de um produto (identificado pela key normalizada)
 * em todos os mercados que já escanearam esse item.
 * Público — usa scans oficiais (user_id IS NULL, status='salvo').
 */
export const getCrossMarketHistory = createServerFn({ method: "POST" })
  .validator((input: { productKey?: string; productName?: string }) => {
    if (!input.productKey && !input.productName) {
      throw new Error("Informe productKey ou productName");
    }
    return input;
  })
  .handler(async ({ data }): Promise<CrossMarketHistory> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Normaliza a chave via fn Postgres se veio productName
    let key = data.productKey ?? "";
    if (!key && data.productName) {
      const { data: normRow } = await supabaseAdmin.rpc(
        "normalize_product_key" as never,
        { name: data.productName } as never,
      );
      key = (typeof normRow === "string" ? normRow : "") || "";
    }
    if (!key) {
      return {
        productKey: "",
        displayName: null,
        overallMin: null,
        overallAvg: null,
        overallMax: null,
        markets: [],
        timeline: [],
      };
    }

    // 2) Puxa scans dos últimos 180 dias
    const scansTable = supabaseAdmin.from("scans") as unknown as {
      select: (cols: string) => {
        eq: (col: string, v: string) => {
          is: (col: string, v: null) => {
            not: (col: string, op: string, v: null) => {
              order: (col: string, o: { ascending: boolean }) => {
                limit: (n: number) => Promise<{
                  data:
                    | Array<{
                        id: string;
                        product_name: string | null;
                        price_captured: number | null;
                        establishment_id: string | null;
                        created_at: string;
                      }>
                    | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
    };

    const { data: allScans, error } = await scansTable
      .select("id, product_name, price_captured, establishment_id, created_at")
      .eq("status", "salvo")
      .is("user_id", null)
      .not("price_captured", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const scans = (allScans ?? []).filter((r) => r.product_name && r.establishment_id);

    // 3) Filtra pelas keys iguais — normalização local rápida por prefixo (evita RPC N vezes)
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|un|und|unid|pct|cx)\b/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !["com", "sem", "para", "the", "and"].includes(t))
        .sort()
        .join(" ");

    const matching = scans.filter((r) => normalize(r.product_name!) === key);
    if (matching.length === 0) {
      return {
        productKey: key,
        displayName: null,
        overallMin: null,
        overallAvg: null,
        overallMax: null,
        markets: [],
        timeline: [],
      };
    }

    // 4) Estabelecimentos únicos
    const estIds = Array.from(
      new Set(matching.map((r) => r.establishment_id!).filter(Boolean)),
    );
    const estsTable = supabaseAdmin.from("establishments") as unknown as {
      select: (cols: string) => {
        in: (col: string, v: string[]) => Promise<{
          data: Array<{ id: string; name: string }> | null;
          error: { message: string } | null;
        }>;
      };
    };
    const { data: ests } = await estsTable
      .select("id, name")
      .in("id", estIds);
    const nameById = new Map<string, string>();
    (ests ?? []).forEach((e) => nameById.set(e.id, e.name));

    // 5) Agrega por mercado
    const byMarket = new Map<
      string,
      { prices: number[]; points: { date: string; price: number }[]; lastAt: string; lastPrice: number }
    >();
    for (const s of matching) {
      const eid = s.establishment_id!;
      const price = Number(s.price_captured);
      if (!Number.isFinite(price) || price <= 0) continue;
      const g = byMarket.get(eid) ?? {
        prices: [],
        points: [],
        lastAt: s.created_at,
        lastPrice: price,
      };
      g.prices.push(price);
      g.points.push({ date: s.created_at, price });
      if (s.created_at > g.lastAt) {
        g.lastAt = s.created_at;
        g.lastPrice = price;
      }
      byMarket.set(eid, g);
    }

    const markets: MarketAggregate[] = Array.from(byMarket.entries())
      .map(([eid, g]) => {
        const sorted = [...g.points].sort((a, b) => a.date.localeCompare(b.date));
        return {
          establishmentId: eid,
          storeName: nameById.get(eid) ?? "Mercado",
          minPrice: Math.min(...g.prices),
          avgPrice: g.prices.reduce((a, b) => a + b, 0) / g.prices.length,
          maxPrice: Math.max(...g.prices),
          lastPrice: g.lastPrice,
          lastSeenAt: g.lastAt,
          samples: g.prices.length,
          points: sorted,
        };
      })
      .sort((a, b) => a.lastPrice - b.lastPrice);

    const allPrices = matching.map((r) => Number(r.price_captured)).filter((n) => n > 0);
    const overallMin = allPrices.length ? Math.min(...allPrices) : null;
    const overallMax = allPrices.length ? Math.max(...allPrices) : null;
    const overallAvg = allPrices.length
      ? Math.round((allPrices.reduce((a, b) => a + b, 0) / allPrices.length) * 100) / 100
      : null;

    const timeline: MarketPricePoint[] = matching.map((r) => ({
      establishmentId: r.establishment_id!,
      storeName: nameById.get(r.establishment_id!) ?? "Mercado",
      price: Number(r.price_captured),
      productName: r.product_name!,
      createdAt: r.created_at,
    }));

    const displayName = matching
      .map((r) => r.product_name!)
      .sort((a, b) => a.length - b.length)[0];

    return {
      productKey: key,
      displayName,
      overallMin,
      overallAvg,
      overallMax,
      markets,
      timeline,
    };
  });
