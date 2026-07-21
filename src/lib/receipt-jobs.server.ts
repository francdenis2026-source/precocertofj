/**
 * Server-only helpers para o pipeline assíncrono de importação de cupom fiscal.
 * Bloqueado do bundle do cliente pelo sufixo `.server.ts`.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ensureCatalogEntries } from "@/lib/catalog-sync.server";

export type ExtractedItem = {
  key: string;
  productName: string;
  price: number;
  quantity: number | null;
  unit: string | null;
  barcode: string | null;
  totalPrice: number | null;
  mergedCount: number;
  duplicateOfScanId: string | null;
};

export type ReceiptExtractStored = {
  marketName: string | null;
  cnpj: string | null;
  ie: string | null;
  address: string | null;
  couponNumber: string | null;
  accessKey: string | null;
  issuedAt: string | null;
  total: number | null;
  amountPaid: number | null;
  items: ExtractedItem[];
};

const SYSTEM = `Você é um analisador de cupons/notas fiscais brasileiras (NFC-e, cupom fiscal, SAT).
Retorne EXCLUSIVAMENTE um JSON válido no formato:
{
  "marketName": string|null,
  "cnpj": string|null,
  "ie": string|null,
  "address": string|null,
  "couponNumber": string|null,
  "accessKey": string|null,
  "issuedAt": string|null,
  "total": number|null,
  "amountPaid": number|null,
  "items": [
    { "productName": string, "price": number, "quantity": number|null, "unit": string|null, "barcode": string|null, "totalPrice": number|null }
  ]
}

Regras:
- cnpj no formato "XX.XXX.XXX/XXXX-XX".
- accessKey são exatamente 44 dígitos numéricos.
- issuedAt em ISO 8601. Use fuso do estado se souber; senão null.
- price = valor unitário. totalPrice = qtd × unit.
- unit: "UN","KG","L","PC" etc.
- barcode: apenas EAN/UPC legível.
- Ignore desconto, subtotal, taxa, troco, cancelados.
- Campo desconhecido = null. Nunca invente.`;

const toNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) return n;
    const n2 = Number(v.replace(",", ".").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n2) && n2 > 0 ? n2 : null;
  }
  return null;
};
const toStr = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
};
const toAccessKey = (v: unknown): string | null => {
  const s = toStr(v);
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  return d.length === 44 ? d : null;
};

export const normalizeProductKey = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Chama Gemini e converte o payload para o formato armazenado. */
export async function runExtraction(imageDataUrl: string): Promise<Omit<ReceiptExtractStored, "items"> & {
  items: Omit<ExtractedItem, "key" | "mergedCount" | "duplicateOfScanId">[];
}> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia TODOS os dados fiscais e itens deste cupom." },
            { type: "image_url", image_url: { url: imageDataUrl } },
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
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  const items = Array.isArray(parsed.items)
    ? (parsed.items as unknown[])
        .map((it) => {
          const item = (it ?? {}) as Record<string, unknown>;
          const name = toStr(item.productName);
          const price = toNum(item.price);
          if (!name || !price) return null;
          return {
            productName: name,
            price,
            quantity: toNum(item.quantity),
            unit: toStr(item.unit),
            barcode: toStr(item.barcode),
            totalPrice: toNum(item.totalPrice),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : [];

  return {
    marketName: toStr(parsed.marketName),
    cnpj: toStr(parsed.cnpj),
    ie: toStr(parsed.ie),
    address: toStr(parsed.address),
    couponNumber: toStr(parsed.couponNumber),
    accessKey: toAccessKey(parsed.accessKey),
    issuedAt: toStr(parsed.issuedAt),
    total: toNum(parsed.total),
    amountPaid: toNum(parsed.amountPaid),
    items,
  };
}

/** Deduplica itens dentro da nota (mesmo barcode ou nome normalizado + unidade). */
export function dedupInReceipt(
  items: Omit<ExtractedItem, "key" | "mergedCount" | "duplicateOfScanId">[],
): ExtractedItem[] {
  const map = new Map<string, ExtractedItem>();
  for (const it of items) {
    const nk = normalizeProductKey(it.productName);
    const groupKey = `${it.barcode ?? nk}::${(it.unit ?? "").toUpperCase()}`;
    const existing = map.get(groupKey);
    if (existing) {
      existing.quantity = (existing.quantity ?? 0) + (it.quantity ?? 0) || existing.quantity;
      existing.totalPrice =
        (existing.totalPrice ?? 0) + (it.totalPrice ?? it.price * (it.quantity ?? 1));
      existing.mergedCount += 1;
      continue;
    }
    map.set(groupKey, {
      key: crypto.randomUUID(),
      productName: it.productName,
      price: it.price,
      quantity: it.quantity,
      unit: it.unit,
      barcode: it.barcode,
      totalPrice: it.totalPrice,
      mergedCount: 1,
      duplicateOfScanId: null,
    });
  }
  return Array.from(map.values());
}

/** Marca itens que já existem como scan salvo no mesmo estabelecimento com o mesmo preço. */
export async function markExistingDuplicates(
  items: ExtractedItem[],
  establishmentId: string,
  issuedAt: string | null,
): Promise<ExtractedItem[]> {
  if (items.length === 0) return items;
  const since = issuedAt
    ? new Date(new Date(issuedAt).getTime() - 90 * 24 * 3600 * 1000).toISOString()
    : new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

  const table = supabaseAdmin.from("scans" as never) as unknown as {
    select: (s: string) => {
      eq: (
        c: string,
        v: string,
      ) => {
        eq: (
          c: string,
          v: string,
        ) => {
          is: (
            c: string,
            v: null,
          ) => {
            gte: (
              c: string,
              v: string,
            ) => Promise<{
              data: Array<{
                id: string;
                product_name: string;
                price_captured: number | string;
                unit: string | null;
                barcode: string | null;
              }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };

  const { data: existing, error } = await table
    .select("id, product_name, price_captured, unit, barcode")
    .eq("establishment_id", establishmentId)
    .eq("status", "salvo")
    .is("user_id", null)
    .gte("created_at", since);
  if (error) throw new Error(error.message);

  const byBarcode = new Map<string, { id: string; price: number; unit: string | null }>();
  const byName = new Map<string, { id: string; price: number; unit: string | null }>();
  for (const s of existing ?? []) {
    const price = Number(s.price_captured);
    const info = { id: s.id, price, unit: s.unit };
    if (s.barcode) byBarcode.set(s.barcode, info);
    byName.set(`${normalizeProductKey(s.product_name)}::${(s.unit ?? "").toUpperCase()}`, info);
  }

  return items.map((it) => {
    const priceR = Math.round(it.price * 100) / 100;
    const nk = normalizeProductKey(it.productName);
    const groupKey = `${nk}::${(it.unit ?? "").toUpperCase()}`;
    const hit =
      (it.barcode ? byBarcode.get(it.barcode) : null) ?? byName.get(groupKey) ?? null;
    if (!hit) return it;
    const same = Math.round(hit.price * 100) / 100 === priceR;
    return { ...it, duplicateOfScanId: same ? hit.id : null };
  });
}

type JobRow = {
  id: string;
  status: string;
  user_id: string;
  image_data: string | null;
  image_url: string | null;
  extract: ReceiptExtractStored | null;
  suggested_establishment_id: string | null;
};

const jobsTable = () =>
  supabaseAdmin.from("receipt_jobs" as never) as unknown as {
    select: (s: string) => {
      eq: (
        c: string,
        v: string,
      ) => {
        single: () => Promise<{ data: JobRow | null; error: { message: string } | null }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };

async function patchJob(jobId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await jobsTable().update(patch).eq("id", jobId);
  if (error) console.error("[receipt-jobs] update failed:", error.message);
}

/** Pipeline completo: extrai, matcha CNPJ, dedup, marca duplicados. */
export async function processJob(jobId: string): Promise<void> {
  const { data: job, error } = await jobsTable()
    .select("id, status, user_id, image_data, image_url, extract, suggested_establishment_id")
    .eq("id", jobId)
    .single();
  if (error || !job) throw new Error(error?.message ?? "Job não encontrado");
  if (job.status !== "queued" && job.status !== "extracting") return; // idempotência
  if (!job.image_data) throw new Error("Imagem indisponível");

  try {
    await patchJob(jobId, {
      status: "extracting",
      progress: 25,
      step_label: "Lendo o cupom com IA…",
    });

    const raw = await runExtraction(job.image_data);

    await patchJob(jobId, {
      progress: 65,
      step_label: "Deduplicando itens da nota…",
    });

    let items = dedupInReceipt(raw.items);

    // matching CNPJ
    let suggested: string | null = null;
    if (raw.cnpj) {
      const digits = raw.cnpj.replace(/\D/g, "");
      const estTable = supabaseAdmin.from("establishments") as unknown as {
        select: (s: string) => {
          ilike: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{
              data: { id: string } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
      // Como o CNPJ pode estar formatado no banco, comparo por dígitos com regexp
      const { data: rows } = await (
        supabaseAdmin.from("establishments") as unknown as {
          select: (s: string) => Promise<{
            data: Array<{ id: string; cnpj: string | null }> | null;
            error: unknown;
          }>;
        }
      ).select("id, cnpj");
      if (rows) {
        const hit = rows.find((r) => (r.cnpj?.replace(/\D/g, "") ?? "") === digits);
        if (hit) suggested = hit.id;
      }
      void estTable; // silence
    }

    await patchJob(jobId, {
      progress: 85,
      step_label: "Checando duplicados no histórico…",
    });

    if (suggested) {
      items = await markExistingDuplicates(items, suggested, raw.issuedAt);
    }

    const extract: ReceiptExtractStored = { ...raw, items };
    await patchJob(jobId, {
      status: "ready_for_review",
      progress: 100,
      step_label: "Pronto para revisão",
      extract,
      suggested_establishment_id: suggested,
      image_data: null, // libera o base64
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha desconhecida";
    console.error("[receipt-jobs] processJob failed:", msg);
    await patchJob(jobId, {
      status: "failed",
      error_message: msg,
      step_label: "Falha na extração",
    });
    throw err;
  }
}

export type ConfirmParams = {
  jobId: string;
  userId: string;
  establishmentId: string | null;
  createEstablishment: {
    name: string;
    cnpj: string | null;
    address: string | null;
    city: string;
    state: string;
    phone: string | null;
  } | null;
  selectedKeys: string[];
  overrides: Record<
    string,
    { productName: string; price: number; quantity: number | null; unit: string | null; barcode: string | null; totalPrice: number | null }
  >;
  issuedAt: string | null;
  total: number | null;
  amountPaid: number | null;
  couponNumber: string | null;
  accessKey: string | null;
};

export async function confirmImport(p: ConfirmParams): Promise<{ receiptId: string; itemsSaved: number }> {
  const { data: job, error } = await jobsTable()
    .select("id, status, user_id, image_data, image_url, extract, suggested_establishment_id")
    .eq("id", p.jobId)
    .single();
  if (error || !job) throw new Error(error?.message ?? "Job não encontrado");
  if (job.user_id !== p.userId) throw new Error("Job não pertence ao usuário");
  if (job.status !== "ready_for_review") throw new Error("Job não está pronto");
  if (!job.extract) throw new Error("Extração ausente");

  await patchJob(p.jobId, {
    status: "importing",
    progress: 10,
    step_label: "Preparando importação…",
  });

  try {
    // 1. Estabelecimento
    let establishmentId = p.establishmentId;
    if (!establishmentId && p.createEstablishment) {
      const estIns = supabaseAdmin.from("establishments") as unknown as {
        insert: (v: Record<string, unknown>) => {
          select: (s: string) => {
            single: () => Promise<{
              data: { id: string } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
      const { data: newEst, error: estErr } = await estIns
        .insert({
          name: p.createEstablishment.name,
          cnpj: p.createEstablishment.cnpj,
          address: p.createEstablishment.address,
          city: p.createEstablishment.city,
          state: p.createEstablishment.state,
          phone: p.createEstablishment.phone,
          kind: "supermarket",
          active: true,
          created_by: p.userId,
        })
        .select("id")
        .single();
      if (estErr || !newEst) throw new Error(estErr?.message ?? "Falha ao criar estabelecimento");
      establishmentId = newEst.id;
    }
    if (!establishmentId) throw new Error("Estabelecimento não informado");

    await patchJob(p.jobId, { progress: 30, step_label: "Salvando cupom…" });

    // 2. Receipt
    const receiptsIns = supabaseAdmin.from("receipts" as never) as unknown as {
      insert: (v: Record<string, unknown>) => {
        select: (s: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data: rec, error: recErr } = await receiptsIns
      .insert({
        establishment_id: establishmentId,
        coupon_number: p.couponNumber,
        access_key: p.accessKey,
        issued_at: p.issuedAt,
        total: p.total,
        amount_paid: p.amountPaid,
        image_url: job.image_url,
        created_by: p.userId,
      })
      .select("id")
      .single();
    if (recErr || !rec) throw new Error(recErr?.message ?? "Falha ao criar cupom");

    await patchJob(p.jobId, { progress: 55, step_label: "Registrando produtos…" });

    // 3. Itens selecionados
    const selectedSet = new Set(p.selectedKeys);
    const chosen = job.extract.items
      .filter((it) => selectedSet.has(it.key))
      .map((it) => ({ ...it, ...(p.overrides[it.key] ?? {}) }));

    if (chosen.length === 0) {
      await patchJob(p.jobId, {
        status: "done",
        progress: 100,
        step_label: "Sem itens selecionados",
        receipt_id: rec.id,
      });
      return { receiptId: rec.id, itemsSaved: 0 };
    }

    // Buscar nome do mercado
    const estGet = supabaseAdmin.from("establishments") as unknown as {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          maybeSingle: () => Promise<{
            data: { name: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data: estRow } = await estGet
      .select("name")
      .eq("id", establishmentId)
      .maybeSingle();

    const scansRows = chosen.map((it) => ({
      market_name: estRow?.name ?? job.extract?.marketName ?? null,
      establishment_id: establishmentId,
      receipt_id: rec.id,
      product_name: it.productName,
      price_captured: it.price,
      total_price: it.totalPrice,
      quantity: it.quantity,
      unit: it.unit,
      barcode: it.barcode,
      verdict: "unknown",
      status: "salvo",
      created_at: p.issuedAt ?? new Date().toISOString(),
    }));

    const scansIns = supabaseAdmin.from("scans" as never) as unknown as {
      insert: (v: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
    };
    const { error: scErr } = await scansIns.insert(scansRows);
    if (scErr) throw new Error(scErr.message);

    await patchJob(p.jobId, { progress: 85, step_label: "Sincronizando catálogo…" });

    // 4. Auto-cadastro catálogo
    try {
      await ensureCatalogEntries(
        chosen.map((it) => ({
          productName: it.productName,
          barcode: it.barcode,
          unit: it.unit,
        })),
      );
    } catch (err) {
      console.error("[receipt-jobs] catalog sync falhou:", err);
    }

    await patchJob(p.jobId, {
      status: "done",
      progress: 100,
      step_label: `Importação concluída (${chosen.length} itens)`,
      receipt_id: rec.id,
    });

    return { receiptId: rec.id, itemsSaved: chosen.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha desconhecida";
    console.error("[receipt-jobs] confirmImport failed:", msg);
    await patchJob(p.jobId, {
      status: "failed",
      error_message: msg,
      step_label: "Falha na importação",
    });
    throw err;
  }
}
