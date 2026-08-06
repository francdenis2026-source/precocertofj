import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBasketComparison, buildBudgetBasket, type EssentialKey } from "./basket.functions";

export type AiAccess = {
  allowed: boolean;
  reason: string;
  planSlug: string | null;
  planName: string | null;
  limit: number;
  used: number;
  resetAt: string;
  requireActivePlan: boolean;
  allowTrial: boolean;
  assistantEnabled: boolean;
  warnThresholds: number[];
  paidUntil: string | null;
  trialEndsAt: string | null;
};

/**
 * Lê o estado de acesso à IA do usuário aplicando as regras configuráveis
 * pelo administrador (exigir plano ativo, permitir trial, ligar/desligar) e a
 * cota mensal derivada do plano.
 */
async function loadAiAccess(userId: string): Promise<AiAccess> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("get_or_create_ai_quota", { _user_id: userId, _default_limit: 20 });
  const { data, error } = await supabaseAdmin.rpc("get_ai_access", { _user_id: userId });
  if (error) throw new Error(error.message);
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return {
    allowed: Boolean(r?.allowed),
    reason: String(r?.reason ?? "unknown"),
    planSlug: (r?.plan_slug as string) ?? null,
    planName: (r?.plan_name as string) ?? null,
    limit: Number(r?.quota_limit ?? 0),
    used: Number(r?.used ?? 0),
    resetAt: String(r?.reset_at ?? new Date().toISOString()),
    requireActivePlan: Boolean(r?.require_active_plan ?? true),
    allowTrial: Boolean(r?.allow_trial ?? false),
    assistantEnabled: Boolean(r?.assistant_enabled ?? true),
    warnThresholds: (r?.warn_thresholds as number[]) ?? [75, 95],
    paidUntil: (r?.paid_until as string) ?? null,
    trialEndsAt: (r?.trial_ends_at as string) ?? null,
  };
}

/** Bloqueia o uso da IA conforme as regras administrativas configuradas. */
async function assertAiAllowed(userId: string): Promise<AiAccess> {
  const access = await loadAiAccess(userId);
  if (!access.allowed && access.reason === "disabled") {
    throw new Response("Assistente de IA temporariamente desativado.", { status: 403 });
  }
  if (!access.allowed && access.reason === "no_active_plan") {
    throw new Response(
      access.allowTrial
        ? "Assistente de IA disponível para assinantes ativos ou período de teste."
        : "Assistente de IA disponível apenas para assinantes ativos.",
      { status: 403 },
    );
  }
  if (!access.allowed && access.reason === "free_quota_exceeded") {
    throw new Response(
      "Você já usou a chamada gratuita de IA deste mês. Assine um plano pago (Mensal, Trimestral ou Anual) para continuar usando o assistente.",
      { status: 403 },
    );
  }
  if (!access.allowed && access.reason === "plan_not_eligible") {
    throw new Response(
      "O assistente de IA está disponível apenas nos planos pagos (Mensal, Trimestral ou Anual). O plano Degustação não inclui IA.",
      { status: 403 },
    );
  }

  return access;
}


export type AssistantMessage = { role: "user" | "assistant"; content: string };

export type EssentialTool =
  | "arroz" | "feijao" | "oleo" | "acucar" | "cafe" | "leite"
  | "macarrao" | "farinha" | "sal" | "molho" | "sabao" | "papel"
  | "manteiga" | "ovos";

export type AssistantAction =
  | { type: "set_mode"; mode: "compare" | "budget" | "manual" }
  | { type: "set_budget"; amount: number }
  | { type: "set_filters"; radiusKm?: number | null; city?: string | null }
  | { type: "add_item"; key: EssentialTool; qty: number }
  | { type: "remove_item"; key: EssentialTool }
  | { type: "clear_manual" }
  | { type: "explain"; text: string };

export type AssistantResponse = {
  reply: string;
  actions: AssistantAction[];
};

const ESSENTIAL_KEYS: EssentialTool[] = [
  "arroz", "feijao", "oleo", "acucar", "cafe", "leite",
  "macarrao", "farinha", "sal", "molho", "sabao", "papel",
  "manteiga", "ovos",
];

const SYSTEM_PROMPT = `Você é o assistente de cesta do PreçoCerto (Brasil), um comparador de preços de mercados.
Ajude o cliente a:
- Comparar mercados (modo "compare") — pode filtrar por cidade ou raio em km
- Montar cesta automática por orçamento (modo "budget")
- Escolher itens manualmente (modo "manual") — adicionar/remover essenciais

Itens essenciais disponíveis (use estas chaves exatas nas ferramentas):
${ESSENTIAL_KEYS.join(", ")}.

Regras:
- SEMPRE que o usuário citar valor a gastar, use set_budget e set_mode("budget").
- Se citar cidade/bairro/raio, use set_filters + set_mode("compare").
- Se pedir para adicionar/remover itens específicos, use add_item / remove_item e set_mode("manual").
- Fale em português brasileiro, direto, 1-3 frases. Não invente preços.
- Depois de chamar ferramentas, escreva uma resposta curta explicando o que fez.`;

type ToolCall = {
  id?: string;
  type: "function";
  function: { name: string; arguments: string };
};

function parseArgs(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

function toAction(name: string, args: Record<string, unknown>): AssistantAction | null {
  switch (name) {
    case "set_mode": {
      const m = String(args.mode ?? "");
      if (m === "compare" || m === "budget" || m === "manual") return { type: "set_mode", mode: m };
      return null;
    }
    case "set_budget": {
      const a = Number(args.amount);
      if (!Number.isFinite(a) || a <= 0 || a > 10000) return null;
      return { type: "set_budget", amount: Math.round(a * 100) / 100 };
    }
    case "set_filters": {
      const km = args.radiusKm == null ? null : Number(args.radiusKm);
      const city = args.city == null ? null : String(args.city).slice(0, 80);
      return {
        type: "set_filters",
        radiusKm: km != null && Number.isFinite(km) && km > 0 && km <= 500 ? km : null,
        city: city || null,
      };
    }
    case "add_item": {
      const key = String(args.key ?? "") as EssentialTool;
      if (!ESSENTIAL_KEYS.includes(key)) return null;
      const q = Math.max(1, Math.min(20, Math.floor(Number(args.qty ?? 1)) || 1));
      return { type: "add_item", key, qty: q };
    }
    case "remove_item": {
      const key = String(args.key ?? "") as EssentialTool;
      if (!ESSENTIAL_KEYS.includes(key)) return null;
      return { type: "remove_item", key };
    }
    case "clear_manual":
      return { type: "clear_manual" };
    case "explain": {
      const t = String(args.text ?? "").slice(0, 400);
      return t ? { type: "explain", text: t } : null;
    }
    default:
      return null;
  }
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "set_mode",
      description: "Alterna a interface entre os modos de operação da Cesta Básica.",
      parameters: {
        type: "object",
        properties: { mode: { type: "string", enum: ["compare", "budget", "manual"] } },
        required: ["mode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_budget",
      description: "Define o orçamento (R$) e ativa a montagem automática por valor.",
      parameters: {
        type: "object",
        properties: { amount: { type: "number", description: "Valor em reais, ex: 80" } },
        required: ["amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_filters",
      description: "Filtra a comparação por cidade e/ou raio em km a partir da localização do usuário.",
      parameters: {
        type: "object",
        properties: {
          radiusKm: { type: ["number", "null"] },
          city: { type: ["string", "null"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_item",
      description: "Adiciona um item essencial à cesta manual do usuário, com quantidade (1-20).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", enum: ESSENTIAL_KEYS },
          qty: { type: "integer", minimum: 1, maximum: 20 },
        },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_item",
      description: "Remove um item essencial da cesta manual do usuário.",
      parameters: {
        type: "object",
        properties: { key: { type: "string", enum: ESSENTIAL_KEYS } },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_manual",
      description: "Limpa todos os itens da cesta manual.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "explain",
      description: "Envia uma explicação curta ao usuário (usar apenas quando o texto principal já não cobre).",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
];

function summarizeActions(actions: AssistantAction[]): string {
  if (!actions.length) return "";
  const parts: string[] = [];
  for (const a of actions) {
    switch (a.type) {
      case "set_mode":
        parts.push(
          a.mode === "budget" ? "modo orçamento"
          : a.mode === "manual" ? "modo manual"
          : "modo comparar",
        );
        break;
      case "set_budget":
        parts.push(`orçamento R$ ${a.amount.toFixed(2).replace(".", ",")}`);
        break;
      case "set_filters":
        if (a.city) parts.push(`cidade "${a.city}"`);
        if (a.radiusKm) parts.push(`raio ${a.radiusKm} km`);
        break;
      case "add_item":
        parts.push(`+${a.qty}× ${a.key}`);
        break;
      case "remove_item":
        parts.push(`− ${a.key}`);
        break;
      case "clear_manual":
        parts.push("limpar cesta");
        break;
      case "explain":
        break;
    }
  }
  return parts.length ? `Feito ✓ apliquei: ${parts.join(", ")}.` : "";
}

export const askBasketAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { messages: AssistantMessage[] }) => {
    if (!Array.isArray(data?.messages) || data.messages.length === 0) {
      throw new Error("Mensagens inválidas");
    }
    return {
      messages: data.messages.slice(-12).map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(m.content ?? "").slice(0, 2000),
      })),
    };
  })
  .handler(async ({ data, context }): Promise<AssistantResponse & { quota?: { used: number; limit: number; resetAt: string } }> => {
    const access = await assertAiAllowed(context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { reply: "Assistente indisponível (chave de IA não configurada).", actions: [] };
    }

    // Consome cota mensal antes de gastar créditos
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quotaRes, error: quotaErr } = await supabaseAdmin
      .rpc("consume_ai_quota", { _user_id: context.userId, _amount: 1 });
    if (quotaErr) {
      return { reply: `Falha ao verificar cota: ${quotaErr.message}`, actions: [] };
    }
    const q = Array.isArray(quotaRes) ? quotaRes[0] : quotaRes;
    if (q && !q.allowed) {
      return {
        reply: `Você atingiu o limite mensal de ${q.quota_limit} perguntas ao assistente${access.planName ? ` no plano ${access.planName}` : ""}. Cota renova em ${new Date(q.reset_at).toLocaleDateString("pt-BR")}.`,
        actions: [],
        quota: { used: q.used, limit: q.quota_limit, resetAt: q.reset_at },
      };
    }

    const model = "google/gemini-2.5-flash-lite";
    const t0 = Date.now();
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (res.status === 429) {
        return { reply: "Muitas solicitações. Aguarde alguns segundos e tente de novo.", actions: [] };
      }
      if (res.status === 402) {
        return { reply: "Créditos de IA esgotados. Um administrador precisa recarregar o workspace.", actions: [] };
      }
      if (!res.ok) {
        const t = await res.text();
        await supabaseAdmin.from("ai_usage").insert({
          user_id: context.userId, function_name: "askBasketAssistant", model,
          success: false, error_message: `${res.status}: ${t.slice(0, 200)}`,
        });
        return { reply: `Assistente falhou (${res.status}).`, actions: [] };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const msg = json.choices?.[0]?.message;
      const actions: AssistantAction[] = [];
      for (const tc of msg?.tool_calls ?? []) {
        if (tc?.type !== "function" || !tc.function?.name) continue;
        const a = toAction(tc.function.name, parseArgs(tc.function.arguments ?? "{}"));
        if (a) actions.push(a);
      }
      let reply = (msg?.content ?? "").trim();
      if (!reply) reply = summarizeActions(actions) || "Como posso ajudar com sua cesta?";

      // Log de uso (não bloqueia resposta)
      const u = json.usage ?? {};
      await supabaseAdmin.from("ai_usage").insert({
        user_id: context.userId, function_name: "askBasketAssistant", model,
        prompt_tokens: u.prompt_tokens ?? 0,
        completion_tokens: u.completion_tokens ?? 0,
        total_tokens: u.total_tokens ?? 0,
        success: true,
      });

      return {
        reply, actions,
        quota: q ? { used: q.used, limit: q.quota_limit, resetAt: q.reset_at } : undefined,
      };
    } catch (err) {
      return {
        reply: `Falha ao consultar o assistente: ${err instanceof Error ? err.message : "erro"} (${Date.now() - t0}ms)`,
        actions: [],
      };
    }
  });

/** Retorna cota, plano e regras de acesso de IA do usuário. */
export const getMyAiQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiAccess> => loadAiAccess(context.userId));

/**
 * Histórico de perguntas à IA do usuário, com estimativa de créditos por
 * chamada e total consumido no mês corrente.
 */
export const getMyAiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    items: Array<{
      id: string;
      createdAt: string;
      functionName: string;
      model: string | null;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      success: boolean;
      errorMessage: string | null;
      credits: number;
    }>;
    months: Array<{ monthKey: string; requests: number; totalTokens: number; credits: number }>;
    currentMonth: { requests: number; totalTokens: number; credits: number };
  }> => {
    const { creditsForTokens } = await import("./ai-cost");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("ai_usage")
      .select("id, created_at, function_name, model, prompt_tokens, completion_tokens, total_tokens, success, error_message")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);

    const items = (rows ?? []).map((r) => ({
      id: r.id as string,
      createdAt: r.created_at as string,
      functionName: r.function_name as string,
      model: (r.model as string) ?? null,
      promptTokens: r.prompt_tokens ?? 0,
      completionTokens: r.completion_tokens ?? 0,
      totalTokens: r.total_tokens ?? 0,
      success: Boolean(r.success),
      errorMessage: (r.error_message as string) ?? null,
      credits: creditsForTokens(
        (r.model as string) ?? "google/gemini-2.5-flash-lite",
        r.prompt_tokens ?? 0,
        r.completion_tokens ?? 0,
      ),
    }));

    const byMonth = new Map<string, { requests: number; totalTokens: number; credits: number }>();
    for (const it of items) {
      const key = it.createdAt.slice(0, 7);
      const cur = byMonth.get(key) ?? { requests: 0, totalTokens: 0, credits: 0 };
      cur.requests += 1;
      cur.totalTokens += it.totalTokens;
      cur.credits += it.credits;
      byMonth.set(key, cur);
    }
    const months = [...byMonth.entries()]
      .map(([monthKey, v]) => ({ monthKey, ...v }))
      .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1));
    const nowKey = new Date().toISOString().slice(0, 7);
    const currentMonth = byMonth.get(nowKey) ?? { requests: 0, totalTokens: 0, credits: 0 };

    return { items, months, currentMonth };
  });

/**
 * Estimativa de custo de uma pergunta ao assistente, em créditos Lovable.
 * Usa a média real de tokens registrada em ai_usage (últimos 30 dias) quando
 * existir; caso contrário, usa uma média típica do prompt do assistente.
 */
export const estimateAssistantCost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{
    model: string;
    avgPromptTokens: number;
    avgCompletionTokens: number;
    creditsPerAsk: number;
    samples: number;
  }> => {
    const { creditsForTokens } = await import("./ai-cost");
    const model = "google/gemini-2.5-flash-lite";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from("ai_usage")
      .select("prompt_tokens, completion_tokens")
      .eq("function_name", "askBasketAssistant")
      .eq("success", true)
      .gte("created_at", since)
      .limit(500);

    const rows = (data ?? []).filter((r) => (r.prompt_tokens ?? 0) > 0);
    // Baseline: prompt de sistema + ferramentas ≈ 900 tokens, resposta ≈ 120.
    let avgPrompt = 950;
    let avgCompletion = 120;
    if (rows.length > 0) {
      avgPrompt = Math.round(
        rows.reduce((s, r) => s + (r.prompt_tokens ?? 0), 0) / rows.length,
      );
      avgCompletion = Math.round(
        rows.reduce((s, r) => s + (r.completion_tokens ?? 0), 0) / rows.length,
      );
    }
    return {
      model,
      avgPromptTokens: avgPrompt,
      avgCompletionTokens: avgCompletion,
      creditsPerAsk: creditsForTokens(model, avgPrompt, avgCompletion),
      samples: rows.length,
    };
  });


// Convenience helpers (kept for backwards compat)
export const previewBudgetBasket = createServerFn({ method: "POST" })
  .validator((data: { budget: number }) => data)
  .handler(async ({ data }) => buildBudgetBasket({ data }));

export const previewComparison = createServerFn({ method: "POST" })
  .validator((data: {
    radiusKm?: number | null;
    city?: string | null;
    originLat?: number | null;
    originLng?: number | null;
  }) => data ?? {})
  .handler(async ({ data }) => getBasketComparison({ data }));

/**
 * Explica a economia real da cesta manual do usuário comparando com a média
 * dos preços registrados nos últimos 90 dias. Retorna um texto detalhado
 * pronto para ser exibido como mensagem do assistente.
 */
export const explainBasketSavings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      quantities: Partial<Record<EssentialKey, number>>;
      city?: string | null;
      radiusKm?: number | null;
      originLat?: number | null;
      originLng?: number | null;
    }) => {
      const q: Partial<Record<EssentialKey, number>> = {};
      for (const [k, v] of Object.entries(data?.quantities ?? {})) {
        const n = Math.max(0, Math.min(20, Math.floor(Number(v) || 0)));
        if (n > 0) q[k as EssentialKey] = n;
      }
      return {
        quantities: q,
        city: data?.city ?? null,
        radiusKm: data?.radiusKm ?? null,
        originLat: data?.originLat ?? null,
        originLng: data?.originLng ?? null,
      };
    },
  )
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    await assertAiAllowed(context.userId);
    const keys = Object.keys(data.quantities) as EssentialKey[];
    if (keys.length === 0) {
      return {
        text:
          "Sua cesta está vazia. Adicione alguns itens (arroz, feijão, óleo...) que eu explico a economia real.",
      };
    }
    const cmp = await getBasketComparison({
      data: {
        city: data.city,
        radiusKm: data.radiusKm,
        originLat: data.originLat,
        originLng: data.originLng,
      },
    });
    const cheapestMap = new Map<EssentialKey, (typeof cmp.cheapest)[number]>();
    for (const c of cmp.cheapest) cheapestMap.set(c.key, c);

    const fmt = (n: number) =>
      `R$ ${n.toFixed(2).replace(".", ",")}`;
    const rows: string[] = [];
    let totalCheapest = 0;
    let totalAvg = 0;
    let missing = 0;
    const perStore = new Map<string, { name: string; total: number; items: number }>();

    for (const k of keys) {
      const qty = data.quantities[k] ?? 0;
      const c = cheapestMap.get(k);
      const label = cmp.essentials.find((e) => e.key === k)?.label ?? k;
      const avg = cmp.averagePrices[k];
      if (c) {
        const lineCheapest = c.price * qty;
        const lineAvg = typeof avg === "number" ? avg * qty : lineCheapest;
        const diff = lineAvg - lineCheapest;
        totalCheapest += lineCheapest;
        totalAvg += lineAvg;
        const store = perStore.get(c.establishmentId) ?? {
          name: c.establishmentName,
          total: 0,
          items: 0,
        };
        store.total += lineCheapest;
        store.items += 1;
        perStore.set(c.establishmentId, store);
        const savePct = lineAvg > 0 ? Math.round((diff / lineAvg) * 100) : 0;
        if (diff > 0.5 && savePct >= 5) {
          rows.push(
            `• ${label} (${qty}x) em ${c.establishmentName}: ${fmt(lineCheapest)} · média ${fmt(lineAvg)} → economia ${fmt(diff)} (${savePct}%)`,
          );
        } else {
          rows.push(
            `• ${label} (${qty}x) em ${c.establishmentName}: ${fmt(lineCheapest)}${diff > 0 ? ` · média ${fmt(lineAvg)}` : ""}`,
          );
        }
      } else {
        missing += 1;
        rows.push(`• ${label} (${qty}x): sem preço registrado nos últimos 90 dias`);
      }
    }

    const savings = Math.max(0, totalAvg - totalCheapest);
    const savingsPct = totalAvg > 0 ? Math.round((savings / totalAvg) * 100) : 0;
    const storeList = Array.from(perStore.values()).sort((a, b) => b.total - a.total);

    const lines: string[] = [];
    lines.push(`💡 Sua cesta custa ${fmt(totalCheapest)} escolhendo a mercado mais barata para cada item.`);
    if (savings > 0) {
      lines.push(
        `Comprando pela média do mercado, você pagaria ${fmt(totalAvg)} — economia de ${fmt(savings)} (${savingsPct}%).`,
      );
    } else {
      lines.push(`Não há economia relevante frente à média (mercado equilibrado neste momento).`);
    }
    if (missing > 0) {
      lines.push(`${missing} item(ns) sem preço recente entram como estimativa.`);
    }
    if (storeList.length > 0) {
      lines.push("");
      lines.push("🏪 Mercados usadas na sua cesta ideal:");
      for (const s of storeList.slice(0, 4)) {
        lines.push(`   ${s.name}: ${fmt(s.total)} (${s.items} item(ns))`);
      }
    }
    lines.push("");
    lines.push("📋 Por que cada item vale a pena:");
    lines.push(...rows.slice(0, 12));
    if (rows.length > 12) lines.push(`   … +${rows.length - 12} itens`);
    return { text: lines.join("\n") };
  });
