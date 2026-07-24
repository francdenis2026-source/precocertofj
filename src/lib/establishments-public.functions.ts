import { createServerFn } from "@tanstack/react-start";

export type EstablishmentStat = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  kind: string | null;
  productsCount: number;
  topCategories: Array<{ category: string; count: number }>;
  lastUpdate: string | null;
  maxSavings: number;
};

export type EstablishmentsOverview = {
  totalEstablishments: number;
  totalProducts: number;
  totalCategories: number;
  totalMaxSavings: number;
  topGlobalCategories: Array<{ category: string; count: number }>;
  items: EstablishmentStat[];
};

const CATEGORY_LABELS: Record<string, string> = {
  laticinios: "Laticínios",
  carnes: "Carnes",
  padaria: "Padaria",
  biscoitos: "Biscoitos",
  doces: "Doces",
  bebidas: "Bebidas",
  bebidas_em_po: "Bebidas em pó",
  limpeza: "Limpeza",
  higiene: "Higiene",
  mercearia: "Mercearia",
  congelados: "Congelados",
  outros: "Outros",
};

export const humanizeCategory = (c: string): string => CATEGORY_LABELS[c] ?? c;

export const listPublicEstablishments = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstablishmentsOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: unknown) => {
            order: (c: string, o: { ascending: boolean }) => Promise<{
              data: Array<{
                id: string;
                name: string;
                city: string | null;
                state: string | null;
                neighborhood: string | null;
                logo_url: string | null;
                brand_color: string | null;
              }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };

    const { data: ests, error: eErr } = await client
      .from("establishments")
      .select("id, name, city, state, neighborhood, logo_url, brand_color")
      .eq("active", true)
      .order("name", { ascending: true });
    if (eErr) throw new Error(eErr.message);

    // Aggregate scans → category counts per establishment.
    // Supabase-js default row cap is 1000; total scans exceed that,
    // so paginate explicitly to keep every establishment counted.
    const scanClient = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: unknown) => {
            is: (c: string, v: null) => {
              not: (c: string, op: string, v: unknown) => {
                range: (from: number, to: number) => Promise<{
                  data: Array<{
                    establishment_id: string;
                    product_name: string;
                    created_at: string;
                  }> | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
    };

    const PAGE = 1000;
    let offset = 0;
    const scans: Array<{ establishment_id: string; product_name: string; created_at: string }> = [];
    while (offset < 200_000) {
      const { data, error: sErr } = await scanClient
        .from("scans")
        .select("establishment_id, product_name, created_at")
        .eq("status", "salvo")
        .is("user_id", null)
        .not("product_name", "is", null)
        .range(offset, offset + PAGE - 1);
      if (sErr) throw new Error(sErr.message);
      const batch = data ?? [];
      scans.push(...batch);
      if (batch.length < PAGE) break;
      offset += PAGE;
    }

    // Classify locally with lightweight regex-mirror of classify_product_category
    const classify = (name: string): string => {
      const s = (name || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (/\b(leite|queijo|manteiga|margarina|iogurte|requeij|nata|coalhad|danone|batavo|italac|itamb|qualy|vigor|claybom|mococa|ninho|piracanjuba|elege|batavinho)\b/.test(s))
        return "laticinios";
      if (/\b(frango|carne|carnes|bovin|suin|porco|peixe|tilapia|salmao|linguica|calabresa|salsicha|presunto|mortadela|bacon|hamburguer|pernil|costela)\b/.test(s))
        return "carnes";
      if (/\b(pao|torrada|bolo|panetone|rosquinha|croissant)\b/.test(s)) return "padaria";
      if (/(biscoit|bolach|wafer|cream cracker|cracker|oreo|club social|richester|marilan|belma|vitarella)/.test(s))
        return "biscoitos";
      if (/\b(chocolat|bombom|bala|brigadeiro|geleia|pacoca)\b/.test(s)) return "doces";
      if (/\b(refrigerante|coca|guarana|pepsi|fanta|suco|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca)\b/.test(s))
        return "bebidas";
      if (/\b(cafe|achocolatado|nescau|toddy|matte|mingau|sucrilhos|cereal|aveia|pilao)\b/.test(s)) return "bebidas_em_po";
      if (/(sabao|detergente|alvejante|amaciante|desinfet|agua sanitaria|multiuso|lava roupa|inseticida|repelente|pinho sol|omo|ariel|ype|tixan|urca|cif)/.test(s))
        return "limpeza";
      if (/(creme dental|enxaguante bucal|papel higienic|papel toalha|shampoo|condicionador|desodorante|absorvente|fralda|sabonete|colgate|sorriso|closeup|dove|nivea|protex)/.test(s))
        return "higiene";
      if (/\b(arroz|feijao|acucar|farinha|macarrao|espaguete|oleo|azeite|vinagre|sal|fuba|amido|fermento|tempero|maionese|ketchup|mostarda|atum|sardinha|azeitona|milho|ervilha|cuscuz)\b/.test(s))
        return "mercearia";
      if (/\b(sorvete|congelad|nugget)\b/.test(s)) return "congelados";
      return "outros";
    };

    type Agg = { total: Set<string>; cats: Map<string, number>; last: string | null };
    const byEst = new Map<string, Agg>();
    for (const s of scans ?? []) {
      let agg = byEst.get(s.establishment_id);
      if (!agg) {
        agg = { total: new Set(), cats: new Map(), last: null };
        byEst.set(s.establishment_id, agg);
      }
      const key = s.product_name.toLowerCase().trim();
      agg.total.add(key);
      const cat = classify(s.product_name);
      agg.cats.set(cat, (agg.cats.get(cat) ?? 0) + 1);
      if (!agg.last || s.created_at > agg.last) agg.last = s.created_at;
    }

    const items: EstablishmentStat[] = (ests ?? []).map((e) => {
      const agg = byEst.get(e.id);
      const cats = agg
        ? Array.from(agg.cats.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([category, count]) => ({ category, count }))
        : [];
      return {
        id: e.id,
        name: e.name,
        city: e.city,
        state: e.state,
        neighborhood: e.neighborhood,
        logoUrl: e.logo_url,
        brandColor: e.brand_color,
        productsCount: agg?.total.size ?? 0,
        topCategories: cats,
        lastUpdate: agg?.last ?? null,
      };
    });

    items.sort((a, b) => b.productsCount - a.productsCount);

    // Global category ranking
    const globalCats = new Map<string, number>();
    for (const agg of byEst.values()) {
      for (const [c, n] of agg.cats) globalCats.set(c, (globalCats.get(c) ?? 0) + n);
    }
    const topGlobalCategories = Array.from(globalCats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, count]) => ({ category, count }));

    const totalProducts = items.reduce((s, i) => s + i.productsCount, 0);

    return {
      totalEstablishments: items.length,
      totalProducts,
      totalCategories: globalCats.size,
      topGlobalCategories,
      items,
    };
  },
);
