import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

// Types shared with client
export type ExistingMatch = {
  scanId: string;
  productName: string;
  price: number | null;
  brand: string | null;
  quantity: number | null;
  unit: string | null;
  barcode: string | null;
  similarity: number; // 0..1 (1 = exact barcode/signature match)
};

export type Candidate = {
  clientId: string;
  imagePreview: string | null;
  productName: string;
  brand: string | null;
  unit: string | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  category: string | null;
  barcode: string | null;
  price: number | null;
  confidence: "low" | "medium" | "high";
  matchType: "barcode" | "signature" | "fuzzy" | "none";
  existing: ExistingMatch | null;
  divergences: string[]; // ['name', 'brand', 'size']
};

export type Decision = {
  clientId: string;
  action: "new" | "update" | "ignore";
  productName: string;
  brand: string | null;
  unit: string | null;
  quantity: number | null;
  barcode: string | null;
  price: number;
  existingScanId?: string | null;
};

const SYSTEM_PROMPT = `Você é um extrator de produtos para um comparador de preços.
A foto pode conter 1 ou vários produtos (prateleira, sacola, etiqueta, cupom).
Extraia TODOS que estiverem legíveis. Nunca invente — se um campo não estiver claro, use null.

Categorias possíveis: "laticinios", "carnes", "padaria", "biscoitos", "doces", "bebidas",
"bebidas_em_po", "limpeza", "higiene", "mercearia", "congelados", "outros".

Responda apenas JSON:
{
  "products": [
    {
      "productName": string,
      "brand": string|null,
      "sizeValue": number|null,
      "sizeUnit": "g"|"kg"|"ml"|"l"|"un"|null,
      "category": string|null,
      "barcode": string|null,
      "price": number|null
    }
  ],
  "confidence": "low"|"medium"|"high"
}

Regras:
- price em reais como número (12,90 → 12.90).
- barcode apenas quando o EAN/UPC estiver totalmente legível.
- brand: só a marca, sem descritor (ex: "OMO", "Ypê", "Nestlé").
- sizeValue+sizeUnit: só o tamanho unitário (ex: 500g → 500,"g"; 1L → 1,"l").
- Se nada legível, retorne { "products": [], "confidence": "low" }.`;

type VisionProduct = {
  productName: string | null;
  brand: string | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  category: string | null;
  barcode: string | null;
  price: number | null;
};

async function extractProductsFromImage(dataUrl: string): Promise<{
  products: VisionProduct[];
  confidence: "low" | "medium" | "high";
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
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia todos os produtos e preços visíveis." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
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

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: { products?: unknown; confidence?: unknown } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const toNum = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(",", ".").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  };
  const toStr = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
  };
  const normalizeUnit = (u: string | null): string | null => {
    if (!u) return null;
    const s = u.toLowerCase().trim();
    if (s === "litro" || s === "litros") return "l";
    if (s === "grama" || s === "gramas") return "g";
    if (["g", "kg", "ml", "l", "un"].includes(s)) return s;
    return null;
  };

  const products: VisionProduct[] = Array.isArray(parsed.products)
    ? parsed.products
        .filter((p): p is Record<string, unknown> => p !== null && typeof p === "object")
        .map((p) => ({
          productName: toStr(p.productName),
          brand: toStr(p.brand),
          sizeValue: toNum(p.sizeValue),
          sizeUnit: normalizeUnit(toStr(p.sizeUnit)),
          category: toStr(p.category),
          barcode: toStr(p.barcode),
          price: toNum(p.price),
        }))
        .filter((p) => p.productName || p.price)
    : [];

  const confidence =
    parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low";

  return { products, confidence };
}

// ---------- analyzeBatchPhotos ----------
const AnalyzeInputSchema = z.object({
  images: z.array(z.string().min(20)).min(1).max(10),
  establishmentId: z.string().uuid(),
});

export const analyzeBatchPhotos = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => AnalyzeInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<Candidate[]> => {
    const out: Candidate[] = [];
    let imgIdx = 0;
    for (const img of data.images) {
      imgIdx++;
      let extraction: { products: VisionProduct[]; confidence: "low" | "medium" | "high" };
      try {
        extraction = await extractProductsFromImage(img);
      } catch (err) {
        console.error("vision extraction failed:", err);
        continue;
      }

      for (let i = 0; i < extraction.products.length; i++) {
        const p = extraction.products[i];
        if (!p.productName && !p.price) continue;

        const candidate: Candidate = {
          clientId: `img${imgIdx}-${i}-${Date.now()}`,
          imagePreview: img,
          productName: p.productName ?? "",
          brand: p.brand,
          unit: p.sizeUnit,
          sizeValue: p.sizeValue,
          sizeUnit: p.sizeUnit,
          category: p.category,
          barcode: p.barcode,
          price: p.price,
          confidence: extraction.confidence,
          matchType: "none",
          existing: null,
          divergences: [],
        };

        // ---- duplicate detection ----
        // 1) barcode exact
        if (p.barcode) {
          const { data: byBc } = await context.supabase
            .from("scans")
            .select(
              "id, product_name, price_captured, quantity, unit, barcode",
            )
            .eq("establishment_id", data.establishmentId)
            .eq("barcode", p.barcode)
            .eq("status", "salvo")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (byBc) {
            candidate.matchType = "barcode";
            candidate.existing = {
              scanId: byBc.id,
              productName: byBc.product_name ?? "",
              price: byBc.price_captured != null ? Number(byBc.price_captured) : null,
              brand: null,
              quantity: byBc.quantity != null ? Number(byBc.quantity) : null,
              unit: byBc.unit,
              barcode: byBc.barcode,
              similarity: 1,
            };
          }
        }

        // 2) fuzzy via RPC (fallback + signature-ish)
        if (!candidate.existing && p.productName) {
          const nameForMatch = p.brand
            ? `${p.productName} ${p.brand}`.trim()
            : p.productName;
          const { data: matches } = await context.supabase.rpc("find_similar_scans", {
            p_name: nameForMatch,
            p_establishment_id: data.establishmentId,
            p_threshold: 0.55,
          });
          const top = (matches ?? [])[0] as
            | { id: string; product_name: string; price_captured: number | null; similarity: number }
            | undefined;
          if (top) {
            const sim = Number(top.similarity ?? 0);
            candidate.existing = {
              scanId: top.id,
              productName: top.product_name,
              price: top.price_captured != null ? Number(top.price_captured) : null,
              brand: null,
              quantity: null,
              unit: null,
              barcode: null,
              similarity: sim,
            };
            candidate.matchType = sim >= 0.85 ? "signature" : "fuzzy";
          }
        }

        // ---- divergences ----
        if (candidate.existing) {
          const ex = candidate.existing;
          if (
            candidate.productName &&
            ex.productName &&
            candidate.productName.trim().toLowerCase() !==
              ex.productName.trim().toLowerCase()
          ) {
            candidate.divergences.push("name");
          }
          if (candidate.brand && !ex.productName.toLowerCase().includes(candidate.brand.toLowerCase())) {
            candidate.divergences.push("brand");
          }
          if (
            candidate.sizeValue != null &&
            ex.productName &&
            !ex.productName.toLowerCase().includes(String(candidate.sizeValue).toLowerCase())
          ) {
            candidate.divergences.push("size");
          }
          if (candidate.price != null && ex.price != null && Math.abs(candidate.price - ex.price) > 0.005) {
            candidate.divergences.push("price");
          }
        }

        out.push(candidate);
      }
    }
    return out;
  });

// ---------- commitScanBatch ----------
const DecisionSchema = z.object({
  clientId: z.string(),
  action: z.enum(["new", "update", "ignore"]),
  productName: z.string().trim().min(2).max(300),
  brand: z.string().trim().max(80).nullable(),
  unit: z.string().trim().max(10).nullable(),
  quantity: z.number().positive().max(100000).nullable(),
  barcode: z.string().trim().max(60).nullable(),
  price: z.number().positive().max(100000),
  existingScanId: z.string().uuid().nullable().optional(),
});

const CommitInputSchema = z.object({
  establishmentId: z.string().uuid(),
  decisions: z.array(DecisionSchema).min(1).max(200),
});

export const commitScanBatch = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => CommitInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: est } = await context.supabase
      .from("establishments")
      .select("name")
      .eq("id", data.establishmentId)
      .maybeSingle();
    const marketName = est?.name ?? null;

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    const actionable = data.decisions.filter((d) => d.action !== "ignore");

    for (const d of actionable) {
      const composedName = d.brand
        ? `${d.productName} ${d.brand}`.replace(/\s+/g, " ").trim()
        : d.productName;

      // "update" also creates a new scan (for price + history), but first patches
      // the existing scan's product_name/brand so future dedupes match cleanly.
      if (d.action === "update" && d.existingScanId) {
        const { error: upErr } = await context.supabase
          .from("scans")
          .update({
            product_name: composedName,
            quantity: d.quantity,
            unit: d.unit,
            barcode: d.barcode,
          })
          .eq("id", d.existingScanId);
        if (upErr) {
          errors.push(`update ${d.clientId}: ${upErr.message}`);
          continue;
        }
        updated++;
      }

      const { error: insErr } = await context.supabase.from("scans").insert({
        product_name: composedName,
        price_captured: d.price,
        establishment_id: data.establishmentId,
        market_name: marketName,
        quantity: d.quantity,
        unit: d.unit,
        barcode: d.barcode,
        status: "salvo",
        verdict: "unknown",
        user_id: null,
      });
      if (insErr) {
        errors.push(`insert ${d.clientId}: ${insErr.message}`);
      } else {
        inserted++;
      }
    }

    return { inserted, updated, ignored: data.decisions.length - actionable.length, errors };
  });
