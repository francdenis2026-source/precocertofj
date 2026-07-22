import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";

export type CatalogSuggestion = {
  id: string;
  scan_id: string | null;
  product_catalog_id: string | null;
  source_name: string;
  suggested_brand: string | null;
  suggested_type: string | null;
  suggested_package: string | null;
  suggested_normalized_name: string | null;
  confidence: number | null;
  status: "pending" | "approved" | "rejected" | "applied";
  reviewer_notes: string | null;
  reviewed_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const KNOWN_BRANDS = [
  "Downy","Albany","Phebo","Francis","Colgate","Sorriso","Close Up","Cepacol","Listerine","Powerdent",
  "Bianco","Dentrat","Green","Mili","Sublime","Paloma","Klass","Florax","Notável","Social","TOM","Mimmo","Maxim",
  "Baygon","Buzz Off","Vitarella","Itamaraty","Antarctica","Teen Mais","Tacto","Farnese","Kerabrasil",
  "Laborene","Labotrat","Minuano","Politriz","Ypê","Herbíssimo","Tabu","Skala","Avon",
  "Kumbuca","Dona Dina","Bernardo","Nota 10","Barralcool","Doce Dia","Tourinho","Cabeça de Touro","Hellmann's",
  "Raid","Mortein","Detefon","Brisa","Uzzilim","Urca","Tixan Ypê","Dove","Monange","Oreo","Marilan",
  "Lux","Nivea","Farnese","Protex","Johnson's","Neve","Duetto","SBP","Poderoso",
];

const TYPE_RULES: Array<{ patterns: string[]; type: string }> = [
  { patterns: ["amaciante"], type: "Amaciante" },
  { patterns: ["sabonete liquido","sabonete liquid"], type: "Sabonete líquido" },
  { patterns: ["sabonete","sabonetes"], type: "Sabonete em barra" },
  { patterns: ["creme dental","gel dental"], type: "Creme dental" },
  { patterns: ["antisseptico bucal","enxaguante","mouthwash"], type: "Enxaguante bucal" },
  { patterns: ["papel higienico"], type: "Papel higiênico" },
  { patterns: ["papel toalha"], type: "Papel toalha" },
  { patterns: ["detergente"], type: "Detergente" },
  { patterns: ["sabao em barra","sabao barra"], type: "Sabão em barra" },
  { patterns: ["agua sanitaria"], type: "Água sanitária" },
  { patterns: ["desodorante","roll-on","rollon"], type: "Desodorante" },
  { patterns: ["inseticida","mata baratas"], type: "Inseticida" },
  { patterns: ["incenso"], type: "Incenso" },
  { patterns: ["biscoito","cream cracker","wafer"], type: "Biscoito" },
  { patterns: ["cerveja"], type: "Cerveja" },
  { patterns: ["refresco","suco em po"], type: "Suco em pó" },
  { patterns: ["arroz"], type: "Arroz" },
  { patterns: ["feijao"], type: "Feijão" },
  { patterns: ["sal moido","sal refinado","sal "], type: "Sal" },
  { patterns: ["acucar"], type: "Açúcar" },
  { patterns: ["manteiga"], type: "Manteiga" },
  { patterns: ["maionese"], type: "Maionese" },
  { patterns: ["oleo de coco"], type: "Óleo de coco" },
  { patterns: ["limpa aluminio"], type: "Limpa alumínio" },
];

function extractPackage(name: string): string | null {
  const patterns = [
    /(\d{1,4})\s*(ml|l|kg|g|un|rolos|unidades|peças|pecas|latas)/i,
    /(\d+)\s*x\s*(\d+)\s*(ml|g|un|rolos)/i,
  ];
  for (const rx of patterns) {
    const m = name.match(rx);
    if (m) return m[0].toLowerCase().replace(/\s+/g, "");
  }
  return null;
}

function extractBrand(name: string): { brand: string | null; confidence: number } {
  const lower = normalizeName(name);
  for (const b of KNOWN_BRANDS) {
    const bl = normalizeName(b);
    if (lower.includes(bl)) return { brand: b, confidence: 0.95 };
  }
  return { brand: null, confidence: 0.3 };
}

function extractType(name: string): { type: string | null; confidence: number } {
  const lower = normalizeName(name);
  for (const rule of TYPE_RULES) {
    if (rule.patterns.some((p) => lower.includes(p))) {
      return { type: rule.type, confidence: 0.9 };
    }
  }
  return { type: null, confidence: 0.3 };
}

function buildSuggestion(sourceName: string): {
  brand: string | null;
  type: string | null;
  pkg: string | null;
  normalized: string;
  confidence: number;
} {
  const b = extractBrand(sourceName);
  const t = extractType(sourceName);
  const pkg = extractPackage(sourceName);
  const normalized = normalizeName(sourceName);
  const conf = Math.min(b.confidence, t.confidence) * (pkg ? 1 : 0.85);
  return {
    brand: b.brand,
    type: t.type,
    pkg,
    normalized,
    confidence: Number(conf.toFixed(3)),
  };
}

/** Gera sugestões a partir de scans que ainda não têm entrada em `product_catalog`. */
export const generateSuggestionsFromScans = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input?: { limit?: number; market_name?: string }) => ({
    limit: Math.max(1, Math.min(500, input?.limit ?? 200)),
    market_name: input?.market_name || null,
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("scans")
      .select("id, product_name, market_name")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.market_name) query = query.eq("market_name", data.market_name);

    const { data: scans, error } = await query;
    if (error) throw new Error(error.message);

    const uniqNames = new Map<string, { scan_id: string; name: string }>();
    for (const s of scans ?? []) {
      if (!s.product_name) continue;
      const name = s.product_name;
      const key = normalizeName(name);
      if (!uniqNames.has(key)) uniqNames.set(key, { scan_id: s.id, name });
    }

    // Skip names that already have a matching product_catalog by normalized name
    const { data: existing } = await supabaseAdmin
      .from("product_catalog")
      .select("normalized_name");
    const existingSet = new Set((existing ?? []).map((r: any) => (r.normalized_name || "").toLowerCase()));

    // Skip names that already have a pending/approved suggestion (source_name match)
    const { data: existingSug } = await supabaseAdmin
      .from("catalog_suggestions")
      .select("source_name, status")
      .in("status", ["pending", "approved"]);
    const existingSugSet = new Set(
      (existingSug ?? []).map((r: any) => normalizeName(r.source_name)),
    );

    const rowsToInsert: any[] = [];
    let skipped = 0;
    for (const [key, { scan_id, name }] of uniqNames) {
      if (existingSet.has(key)) { skipped++; continue; }
      if (existingSugSet.has(key)) { skipped++; continue; }
      const s = buildSuggestion(name);
      rowsToInsert.push({
        scan_id,
        source_name: name,
        suggested_brand: s.brand,
        suggested_type: s.type,
        suggested_package: s.pkg,
        suggested_normalized_name: s.normalized,
        confidence: s.confidence,
        status: "pending",
      });
    }

    if (rowsToInsert.length === 0) {
      return { created: 0, skipped, total: uniqNames.size };
    }

    const { error: iErr } = await supabaseAdmin.from("catalog_suggestions").insert(rowsToInsert);
    if (iErr) throw new Error(iErr.message);

    return { created: rowsToInsert.length, skipped, total: uniqNames.size };
  });

export const listCatalogSuggestions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((input?: { status?: string }) => ({
    status: input?.status || "pending",
  }))
  .handler(async ({ data }): Promise<CatalogSuggestion[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("catalog_suggestions")
      .select("*")
      .order("confidence", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as CatalogSuggestion[];
  });

export const updateSuggestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: {
    id: string;
    brand?: string | null;
    type?: string | null;
    pkg?: string | null;
    normalized_name?: string | null;
    reviewer_notes?: string | null;
  }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      suggested_brand?: string | null;
      suggested_type?: string | null;
      suggested_package?: string | null;
      suggested_normalized_name?: string | null;
      reviewer_notes?: string | null;
    } = {};
    if (data.brand !== undefined) patch.suggested_brand = data.brand;
    if (data.type !== undefined) patch.suggested_type = data.type;
    if (data.pkg !== undefined) patch.suggested_package = data.pkg;
    if (data.normalized_name !== undefined) patch.suggested_normalized_name = data.normalized_name;
    if (data.reviewer_notes !== undefined) patch.reviewer_notes = data.reviewer_notes;
    const { error } = await supabaseAdmin
      .from("catalog_suggestions")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectSuggestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string; notes?: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("catalog_suggestions")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
        reviewer_notes: data.notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Aprova + aplica no product_catalog em uma única ação. */
export const approveAndApplySuggestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sug, error: sErr } = await supabaseAdmin
      .from("catalog_suggestions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sug) throw new Error("Sugestão não encontrada");

    const normalized = (sug.suggested_normalized_name || normalizeName(sug.source_name)).toLowerCase();
    const display = sug.source_name;

    // upsert product_catalog
    const { data: existing } = await supabaseAdmin
      .from("product_catalog")
      .select("id")
      .eq("normalized_name", normalized)
      .maybeSingle();

    let catalogId: string;
    if (existing) {
      const { error: uErr } = await supabaseAdmin
        .from("product_catalog")
        .update({
          brand: sug.suggested_brand,
          category: sug.suggested_type,
          display_name: display,
        })
        .eq("id", existing.id);
      if (uErr) throw new Error(uErr.message);
      catalogId = existing.id;
    } else {
      const { data: ins, error: iErr } = await supabaseAdmin
        .from("product_catalog")
        .insert({
          normalized_name: normalized,
          display_name: display,
          brand: sug.suggested_brand,
          category: sug.suggested_type,
        })
        .select("id")
        .single();
      if (iErr) throw new Error(iErr.message);
      catalogId = ins.id;
    }

    const { error: upErr } = await supabaseAdmin
      .from("catalog_suggestions")
      .update({
        status: "applied",
        product_catalog_id: catalogId,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
        applied_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, catalog_id: catalogId };
  });

/** Reclassifica um nome de produto usando IA (Lovable AI Gateway). */
async function classifyNameWithAi(name: string): Promise<{
  brand: string | null;
  type: string | null;
  pkg: string | null;
  confidence: number;
}> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "system",
          content:
            "Você é um categorizador de produtos de supermercado brasileiro. Devolva SEMPRE JSON puro com chaves: brand (marca, título capitalizado ou null), type (categoria em português, ex.: 'Arroz', 'Detergente', 'Sabonete em barra', 'Biscoito', 'Amaciante', 'Creme dental', 'Refrigerante', 'Leite em pó', ou null), pkg (embalagem compacta ex.: '500ml', '1kg', '4un', ou null), confidence (0..1). Não invente marca. Se incerto, use null.",
        },
        { role: "user", content: `Nome do produto: "${name}"` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Limite de IA atingido. Tente em 1 min.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`IA falhou [${res.status}]: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: { brand?: unknown; type?: unknown; pkg?: unknown; confidence?: unknown } = {};
  try { parsed = JSON.parse(raw); } catch { /* noop */ }
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null;
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5;
  };
  return {
    brand: str(parsed.brand),
    type: str(parsed.type),
    pkg: str(parsed.pkg),
    confidence: num(parsed.confidence),
  };
}

export const reclassifySuggestionWithAi = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sug, error } = await supabaseAdmin
      .from("catalog_suggestions")
      .select("id, source_name")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sug) throw new Error("Sugestão não encontrada");
    const ai = await classifyNameWithAi(sug.source_name);
    const { error: uErr } = await supabaseAdmin
      .from("catalog_suggestions")
      .update({
        suggested_brand: ai.brand,
        suggested_type: ai.type,
        suggested_package: ai.pkg,
        confidence: ai.confidence,
      })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, ...ai };
  });

export const reclassifyLowConfidenceBatch = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input?: { threshold?: number; limit?: number }) => ({
    threshold: Math.max(0, Math.min(1, input?.threshold ?? 0.7)),
    limit: Math.max(1, Math.min(100, input?.limit ?? 30)),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("catalog_suggestions")
      .select("id, source_name, confidence")
      .eq("status", "pending")
      .lt("confidence", data.threshold)
      .order("confidence", { ascending: true })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    let updated = 0;
    const errors: string[] = [];
    for (const r of rows ?? []) {
      try {
        const ai = await classifyNameWithAi(r.source_name);
        const { error: uErr } = await supabaseAdmin
          .from("catalog_suggestions")
          .update({
            suggested_brand: ai.brand,
            suggested_type: ai.type,
            suggested_package: ai.pkg,
            confidence: ai.confidence,
          })
          .eq("id", r.id);
        if (uErr) errors.push(uErr.message);
        else updated++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    return { updated, scanned: rows?.length ?? 0, errors };
  });

export const approveHighConfidenceBatch = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input?: { threshold?: number; limit?: number }) => ({
    threshold: Math.max(0, Math.min(1, input?.threshold ?? 0.85)),
    limit: Math.max(1, Math.min(200, input?.limit ?? 100)),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("catalog_suggestions")
      .select("*")
      .eq("status", "pending")
      .gte("confidence", data.threshold)
      .not("suggested_type", "is", null)
      .order("confidence", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    let applied = 0;
    const errors: string[] = [];
    for (const sug of rows ?? []) {
      try {
        const normalized = (sug.suggested_normalized_name || normalizeName(sug.source_name)).toLowerCase();
        const { data: existing } = await supabaseAdmin
          .from("product_catalog")
          .select("id")
          .eq("normalized_name", normalized)
          .maybeSingle();
        let catalogId: string;
        if (existing) {
          await supabaseAdmin
            .from("product_catalog")
            .update({
              brand: sug.suggested_brand,
              category: sug.suggested_type,
              display_name: sug.source_name,
            })
            .eq("id", existing.id);
          catalogId = existing.id;
        } else {
          const { data: ins, error: iErr } = await supabaseAdmin
            .from("product_catalog")
            .insert({
              normalized_name: normalized,
              display_name: sug.source_name,
              brand: sug.suggested_brand,
              category: sug.suggested_type,
            })
            .select("id")
            .single();
          if (iErr) throw new Error(iErr.message);
          catalogId = ins.id;
        }
        await supabaseAdmin
          .from("catalog_suggestions")
          .update({
            status: "applied",
            product_catalog_id: catalogId,
            reviewed_at: new Date().toISOString(),
            reviewed_by: context.userId,
            applied_at: new Date().toISOString(),
          })
          .eq("id", sug.id);
        applied++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    return { applied, scanned: rows?.length ?? 0, errors };
  });

export const CATEGORY_PRESETS = [
  "Arroz","Feijão","Açúcar","Sal","Farinha","Óleo","Café","Leite","Leite em pó","Leite condensado",
  "Creme de leite","Manteiga","Margarina","Queijo","Iogurte","Biscoito","Bolacha","Wafer","Pão","Torrada",
  "Macarrão","Miojo","Molho de tomate","Maionese","Mostarda","Ketchup","Vinagre","Azeite","Chá","Achocolatado",
  "Cereal","Aveia","Canjica","Refrigerante","Suco","Suco em pó","Água","Cerveja","Energético",
  "Feijoada enlatada","Sardinha","Atum","Salsicha","Presunto","Mortadela",
  "Detergente","Sabão em pó","Sabão em barra","Amaciante","Água sanitária","Desinfetante","Multiuso","Limpa vidros","Pinho","Esponja","Palha de aço",
  "Sabonete em barra","Sabonete líquido","Shampoo","Condicionador","Creme dental","Enxaguante bucal","Desodorante","Papel higiênico","Papel toalha","Absorvente","Fralda",
  "Inseticida","Repelente","Vela","Fósforo","Isqueiro",
] as const;
