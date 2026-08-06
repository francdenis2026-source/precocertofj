import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signStorageImageUrl } from "@/lib/product-image-utils";
import { slugifyText } from "@/lib/text-normalize";

/* ============================ TYPES ============================ */

export type FavoriteItem = {
  id: string;
  catalogId: string;
  catalogSlug: string;
  displayName: string;
  brand: string | null;
  defaultUnit: string | null;
  imageUrl: string | null;
  createdAt: string;
  sortOrder: number;
  targetPrice: number | null;
  preferredEstablishmentId: string | null;
  preferredEstablishmentName: string | null;
  currentPrice: number | null;
  currentPriceAt: string | null;
  previousPrice: number | null;
  previousPriceAt: string | null;
  lastEstablishmentId: string | null;
};


export type FavoriteMarket = {
  id: string;
  marketName: string;
  createdAt: string;
  sortOrder: number;
};

export type AppSummary = {
  lists: Array<{
    id: string;
    name: string;
    itemCount: number;
    updatedAt: string;
    favoriteItems: Array<{
      catalogId: string;
      displayName: string;
      bestMarket: string;
      bestPrice: number;
    }>;
    recommendedMarket: string | null;
    recommendedTotal: number | null;
    potentialSavings: number | null;
  }>;
  favoriteItems: Array<{
    favoriteId: string;
    catalogId: string;
    displayName: string;
    brand: string | null;
    imageUrl: string | null;
    targetPrice: number | null;
    lastPrice: number | null;
    best: { marketName: string; price: number } | null;
  }>;
  favoriteMarkets: Array<{
    favoriteId: string;
    marketName: string;
    itemsCovered: number;
    total: number;
    lastTotal: number | null;
  }>;
  totals: {
    listsCount: number;
    itemsCount: number;
    favoritesCount: number;
    estimatedCartTotal: number | null;
    estimatedCartMarket: string | null;
  };
};

const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

/* ============================ ITEMS ============================ */

export const listFavoriteItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FavoriteItem[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("favorite_items")
      .select("id, catalog_id, created_at, sort_order, target_price, preferred_establishment_id")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    if (list.length === 0) return [];

    const catIds = list.map((r) => r.catalog_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type CatRow = {
      id: string;
      display_name: string;
      brand: string | null;
      default_unit: string | null;
      image_url: string | null;
      normalized_name: string | null;
      barcode: string | null;
    };
    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        in: (
          c: string,
          v: string[],
        ) => Promise<{ data: CatRow[] | null; error: { message: string } | null }>;
      };
    };
    const { data: cats } = await table
      .select("id, display_name, brand, default_unit, image_url, normalized_name, barcode")
      .in("id", catIds);
    const map = new Map<string, CatRow>();
    const signedCats = await Promise.all(
      (cats ?? []).map(async (c) => ({
        ...c,
        image_url: await signStorageImageUrl(c.image_url, supabaseAdmin),
      })),
    );
    for (const c of signedCats) map.set(c.id, c);

    // Fetch establishment names for preferred stores
    const estabIds = Array.from(
      new Set(list.map((r) => r.preferred_establishment_id).filter((v): v is string => !!v)),
    );
    const estabMap = new Map<string, string>();
    if (estabIds.length > 0) {
      const estabTable = supabaseAdmin.from("establishments" as never) as unknown as {
        select: (s: string) => {
          in: (
            c: string,
            v: string[],
          ) => Promise<{
            data: Array<{ id: string; name: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
      const { data: estabs } = await estabTable.select("id, name").in("id", estabIds);
      for (const e of estabs ?? []) estabMap.set(e.id, e.name);
    }

    // Fetch recent scans in preferred establishments to compute current price
    type ScanRow = {
      barcode: string | null;
      product_name: string | null;
      price_captured: number | null;
      establishment_id: string | null;
      created_at: string;
    };
    const scansByEstab = new Map<string, ScanRow[]>();
    if (estabIds.length > 0) {
      const { data: scans } = await supabaseAdmin
        .from("scans")
        .select("barcode, product_name, price_captured, establishment_id, created_at")
        .in("establishment_id", estabIds)
        .eq("status", "salvo")
        .is("user_id", null)
        .not("price_captured", "is", null)
        .order("created_at", { ascending: false })
        .limit(5000);
      for (const s of (scans ?? []) as ScanRow[]) {
        if (!s.establishment_id || s.price_captured === null) continue;
        if (Number(s.price_captured) <= 0) continue;
        const arr = scansByEstab.get(s.establishment_id) ?? [];
        arr.push(s);
        scansByEstab.set(s.establishment_id, arr);
      }
    }

    const priceAt = (
      cat: CatRow,
      estabId: string,
    ): {
      current: { price: number; at: string } | null;
      previous: { price: number; at: string } | null;
    } => {
      const rows = scansByEstab.get(estabId);
      if (!rows || rows.length === 0) return { current: null, previous: null };
      const targetBarcode = cat.barcode?.trim() || null;
      const targetNorm = cat.normalized_name || normalize(cat.display_name);
      // rows are already ordered by created_at desc
      const matches: Array<{ price: number; at: string }> = [];
      for (const r of rows) {
        const norm = normalize(r.product_name ?? "");
        const ok =
          (targetBarcode && r.barcode?.trim() === targetBarcode) ||
          (norm && targetNorm && (norm.includes(targetNorm) || targetNorm.includes(norm)));
        if (!ok) continue;
        matches.push({ price: Number(r.price_captured), at: r.created_at });
      }
      const current = matches[0] ?? null;
      const previous = matches.find((m) => m.at !== current?.at) ?? null;
      return { current, previous };
    };

    return list.map((r) => {
      const c = map.get(r.catalog_id);
      const quote =
        c && r.preferred_establishment_id
          ? priceAt(c, r.preferred_establishment_id)
          : { current: null, previous: null };
      return {
        id: r.id,
        catalogId: r.catalog_id,
        catalogSlug: slugifyText(c?.display_name || "produto"),
        displayName: c?.display_name ?? "(produto removido)",
        brand: c?.brand ?? null,
        defaultUnit: c?.default_unit ?? null,
        imageUrl: c?.image_url ?? null,
        createdAt: r.created_at,
        sortOrder: r.sort_order ?? 0,
        targetPrice: r.target_price !== null ? Number(r.target_price) : null,
        preferredEstablishmentId: r.preferred_establishment_id ?? null,
        preferredEstablishmentName: r.preferred_establishment_id
          ? (estabMap.get(r.preferred_establishment_id) ?? null)
          : null,
        currentPrice: quote.current ? Number(quote.current.price.toFixed(2)) : null,
        currentPriceAt: quote.current ? quote.current.at : null,
        previousPrice: quote.previous ? Number(quote.previous.price.toFixed(2)) : null,
        previousPriceAt: quote.previous ? quote.previous.at : null,
        lastEstablishmentId: r.preferred_establishment_id ?? null,
      };
    });
  });


export const toggleFavoriteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { catalogId: string }) => {
    if (!input?.catalogId) throw new Error("catalogId obrigatório");
    return { catalogId: input.catalogId };
  })
  .handler(async ({ data, context }): Promise<{ favorited: boolean }> => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("favorite_items")
      .select("id")
      .eq("user_id", userId)
      .eq("catalog_id", data.catalogId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("favorite_items")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { favorited: false };
    }
    const { data: maxRow } = await supabase
      .from("favorite_items")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? -1) + 1;
    const { error } = await supabase
      .from("favorite_items")
      .insert({
        user_id: userId,
        catalog_id: data.catalogId,
        sort_order: nextOrder,
      });
    if (error) throw new Error(error.message);
    return { favorited: true };
  });

export const removeFavoriteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { favoriteId: string }) => {
    if (!input?.favoriteId) throw new Error("favoriteId obrigatório");
    return { favoriteId: input.favoriteId };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorite_items")
      .delete()
      .eq("id", data.favoriteId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderFavoriteItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { ids: string[] }) => {
    if (!Array.isArray(input?.ids)) throw new Error("ids obrigatório");
    return { ids: input.ids.slice(0, 200) };
  })
  .handler(async ({ data, context }) => {
    const updates = data.ids.map((id, idx) =>
      context.supabase
        .from("favorite_items")
        .update({ sort_order: idx })
        .eq("id", id)
        .eq("user_id", context.userId),
    );
    await Promise.all(updates);
    return { ok: true };
  });

export const setFavoriteItemTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { favoriteId: string; targetPrice: number | null }) => {
    if (!input?.favoriteId) throw new Error("favoriteId obrigatório");
    const tp = input.targetPrice;
    if (tp !== null && (typeof tp !== "number" || tp < 0)) {
      throw new Error("targetPrice inválido");
    }
    return { favoriteId: input.favoriteId, targetPrice: tp };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorite_items")
      .update({ target_price: data.targetPrice })
      .eq("id", data.favoriteId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setFavoriteItemStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { favoriteId: string; establishmentId: string | null }) => {
    if (!input?.favoriteId) throw new Error("favoriteId obrigatório");
    return {
      favoriteId: input.favoriteId,
      establishmentId: input.establishmentId ?? null,
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorite_items")
      .update({ preferred_establishment_id: data.establishmentId })
      .eq("id", data.favoriteId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addFavoriteToList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: { catalogId: string; listId: string; quantity?: number }) => {
      if (!input?.catalogId) throw new Error("catalogId obrigatório");
      if (!input?.listId) throw new Error("listId obrigatório");
      const q = Number(input.quantity ?? 1);
      return {
        catalogId: input.catalogId,
        listId: input.listId,
        quantity: Number.isFinite(q) && q > 0 ? q : 1,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ownership check
    const { data: list } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("id", data.listId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!list) throw new Error("Lista não encontrada");
    // Idempotent: upsert-ish. If exists, bump quantity.
    const { data: existing } = await supabase
      .from("shopping_list_items")
      .select("id, quantity")
      .eq("list_id", data.listId)
      .eq("catalog_id", data.catalogId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("shopping_list_items")
        .update({ quantity: Number(existing.quantity) + data.quantity })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, updated: true };
    }
    const { error } = await supabase.from("shopping_list_items").insert({
      list_id: data.listId,
      catalog_id: data.catalogId,
      quantity: data.quantity,
    });
    if (error) throw new Error(error.message);
    return { ok: true, updated: false };
  });

/* =========================== MARKETS =========================== */

export const listFavoriteMarkets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FavoriteMarket[]> => {
    const { data, error } = await context.supabase
      .from("favorite_markets")
      .select("id, market_name, created_at, sort_order")
      .eq("user_id", context.userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      marketName: r.market_name,
      createdAt: r.created_at,
      sortOrder: r.sort_order ?? 0,
    }));
  });

export const toggleFavoriteMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { marketName: string }) => {
    const name = (input?.marketName ?? "").trim();
    if (!name) throw new Error("marketName obrigatório");
    return { marketName: name.slice(0, 120) };
  })
  .handler(async ({ data, context }): Promise<{ favorited: boolean }> => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("favorite_markets")
      .select("id")
      .eq("user_id", userId)
      .eq("market_name", data.marketName)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("favorite_markets")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { favorited: false };
    }
    const { data: maxRow } = await supabase
      .from("favorite_markets")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("favorite_markets").insert({
      user_id: userId,
      market_name: data.marketName,
      sort_order: nextOrder,
    });
    if (error) throw new Error(error.message);
    return { favorited: true };
  });

export const removeFavoriteMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { favoriteId: string }) => {
    if (!input?.favoriteId) throw new Error("favoriteId obrigatório");
    return { favoriteId: input.favoriteId };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorite_markets")
      .delete()
      .eq("id", data.favoriteId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderFavoriteMarkets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { ids: string[] }) => {
    if (!Array.isArray(input?.ids)) throw new Error("ids obrigatório");
    return { ids: input.ids.slice(0, 200) };
  })
  .handler(async ({ data, context }) => {
    const updates = data.ids.map((id, idx) =>
      context.supabase
        .from("favorite_markets")
        .update({ sort_order: idx })
        .eq("id", id)
        .eq("user_id", context.userId),
    );
    await Promise.all(updates);
    return { ok: true };
  });

/* ========================= APP SUMMARY ========================= */

export const getAppSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppSummary> => {
    const { supabase, userId } = context;

    const [listsRes, favItemsRes, favMktRes, prefsRes] = await Promise.all([
      supabase
        .from("shopping_lists")
        .select("id, name, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("favorite_items")
        .select("id, catalog_id, created_at, sort_order, last_price, last_market, target_price, preferred_establishment_id")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("favorite_markets")
        .select("id, market_name, sort_order, last_total")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("notification_prefs")
        .select("in_app, email, push, price_drop_pct, target_price_only, market_savings_min")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const lists = listsRes.data ?? [];
    const favItemRows = favItemsRes.data ?? [];
    const favMarketRows = favMktRes.data ?? [];
    const favMarketByName = new Map(favMarketRows.map((r) => [r.market_name, r]));
    const prefs = prefsRes.data ?? {
      in_app: true,
      email: false,
      push: false,
      price_drop_pct: 5,
      target_price_only: false,
      market_savings_min: 3,
    };

    // Items per list
    const listIds = lists.map((l) => l.id);
    const itemsByList = new Map<string, Array<{ id: string; catalog_id: string; quantity: number }>>();
    // Skip ad-hoc items (no catalog link) — favorites/best-cart calculations only use catalog products

    let itemsCount = 0;
    if (listIds.length > 0) {
      const { data: items } = await supabase
        .from("shopping_list_items")
        .select("id, list_id, catalog_id, quantity")
        .in("list_id", listIds);
      for (const it of items ?? []) {
        if (!it.catalog_id) continue;
        let arr = itemsByList.get(it.list_id);
        if (!arr) {
          arr = [];
          itemsByList.set(it.list_id, arr);
        }
        arr.push({ id: it.id, catalog_id: it.catalog_id, quantity: Number(it.quantity) });
        itemsCount += 1;
      }
    }

    // Catalog for all involved products (favorites + list items)
    const allCatIds = new Set<string>();
    for (const f of favItemRows) allCatIds.add(f.catalog_id);
    for (const [, arr] of itemsByList) for (const it of arr) allCatIds.add(it.catalog_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type CatRow = {
      id: string;
      display_name: string;
      normalized_name: string;
      brand: string | null;
      image_url: string | null;
      barcode: string | null;
    };
    const catMap = new Map<string, CatRow>();
    if (allCatIds.size > 0) {
      const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
        select: (s: string) => {
          in: (
            c: string,
            v: string[],
          ) => Promise<{ data: CatRow[] | null; error: { message: string } | null }>;
        };
      };
      const { data: cats } = await table
        .select("id, display_name, normalized_name, brand, image_url, barcode")
        .in("id", Array.from(allCatIds));
      const signedCats = await Promise.all(
        (cats ?? []).map(async (c) => ({
          ...c,
          image_url: await signStorageImageUrl(c.image_url, supabaseAdmin),
        })),
      );
      for (const c of signedCats) catMap.set(c.id, c);
    }

    // Recent scans
    type ScanRow = {
      barcode: string | null;
      product_name: string | null;
      price_captured: number | null;
      market_name: string | null;
      establishment_id: string | null;
    };
    let scanNorm: Array<{ row: ScanRow; norm: string }> = [];
    if (allCatIds.size > 0) {
      const { data: scans } = await supabaseAdmin
        .from("scans")
        .select("barcode, product_name, price_captured, market_name, establishment_id")
        .not("price_captured", "is", null)
        .not("market_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(3000);
      scanNorm = ((scans ?? []) as ScanRow[])
        .filter((s) => s.price_captured !== null && Number(s.price_captured) > 0)
        .map((row) => ({ row, norm: normalize(row.product_name ?? "") }));
    }

    // Preload establishment names referenced by favorites (for alerts scoped to a chosen store)
    const preferredEstabIds = Array.from(
      new Set(
        favItemRows
          .map((r) => r.preferred_establishment_id)
          .filter((v): v is string => !!v),
      ),
    );
    const preferredEstabNames = new Map<string, string>();
    if (preferredEstabIds.length > 0) {
      const estabTable = supabaseAdmin.from("establishments" as never) as unknown as {
        select: (s: string) => {
          in: (
            c: string,
            v: string[],
          ) => Promise<{
            data: Array<{ id: string; name: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
      const { data: estabs } = await estabTable.select("id, name").in("id", preferredEstabIds);
      for (const e of estabs ?? []) preferredEstabNames.set(e.id, e.name);
    }

    // Compute best-per-market for any catalog id (memoized)
    const bestPerMarketCache = new Map<string, Map<string, number>>();
    const bestPerMarket = (catalogId: string): Map<string, number> => {
      const cached = bestPerMarketCache.get(catalogId);
      if (cached) return cached;
      const cat = catMap.get(catalogId);
      const byMarket = new Map<string, number>();
      if (cat) {
        const targetBarcode = cat.barcode?.trim() || null;
        const targetNorm = cat.normalized_name || normalize(cat.display_name);
        for (const { row, norm } of scanNorm) {
          const matches =
            (targetBarcode && row.barcode?.trim() === targetBarcode) ||
            (norm && targetNorm && (norm.includes(targetNorm) || targetNorm.includes(norm)));
          if (!matches) continue;
          const market = (row.market_name ?? "").trim();
          if (!market) continue;
          const price = Number(row.price_captured);
          const cur = byMarket.get(market);
          if (cur === undefined || price < cur) byMarket.set(market, price);
        }
      }
      bestPerMarketCache.set(catalogId, byMarket);
      return byMarket;
    };

    // Lowest price of a catalog product at a specific establishment (by id)
    const priceAtEstablishment = (
      catalogId: string,
      establishmentId: string,
    ): { price: number; marketName: string } | null => {
      const cat = catMap.get(catalogId);
      if (!cat) return null;
      const targetBarcode = cat.barcode?.trim() || null;
      const targetNorm = cat.normalized_name || normalize(cat.display_name);
      let best: { price: number; marketName: string } | null = null;
      for (const { row, norm } of scanNorm) {
        if (row.establishment_id !== establishmentId) continue;
        const matches =
          (targetBarcode && row.barcode?.trim() === targetBarcode) ||
          (norm && targetNorm && (norm.includes(targetNorm) || targetNorm.includes(norm)));
        if (!matches) continue;
        const price = Number(row.price_captured);
        const market = (row.market_name ?? "").trim() || (preferredEstabNames.get(establishmentId) ?? "");
        if (!best || price < best.price) best = { price, marketName: market };
      }
      return best;
    };

    const favCatalogSet = new Set(favItemRows.map((r) => r.catalog_id));

    // ---------- Per-list savings ----------
    const listsView: AppSummary["lists"] = [];
    for (const l of lists) {
      const items = itemsByList.get(l.id) ?? [];
      const marketTotals = new Map<string, { total: number; covered: number }>();
      const favInList: Array<{
        catalogId: string;
        displayName: string;
        bestMarket: string;
        bestPrice: number;
      }> = [];
      for (const it of items) {
        const perMkt = bestPerMarket(it.catalog_id);
        if (perMkt.size === 0) continue;
        let bestPrice = Infinity;
        let bestMkt = "";
        for (const [m, p] of perMkt) {
          const totalized = p * it.quantity;
          const cur = marketTotals.get(m) ?? { total: 0, covered: 0 };
          cur.total += totalized;
          cur.covered += 1;
          marketTotals.set(m, cur);
          if (p < bestPrice) {
            bestPrice = p;
            bestMkt = m;
          }
        }
        if (favCatalogSet.has(it.catalog_id) && bestMkt) {
          const cat = catMap.get(it.catalog_id);
          favInList.push({
            catalogId: it.catalog_id,
            displayName: cat?.display_name ?? "",
            bestMarket: bestMkt,
            bestPrice: Number(bestPrice.toFixed(2)),
          });
        }
      }
      let recommended: { market: string; total: number } | null = null;
      let worst: number | null = null;
      const ranked = Array.from(marketTotals.entries()).sort((a, b) => {
        if (b[1].covered !== a[1].covered) return b[1].covered - a[1].covered;
        return a[1].total - b[1].total;
      });
      if (ranked.length > 0) {
        recommended = {
          market: ranked[0][0],
          total: Number(ranked[0][1].total.toFixed(2)),
        };
        const same = ranked.filter((r) => r[1].covered === ranked[0][1].covered);
        worst = Math.max(...same.map((r) => r[1].total));
      }
      const savings =
        recommended && worst !== null ? Number((worst - recommended.total).toFixed(2)) : null;
      listsView.push({
        id: l.id,
        name: l.name,
        itemCount: items.length,
        updatedAt: l.updated_at,
        favoriteItems: favInList.slice(0, 5),
        recommendedMarket: recommended?.market ?? null,
        recommendedTotal: recommended?.total ?? null,
        potentialSavings: savings,
      });
    }

    // ---------- Favorites summary + alert detection ----------
    const favoriteItemsView: AppSummary["favoriteItems"] = [];
    const marketTotalsAllFavs = new Map<
      string,
      { itemsCovered: number; total: number }
    >();

    type PendingAlert = {
      user_id: string;
      kind: "item_price_drop" | "item_target_hit" | "market_price_drop";
      catalog_id: string | null;
      market_name: string | null;
      display_name: string | null;
      prev_price: number | null;
      new_price: number;
      diff_pct: number | null;
    };
    const pendingAlerts: PendingAlert[] = [];
    const itemUpdates: Array<{ id: string; last_price: number; last_market: string }> = [];

    for (const fav of favItemRows) {
      const cat = catMap.get(fav.catalog_id);
      const perMkt = bestPerMarket(fav.catalog_id);

      // per-favorite market aggregation
      for (const [market, price] of perMkt) {
        const cur = marketTotalsAllFavs.get(market) ?? { itemsCovered: 0, total: 0 };
        cur.itemsCovered += 1;
        cur.total += price;
        marketTotalsAllFavs.set(market, cur);
      }

      let best: { marketName: string; price: number } | null = null;
      if (fav.preferred_establishment_id) {
        // Alert scoped to the establishment chosen by the user
        const scoped = priceAtEstablishment(fav.catalog_id, fav.preferred_establishment_id);
        if (scoped) {
          best = { marketName: scoped.marketName, price: scoped.price };
        } else {
          // No scans yet at that store → don't produce alerts for this favorite
          best = null;
        }
      } else {
        for (const [market, price] of perMkt) {
          if (!best || price < best.price) best = { marketName: market, price };
        }
      }

      // Alert detection
      if (best) {
        const prev = fav.last_price !== null ? Number(fav.last_price) : null;
        const target = fav.target_price !== null ? Number(fav.target_price) : null;
        const dropPctThreshold = Number(prefs.price_drop_pct);
        if (prev !== null && prev > 0) {
          const diffPct = ((best.price - prev) / prev) * 100;
          if (diffPct <= -dropPctThreshold && !prefs.target_price_only) {
            pendingAlerts.push({
              user_id: userId,
              kind: "item_price_drop",
              catalog_id: fav.catalog_id,
              market_name: best.marketName,
              display_name: cat?.display_name ?? null,
              prev_price: prev,
              new_price: best.price,
              diff_pct: Number(diffPct.toFixed(2)),
            });
          }
        }
        if (target !== null && best.price <= target) {
          const alreadyPrev = prev !== null && prev <= target;
          if (!alreadyPrev) {
            pendingAlerts.push({
              user_id: userId,
              kind: "item_target_hit",
              catalog_id: fav.catalog_id,
              market_name: best.marketName,
              display_name: cat?.display_name ?? null,
              prev_price: prev,
              new_price: best.price,
              diff_pct: null,
            });
          }
        }
        if (prev === null || Math.abs(prev - best.price) > 0.001) {
          itemUpdates.push({
            id: fav.id,
            last_price: best.price,
            last_market: best.marketName,
          });
        }
      }

      favoriteItemsView.push({
        favoriteId: fav.id,
        catalogId: fav.catalog_id,
        displayName: cat?.display_name ?? "(produto removido)",
        brand: cat?.brand ?? null,
        imageUrl: cat?.image_url ?? null,
        targetPrice: fav.target_price !== null ? Number(fav.target_price) : null,
        lastPrice: fav.last_price !== null ? Number(fav.last_price) : null,
        best: best
          ? { marketName: best.marketName, price: Number(best.price.toFixed(2)) }
          : null,
      });
    }

    // Rank markets across all favorites; keep favorites first, in user order
    const marketsSummary = Array.from(marketTotalsAllFavs.entries()).map(
      ([marketName, v]) => ({
        marketName,
        itemsCovered: v.itemsCovered,
        total: Number(v.total.toFixed(2)),
      }),
    );

    const favoriteMarketsView: AppSummary["favoriteMarkets"] = [];
    for (const fm of favMarketRows) {
      const found = marketsSummary.find((m) => m.marketName === fm.market_name);
      const total = found?.total ?? 0;
      const itemsCovered = found?.itemsCovered ?? 0;
      const prev = fm.last_total !== null ? Number(fm.last_total) : null;
      // Market drop alert
      if (
        prev !== null &&
        total > 0 &&
        prev > total &&
        prev - total >= Number(prefs.market_savings_min)
      ) {
        pendingAlerts.push({
          user_id: userId,
          kind: "market_price_drop",
          catalog_id: null,
          market_name: fm.market_name,
          display_name: fm.market_name,
          prev_price: prev,
          new_price: total,
          diff_pct: prev > 0 ? Number((((total - prev) / prev) * 100).toFixed(2)) : null,
        });
      }
      favoriteMarketsView.push({
        favoriteId: fm.id,
        marketName: fm.market_name,
        itemsCovered,
        total,
        lastTotal: prev,
      });
    }

    // Persist snapshots (fire and continue on error)
    if (itemUpdates.length > 0) {
      await Promise.all(
        itemUpdates.map((u) =>
          supabase
            .from("favorite_items")
            .update({
              last_price: u.last_price,
              last_market: u.last_market,
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", u.id)
            .eq("user_id", userId),
        ),
      );
    }
    const marketSnapshotUpdates = favoriteMarketsView.filter((m) => m.total > 0);
    if (marketSnapshotUpdates.length > 0) {
      await Promise.all(
        marketSnapshotUpdates.map((m) =>
          supabase
            .from("favorite_markets")
            .update({
              last_total: m.total,
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", m.favoriteId)
            .eq("user_id", userId),
        ),
      );
    }
    if (pendingAlerts.length > 0 && prefs.in_app) {
      // Deduplicate against alerts created in the last hour
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("price_alerts")
        .select("kind, catalog_id, market_name, new_price")
        .eq("user_id", userId)
        .gte("created_at", since);
      const key = (a: {
        kind: string;
        catalog_id: string | null;
        market_name: string | null;
        new_price: number | null;
      }) => `${a.kind}|${a.catalog_id ?? ""}|${a.market_name ?? ""}|${a.new_price ?? ""}`;
      const seen = new Set((recent ?? []).map((r) => key({ ...r, new_price: Number(r.new_price) })));
      const toInsert = pendingAlerts.filter((a) => !seen.has(key(a)));
      if (toInsert.length > 0) {
        await supabase.from("price_alerts").insert(toInsert);
      }
    }

    // Best cart across all favorites (for headline stat)
    const bestCart = marketsSummary
      .slice()
      .sort((a, b) => {
        if (b.itemsCovered !== a.itemsCovered) return b.itemsCovered - a.itemsCovered;
        return a.total - b.total;
      })[0];

    return {
      lists: listsView,
      favoriteItems: favoriteItemsView,
      favoriteMarkets: favoriteMarketsView,
      totals: {
        listsCount: lists.length,
        itemsCount,
        favoritesCount: favItemRows.length,
        estimatedCartTotal: bestCart ? bestCart.total : null,
        estimatedCartMarket: bestCart ? bestCart.marketName : null,
      },
    };
  });
