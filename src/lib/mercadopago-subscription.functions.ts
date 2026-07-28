/**
 * Cria uma Preference no Mercado Pago para assinar um plano.
 * Sem `planId` → assinatura mensal padrão (R$ 19,90 / 30 dias).
 * Com `planId` → usa preço + duração (`days`) do plano selecionado em `plans`.
 *
 * O webhook em /api/public/mercadopago/webhook detecta
 * `external_reference = profile:<uuid>` e estende `profiles.paid_until`
 * pelo número de dias em `metadata.plan_days` (fallback 30).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRICE_BRL } from "@/lib/paywall";

type MpPreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { planId?: string | null } | null) => ({
    planId: data?.planId ? String(data.planId) : null,
  }))
  .handler(async ({ context, data }): Promise<{ url: string; preferenceId: string }> => {
    const { getMpCredentials } = await import("@/lib/mp-credentials.server");
    const creds = await getMpCredentials();
    const accessToken = creds.accessToken;
    if (!accessToken) throw new Error("Pagamentos indisponíveis no momento");

    const { data: profile, error } = await context.supabase
      .from("profiles" as never)
      .select("id, full_name")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Cadastre seu perfil antes de assinar");

    const row = profile as unknown as { id: string; full_name: string };

    // Defaults (assinatura mensal legado)
    let title = "PreçoCerto — Assinatura mensal";
    let description = "Acesso a todas as funcionalidades por 30 dias";
    let unitPrice = PRICE_BRL;
    let planDays = 30;
    let planId: string | null = null;

    if (data.planId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: plan, error: pErr } = await (supabaseAdmin as any)
        .from("license_plans")
        .select("id, name, description, price_cents, days, cycle, active")
        .eq("id", data.planId)
        .eq("active", true)
        .maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!plan) throw new Error("Plano indisponível");
      const planPrice = Number(plan.price_cents ?? 0) / 100;
      if (plan.cycle === "trial" || planPrice <= 0) {
        throw new Error("Este plano não requer pagamento");
      }
      planId = plan.id as string;
      planDays = Math.max(1, Number(plan.days) || 30);
      unitPrice = planPrice;
      title = `PreçoCerto — ${plan.name}`;
      description =
        (plan.description as string | null) ??
        `Acesso a todas as funcionalidades por ${planDays} dias`;
    }

    const origin =
      (process.env.APP_PUBLIC_URL as string | undefined) ??
      "https://precocerto.app";

    const backSuffix = planId ? `&planId=${encodeURIComponent(planId)}` : "";

    const body: Record<string, unknown> = {
      items: [
        {
          id: planId ?? "precocerto-mensal",
          title,
          description,
          quantity: 1,
          currency_id: "BRL",
          unit_price: unitPrice,
        },
      ],
      external_reference: `profile:${row.id}`,
      metadata: {
        profile_id: row.id,
        plan_id: planId,
        plan_days: planDays,
      },
      back_urls: {
        success: `${origin}/assinatura?status=success${backSuffix}`,
        pending: `${origin}/assinatura?status=pending${backSuffix}`,
        failure: `${origin}/assinar?status=failure${backSuffix}`,
      },
      auto_return: "approved",
      notification_url: `${origin}/api/public/mercadopago/webhook`,
      statement_descriptor: "PRECOCERTO",
    };

    if (creds.pixOnly) {
      body.payment_methods = {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "ticket" },
          { id: "atm" },
        ],
        default_payment_method_id: "pix",
        installments: 1,
      };
    } else if (creds.pixEnabled) {
      body.payment_methods = { default_payment_method_id: "pix" };
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error("[mp] preference error", res.status, raw);
      throw new Error("Falha ao gerar checkout no Mercado Pago");
    }
    const dataResp = JSON.parse(raw) as MpPreferenceResponse;
    const url = dataResp.init_point ?? dataResp.sandbox_init_point;
    if (!url) throw new Error("Mercado Pago não retornou URL de checkout");
    return { url, preferenceId: dataResp.id };
  });
