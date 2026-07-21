import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signStorageImageUrl } from "@/lib/product-image-utils";

/* ============================= TIPOS ============================= */

export type CatalogSuggestion = {
  id: string;
  displayName: string;
  brand: string | null;
  defaultUnit: string | null;
  barcode: string | null;
  imageUrl: string | null;
};

export type ShoppingListSummary = {
  id: string;
  name: string;
  itemCount: number;
  updatedAt: string;
};

export type ShoppingListItem = {
  id: string;
  catalogId: string | null;
  quantity: number;
  checked: boolean;
  displayName: string;
  brand: string | null;
  defaultUnit: string | null;
  barcode: string | null;
  imageUrl: string | null;
  category: string | null;
  unit: string | null;
  notes: string | null;
  purchasedAt: string | null;
  purchasedPrice: number | null;
};

export type ShoppingListDetail = {
  id: string;
  name: string;
  items: ShoppingListItem[];
};

export type ItemBestPrice = {
  itemId: string;
  catalogId: string;
  displayName: string;
  quantity: number;
  best: { marketName: string; price: number } | null;
  perMarket: Array<{ marketName: string; price: number }>;
};

export type CartMarket = {
  marketName: string;
  itemsCovered: number;
  itemsTotal: number;
  total: number;
};

export type SplitRouteAssignment = {
  marketName: string;
  itemsCovered: number;
  subtotal: number;
  items: Array<{
    itemId: string;
    catalogId: string;
    displayName: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export type SplitRoute = {
  assignments: SplitRouteAssignment[];
  total: number;
  itemsCovered: number;
  itemsTotal: number;
  singleMarketTotal: number | null; // total do melhor mercado sozinho (comparação)
  singleMarketName: string | null;
  savings: number; // singleMarketTotal - total (>= 0 quando faz sentido dividir)
  savingsPct: number; // % de economia vs melhor mercado único
};

export type BestPricesResult = {
  items: ItemBestPrice[];
  bestCart: CartMarket | null;
  markets: CartMarket[];
  splitRoute: SplitRoute | null;
};


/* ============================ HELPERS ============================ */

const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

/* ========================= AUTOCOMPLETE ========================== */

export const searchCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => {
    const q = (input?.query ?? "").trim();
    if (q.length < 2) throw new Error("Digite ao menos 2 caracteres");
    return { query: q.slice(0, 80) };
  })
  .handler(async ({ data }): Promise<CatalogSuggestion[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.query.replace(/[%_,]/g, " ");
    const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        ilike: (
          col: string,
          val: string,
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            limit: (
              n: number,
            ) => Promise<{
              data: Array<{
                id: string;
                display_name: string;
                brand: string | null;
                default_unit: string | null;
                barcode: string | null;
                image_url: string | null;
              }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
    const { data: rows, error } = await table
      .select("id, display_name, brand, default_unit, barcode, image_url")
      .ilike("display_name", `%${safe}%`)
      .order("display_name", { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);
    return Promise.all(
      (rows ?? []).map(async (r) => ({
        id: r.id,
        displayName: r.display_name,
        brand: r.brand,
        defaultUnit: r.default_unit,
        barcode: r.barcode,
        imageUrl: await signStorageImageUrl(r.image_url, supabaseAdmin),
      })),
    );
  });

/* ============================ LISTAS ============================= */

export const listMyShoppingLists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShoppingListSummary[]> => {
    const { supabase, userId } = context;
    const { data: lists, error } = await supabase
      .from("shopping_lists")
      .select("id, name, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (lists ?? []).map((l) => l.id);
    let countMap = new Map<string, number>();
    if (ids.length) {
      const { data: items } = await supabase
        .from("shopping_list_items")
        .select("list_id")
        .in("list_id", ids);
      for (const it of items ?? []) {
        countMap.set(it.list_id, (countMap.get(it.list_id) ?? 0) + 1);
      }
    }
    return (lists ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      itemCount: countMap.get(l.id) ?? 0,
      updatedAt: l.updated_at,
    }));
  });

export const createShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => {
    const name = (input?.name ?? "").trim().slice(0, 80);
    if (!name) throw new Error("Informe um nome");
    return { name };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("shopping_lists")
      .insert({ user_id: userId, name: data.name })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const renameShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    const name = (input.name ?? "").trim().slice(0, 80);
    if (!name) throw new Error("Informe um nome");
    return { id: input.id, name };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("shopping_lists")
      .update({ name: data.name })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return { id: input.id };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("shopping_lists")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return { id: input.id };
  })
  .handler(async ({ data, context }): Promise<ShoppingListDetail | null> => {
    const { supabase, userId } = context;
    const { data: list, error } = await supabase
      .from("shopping_lists")
      .select("id, name, user_id")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!list) return null;

    const { data: items, error: e2 } = await supabase
      .from("shopping_list_items")
      .select("id, catalog_id, quantity, checked, created_at, display_name, category, unit, notes, purchased_at, purchased_price")
      .eq("list_id", data.id)
      .order("created_at", { ascending: true });
    if (e2) throw new Error(e2.message);

    const catIds = Array.from(new Set((items ?? []).map((i) => i.catalog_id).filter((x): x is string => !!x)));
    type CatRow = {
      id: string;
      display_name: string;
      brand: string | null;
      default_unit: string | null;
      barcode: string | null;
      image_url: string | null;
    };
    let catMap = new Map<string, CatRow>();
    if (catIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const table = supabaseAdmin.from("product_catalog" as never) as unknown as {
        select: (s: string) => {
          in: (
            c: string,
            v: string[],
          ) => Promise<{ data: CatRow[] | null; error: { message: string } | null }>;
        };
      };
      const { data: cats } = await table
        .select("id, display_name, brand, default_unit, barcode, image_url")
        .in("id", catIds);
      const signedCats = await Promise.all(
        (cats ?? []).map(async (c) => ({
          ...c,
          image_url: await signStorageImageUrl(c.image_url, supabaseAdmin),
        })),
      );
      for (const c of signedCats) catMap.set(c.id, c);
    }

    return {
      id: list.id,
      name: list.name,
      items: (items ?? []).map((it): ShoppingListItem => {
        const c = it.catalog_id ? catMap.get(it.catalog_id) : undefined;
        const row = it as typeof it & {
          display_name?: string | null;
          category?: string | null;
          unit?: string | null;
          notes?: string | null;
          purchased_at?: string | null;
          purchased_price?: number | null;
        };
        return {
          id: it.id,
          catalogId: it.catalog_id,
          quantity: Number(it.quantity),
          checked: !!it.checked,
          displayName: c?.display_name ?? row.display_name ?? "(item removido)",
          brand: c?.brand ?? null,
          defaultUnit: c?.default_unit ?? null,
          barcode: c?.barcode ?? null,
          imageUrl: c?.image_url ?? null,
          category: row.category ?? null,
          unit: row.unit ?? null,
          notes: row.notes ?? null,
          purchasedAt: row.purchased_at ?? null,
          purchasedPrice: row.purchased_price != null ? Number(row.purchased_price) : null,
        };
      }),
    };
  });

export const addListItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listId: string; catalogId: string; quantity?: number }) => {
    if (!input?.listId || !input?.catalogId) throw new Error("dados incompletos");
    const q = Number(input.quantity ?? 1);
    return {
      listId: input.listId,
      catalogId: input.catalogId,
      quantity: Number.isFinite(q) && q > 0 ? q : 1,
    };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    // Confirm ownership of list
    const { data: list } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("id", data.listId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!list) throw new Error("Lista não encontrada");

    // If item exists, sum quantity
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
      return { id: existing.id };
    }
    const { data: row, error } = await supabase
      .from("shopping_list_items")
      .insert({
        list_id: data.listId,
        catalog_id: data.catalogId,
        quantity: data.quantity,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/* ======================= AD-HOC ITEMS ============================= */

export const addAdhocListItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    listId: string;
    displayName: string;
    quantity?: number;
    category?: string | null;
    unit?: string | null;
    notes?: string | null;
  }) => {
    if (!input?.listId) throw new Error("listId obrigatório");
    const name = (input?.displayName ?? "").trim();
    if (!name) throw new Error("Informe o nome do item");
    if (name.length > 200) throw new Error("Nome muito longo");
    const q = Number(input.quantity ?? 1);
    return {
      listId: input.listId,
      displayName: name,
      quantity: Number.isFinite(q) && q > 0 ? q : 1,
      category: input.category?.trim() || null,
      unit: input.unit?.trim() || null,
      notes: input.notes?.trim() || null,
    };
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    const { data: list } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("id", data.listId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!list) throw new Error("Lista não encontrada");
    const { data: row, error } = await supabase
      .from("shopping_list_items")
      .insert({
        list_id: data.listId,
        catalog_id: null,
        quantity: data.quantity,
        display_name: data.displayName,
        category: data.category,
        unit: data.unit,
        notes: data.notes,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const markItemPurchased = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; purchased: boolean; price?: number | null }) => {
    if (!input?.id) throw new Error("id obrigatório");
    let price: number | null = null;
    if (input.price !== undefined && input.price !== null) {
      const p = Number(input.price);
      if (!Number.isFinite(p) || p < 0) throw new Error("preço inválido");
      price = p;
    }
    return { id: input.id, purchased: !!input.purchased, price };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase } = context;
    const payload = data.purchased
      ? { checked: true, purchased_at: new Date().toISOString(), purchased_price: data.price }
      : { checked: false, purchased_at: null, purchased_price: null };
    const { error } = await supabase
      .from("shopping_list_items")
      .update(payload as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const updateListItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string;
    quantity?: number;
    checked?: boolean;
    displayName?: string;
    category?: string | null;
    unit?: string | null;
    notes?: string | null;
    purchasedPrice?: number | null;
  }) => {
    if (!input?.id) throw new Error("id obrigatório");
    const payload: {
      quantity?: number;
      checked?: boolean;
      display_name?: string;
      category?: string | null;
      unit?: string | null;
      notes?: string | null;
      purchased_price?: number | null;
    } = {};
    if (input.quantity !== undefined) {
      const q = Number(input.quantity);
      if (!Number.isFinite(q) || q <= 0) throw new Error("quantidade inválida");
      payload.quantity = q;
    }
    if (input.checked !== undefined) payload.checked = !!input.checked;
    if (input.displayName !== undefined) {
      const n = input.displayName.trim();
      if (!n) throw new Error("nome obrigatório");
      if (n.length > 120) throw new Error("nome muito longo");
      payload.display_name = n;
    }
    if (input.category !== undefined) payload.category = input.category?.trim() || null;
    if (input.unit !== undefined) payload.unit = input.unit?.trim() || null;
    if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
    if (input.purchasedPrice !== undefined) {
      if (input.purchasedPrice === null) {
        payload.purchased_price = null;
      } else {
        const p = Number(input.purchasedPrice);
        if (!Number.isFinite(p) || p < 0) throw new Error("preço inválido");
        payload.purchased_price = p;
      }
    }
    return { id: input.id, payload };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase } = context;
    const { error } = await supabase
      .from("shopping_list_items")
      .update(data.payload)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeListItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return { id: input.id };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase } = context;
    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ======================= BEST PRICES ============================= */

export const computeBestPrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listId: string }) => {
    if (!input?.listId) throw new Error("listId obrigatório");
    return { listId: input.listId };
  })
  .handler(async ({ data, context }): Promise<BestPricesResult> => {
    const { supabase, userId } = context;
    // Load list + items
    const { data: list } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("id", data.listId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!list) throw new Error("Lista não encontrada");

    const { data: itemsRaw } = await supabase
      .from("shopping_list_items")
      .select("id, catalog_id, quantity")
      .eq("list_id", data.listId);
    // Best-price/route logic only makes sense for catalog-linked items
    const items = (itemsRaw ?? []).filter((i): i is typeof i & { catalog_id: string } => !!i.catalog_id);
    if (items.length === 0) {
      return { items: [], bestCart: null, markets: [], splitRoute: null };
    }


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type CatRow = {
      id: string;
      display_name: string;
      normalized_name: string;
      barcode: string | null;
    };
    const catIds = items.map((i) => i.catalog_id);
    const catTable = supabaseAdmin.from("product_catalog" as never) as unknown as {
      select: (s: string) => {
        in: (
          c: string,
          v: string[],
        ) => Promise<{ data: CatRow[] | null; error: { message: string } | null }>;
      };
    };
    const { data: cats } = await catTable
      .select("id, display_name, normalized_name, barcode")
      .in("id", catIds);
    const catMap = new Map<string, CatRow>();
    for (const c of cats ?? []) catMap.set(c.id, c);

    // Fetch recent scans (limit for perf)
    type ScanRow = {
      barcode: string | null;
      product_name: string | null;
      price_captured: number | null;
      market_name: string | null;
      created_at: string;
    };
    const { data: scans } = await supabaseAdmin
      .from("scans")
      .select("barcode, product_name, price_captured, market_name, created_at")
      .not("price_captured", "is", null)
      .not("market_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(3000);

    const scanList = ((scans ?? []) as ScanRow[]).filter(
      (s) => s.price_captured !== null && Number(s.price_captured) > 0,
    );

    // Precompute normalized product_name for scans
    const scanNorm = scanList.map((s) => ({
      row: s,
      norm: normalize(s.product_name ?? ""),
    }));

    const itemsResult: ItemBestPrice[] = [];
    // Map: market -> item -> best price
    const marketItemBest = new Map<string, Map<string, number>>();

    for (const it of items) {
      const cat = catMap.get(it.catalog_id);
      if (!cat) {
        itemsResult.push({
          itemId: it.id,
          catalogId: it.catalog_id,
          displayName: "(produto removido)",
          quantity: Number(it.quantity),
          best: null,
          perMarket: [],
        });
        continue;
      }
      const targetBarcode = cat.barcode?.trim() || null;
      const targetNorm = cat.normalized_name || normalize(cat.display_name);

      const matches = scanNorm.filter(({ row, norm }) => {
        if (targetBarcode && row.barcode && row.barcode.trim() === targetBarcode) return true;
        if (!norm) return false;
        return norm.includes(targetNorm) || targetNorm.includes(norm);
      });

      const byMarket = new Map<string, number>();
      for (const { row } of matches) {
        const market = (row.market_name ?? "").trim();
        if (!market) continue;
        const price = Number(row.price_captured);
        const cur = byMarket.get(market);
        if (cur === undefined || price < cur) byMarket.set(market, price);
      }

      const perMarket = Array.from(byMarket.entries())
        .map(([marketName, price]) => ({
          marketName,
          price: Number(price.toFixed(2)),
        }))
        .sort((a, b) => a.price - b.price);

      const best = perMarket[0] ?? null;
      itemsResult.push({
        itemId: it.id,
        catalogId: it.catalog_id,
        displayName: cat.display_name,
        quantity: Number(it.quantity),
        best,
        perMarket,
      });

      for (const { marketName, price } of perMarket) {
        let m = marketItemBest.get(marketName);
        if (!m) {
          m = new Map();
          marketItemBest.set(marketName, m);
        }
        m.set(it.id, price);
      }
    }

    // Compute cart total per market (only items covered)
    const totalItems = items.length;
    const markets: CartMarket[] = [];
    for (const [marketName, perItem] of marketItemBest) {
      let total = 0;
      let covered = 0;
      for (const it of items) {
        const price = perItem.get(it.id);
        if (price !== undefined) {
          total += price * Number(it.quantity);
          covered += 1;
        }
      }
      markets.push({
        marketName,
        itemsCovered: covered,
        itemsTotal: totalItems,
        total: Number(total.toFixed(2)),
      });
    }

    // Best cart: prefer full coverage; else max coverage then min total
    markets.sort((a, b) => {
      if (b.itemsCovered !== a.itemsCovered) return b.itemsCovered - a.itemsCovered;
      return a.total - b.total;
    });

    // ============ Split route (multi-market optimization) ============
    // Greedy: para cada item, escolhe o mercado com menor preço unitário.
    // Agrupa por mercado, compara total vs melhor mercado sozinho.
    const bestCart = markets[0] ?? null;

    const assignments = new Map<string, SplitRouteAssignment>();
    let splitTotal = 0;
    let splitCovered = 0;
    for (const it of itemsResult) {
      if (!it.best) continue;
      const { marketName, price } = it.best;
      splitCovered += 1;
      const subtotal = price * it.quantity;
      splitTotal += subtotal;
      const cur = assignments.get(marketName) ?? {
        marketName,
        itemsCovered: 0,
        subtotal: 0,
        items: [],
      };
      cur.itemsCovered += 1;
      cur.subtotal = Number((cur.subtotal + subtotal).toFixed(2));
      cur.items.push({
        itemId: it.itemId,
        catalogId: it.catalogId,
        displayName: it.displayName,
        quantity: it.quantity,
        unitPrice: price,
      });
      assignments.set(marketName, cur);
    }

    let splitRoute: SplitRoute | null = null;
    if (assignments.size > 0) {
      const singleTotal = bestCart?.total ?? null;
      const singleName = bestCart?.marketName ?? null;
      const total = Number(splitTotal.toFixed(2));
      // Só sugere split se houver >= 2 mercados E economia real vs melhor mercado único
      const savings =
        singleTotal !== null ? Number((singleTotal - total).toFixed(2)) : 0;
      const savingsPct =
        singleTotal && singleTotal > 0
          ? Number((((singleTotal - total) / singleTotal) * 100).toFixed(1))
          : 0;

      splitRoute = {
        assignments: Array.from(assignments.values()).sort(
          (a, b) => b.subtotal - a.subtotal,
        ),
        total,
        itemsCovered: splitCovered,
        itemsTotal: totalItems,
        singleMarketTotal: singleTotal,
        singleMarketName: singleName,
        savings,
        savingsPct,
      };
    }

    return {
      items: itemsResult,
      bestCart,
      markets: markets.slice(0, 8),
      splitRoute,
    };
  });

