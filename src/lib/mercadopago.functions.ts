import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MP_API = "https://api.mercadopago.com";
const PUBLIC_BASE_URL =
  process.env.PUBLIC_APP_URL ||
  process.env.VITE_PUBLIC_APP_URL ||
  "https://preco-certo-fj.lovable.app";

function centsToBRL(cents: number): number {
  return Math.round(cents) / 100;
}

type MpTokenInfo = { env: "test" | "prod"; masked: string };

/** Validate an MP access token shape and derive the environment. */
function inspectMpToken(token: string | undefined): MpTokenInfo {
  if (!token || typeof token !== "string" || token.trim().length < 20) {
    throw new Error(
      "MP_ACCESS_TOKEN ausente ou inválido. Cole o token completo do Mercado Pago (formato APP_USR-... para produção ou TEST-... para sandbox).",
    );
  }
  const t = token.trim();
  const isTest = t.startsWith("TEST-");
  const isProd = t.startsWith("APP_USR-");
  if (!isTest && !isProd) {
    throw new Error(
      "MP_ACCESS_TOKEN em formato desconhecido. Deve começar com APP_USR- (produção) ou TEST- (sandbox). Confira em Mercado Pago → Suas integrações → Credenciais.",
    );
  }
  const masked = `${t.slice(0, 8)}…${t.slice(-4)}`;
  return { env: isTest ? "test" : "prod", masked };
}

/**
 * Expose Mercado Pago configuration status for the admin panel — never leaks the raw token.
 */
export const getMercadoPagoStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado");

    const token = process.env.MP_ACCESS_TOKEN;
    const secret = process.env.MP_WEBHOOK_SECRET;
    let tokenInfo: MpTokenInfo | null = null;
    let tokenError: string | null = null;
    try {
      tokenInfo = inspectMpToken(token);
    } catch (e) {
      tokenError = e instanceof Error ? e.message : "Token inválido";
    }
    // ensure supabaseAdmin import path is validated at boot
    void supabaseAdmin;
    return {
      env: tokenInfo?.env ?? null,
      tokenMasked: tokenInfo?.masked ?? null,
      tokenError,
      webhookSecretConfigured: !!secret,
      webhookUrl: `${PUBLIC_BASE_URL}/api/public/mp-webhook`,
    };
  });

/**
 * Create a Mercado Pago Checkout Pro preference for an existing order
 * and return the init_point URL to redirect the user to.
 */
export const createMercadoPagoPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data, context }) => {
    const tokenInfo = inspectMpToken(process.env.MP_ACCESS_TOKEN);
    const token = process.env.MP_ACCESS_TOKEN!;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("checkout_orders")
      .select("id, user_id, final_cents, status, plan_id, delivery_email, license_plans:plan_id(name)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido não encontrado");
    if (order.user_id !== context.userId) throw new Error("Acesso negado");
    if (order.status === "approved") throw new Error("Pedido já aprovado");
    if (!order.final_cents || order.final_cents < 100) {
      throw new Error("Valor do pedido inválido");
    }
    if (!order.delivery_email) {
      throw new Error("Informe o e-mail de entrega antes de pagar.");
    }

    // Preferir o e-mail informado no checkout (canal de entrega da licença);
    // cair no e-mail da conta apenas como fallback.
    let payerEmail: string | undefined = order.delivery_email ?? undefined;
    if (!payerEmail) {
      const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      payerEmail = userInfo?.user?.email ?? undefined;
    }

    const planName: string = (order as any).license_plans?.name ?? "Plano PreçoCerto";

    const preference = {
      items: [
        {
          id: order.plan_id,
          title: `PreçoCerto — ${planName}`,
          quantity: 1,
          unit_price: centsToBRL(order.final_cents),
          currency_id: "BRL",
        },
      ],
      payer: payerEmail ? { email: payerEmail } : undefined,
      external_reference: order.id,
      statement_descriptor: "PRECOCERTO",
      // Aceita PIX + cartão de crédito. Boleto/ATM são excluídos porque exigem
      // homologação adicional na conta MP e costumam falhar para pequenos
      // comércios locais — se necessário, remova o excluded_payment_types abaixo.
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" },
          { id: "atm" },
        ],
        installments: 1,
      },
      back_urls: {
        success: `${PUBLIC_BASE_URL}/checkout/${order.id}?status=success`,
        failure: `${PUBLIC_BASE_URL}/checkout/${order.id}?status=failure`,
        pending: `${PUBLIC_BASE_URL}/checkout/${order.id}?status=pending`,
      },
      auto_return: "approved" as const,
      notification_url: `${PUBLIC_BASE_URL}/api/public/mp-webhook`,
      metadata: { order_id: order.id, user_id: order.user_id },
    };

    const resp = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": `order-${order.id}`,
      },
      body: JSON.stringify(preference),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[MP] preference failed [${resp.status}]: ${errBody}`);
      throw new Error(`Falha ao criar preferência (${resp.status})`);
    }

    const pref = (await resp.json()) as {
      id: string;
      init_point: string;
      sandbox_init_point: string;
    };

    const isSandbox = tokenInfo.env === "test";
    const redirectUrl = isSandbox ? pref.sandbox_init_point : pref.init_point;

    await supabaseAdmin
      .from("checkout_orders")
      .update({ provider_ref: pref.id })
      .eq("id", order.id);

    return { url: redirectUrl, preferenceId: pref.id, sandbox: isSandbox };
  });

/** Admin: list webhook events for the Mercado Pago provider. */
export const listMercadoPagoWebhookEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { limit?: number } | undefined) => ({
    limit: Math.min(Math.max(Number(data?.limit ?? 100), 1), 500),
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("webhook_events")
      .select(
        "id, provider, event_type, external_id, status, error, signature_valid, attempts, created_at, last_processed_at, payload, email_status",
      )
      .eq("provider", "mercadopago")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      ...r,
      payload_summary: summarizePayload(r.payload),
    }));
  });

function summarizePayload(payload: unknown): string {
  try {
    const p = payload as Record<string, unknown>;
    const type = (p?.type ?? p?.action ?? "") as string;
    const data = (p?.data ?? {}) as Record<string, unknown>;
    const id = data?.id ?? "";
    return `${type || "evento"} · id=${id || "—"}`;
  } catch {
    return "—";
  }
}

/**
 * Dev/admin helper: simulate an approved payment without going through Mercado Pago.
 * Marks the order as approved via the RPC and generates the license code.
 */
export const simulateCheckoutApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado — apenas admins podem simular pagamento");
    if (!data.orderId) throw new Error("orderId obrigatório");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("checkout_orders")
      .select("id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");
    if (order.status === "approved")
      throw new Error("Pedido já foi aprovado — código já emitido");

    const providerRef = `sim-${Date.now()}`;
    const { data: rows, error } = await supabaseAdmin.rpc("approve_checkout_order", {
      _order_id: data.orderId,
      _provider_ref: providerRef,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;

    // Register a synthetic webhook_events row for the audit log
    await supabaseAdmin.from("webhook_events").insert({
      provider: "mercadopago",
      event_type: "simulated.payment",
      external_id: providerRef,
      payload: { simulated: true, orderId: data.orderId } as never,
      headers: { source: "admin-simulate" } as never,
      signature_valid: true,
      status: "processed",
      attempts: 1,
      last_processed_at: new Date().toISOString(),
    });

    return {
      orderId: row?.order_id as string,
      licenseCode: row?.license_code as string,
      providerRef,
    };
  });

/**
 * Cria uma cobrança PIX direta via Mercado Pago Payments API e guarda o
 * QR Code + copia-e-cola + expiração no pedido, permitindo uma tela dedicada
 * dentro do próprio app (sem redirect para o Checkout Pro).
 */
export const createPixCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data, context }) => {
    const tokenInfo = inspectMpToken(process.env.MP_ACCESS_TOKEN);
    const token = process.env.MP_ACCESS_TOKEN!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("checkout_orders")
      .select(
        "id, user_id, final_cents, status, plan_id, delivery_email, pix_expires_at, pix_qr_code, pix_qr_code_base64, pix_payment_id, license_plans:plan_id(name)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido não encontrado");
    if (order.user_id !== context.userId) throw new Error("Acesso negado");
    if (order.status === "approved") throw new Error("Pedido já aprovado");
    if (!order.delivery_email) throw new Error("Informe o e-mail antes de gerar o PIX");
    if (!order.final_cents || order.final_cents < 100) throw new Error("Valor inválido");

    // Reaproveita PIX ainda válido para o mesmo pedido.
    const now = Date.now();
    if (
      order.pix_qr_code &&
      order.pix_expires_at &&
      new Date(order.pix_expires_at).getTime() - now > 30_000
    ) {
      return {
        qrCode: order.pix_qr_code,
        qrCodeBase64: order.pix_qr_code_base64,
        expiresAt: order.pix_expires_at,
        paymentId: order.pix_payment_id,
        sandbox: tokenInfo.env === "test",
      };
    }

    const planName: string = (order as any).license_plans?.name ?? "Plano PreçoCerto";
    const expiresAt = new Date(now + 30 * 60_000); // 30 minutos
    const body = {
      transaction_amount: centsToBRL(order.final_cents),
      description: `PreçoCerto — ${planName}`,
      payment_method_id: "pix",
      external_reference: order.id,
      date_of_expiration: expiresAt.toISOString(),
      notification_url: `${PUBLIC_BASE_URL}/api/public/mp-webhook`,
      payer: { email: order.delivery_email },
      metadata: { order_id: order.id, user_id: order.user_id },
    };

    const resp = await fetch(`${MP_API}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": `pix-${order.id}-${Math.floor(now / 60000)}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[MP] pix create failed [${resp.status}]: ${errBody}`);
      throw new Error(`Falha ao gerar PIX (${resp.status})`);
    }

    const payment: any = await resp.json();
    const tx = payment?.point_of_interaction?.transaction_data ?? {};
    const qrCode: string = tx?.qr_code ?? "";
    const qrCodeBase64: string = tx?.qr_code_base64 ?? "";
    const paymentId: string = String(payment?.id ?? "");
    const finalExpires = payment?.date_of_expiration ?? expiresAt.toISOString();

    if (!qrCode) throw new Error("Mercado Pago não retornou o código PIX");

    await supabaseAdmin
      .from("checkout_orders")
      .update({
        pix_qr_code: qrCode,
        pix_qr_code_base64: qrCodeBase64,
        pix_expires_at: finalExpires,
        pix_payment_id: paymentId,
        provider_ref: paymentId,
      })
      .eq("id", order.id);

    return {
      qrCode,
      qrCodeBase64,
      expiresAt: finalExpires,
      paymentId,
      sandbox: tokenInfo.env === "test",
    };
  });

