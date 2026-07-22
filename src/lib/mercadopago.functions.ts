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

/**
 * Create a Mercado Pago Checkout Pro preference for an existing order
 * and return the init_point URL to redirect the user to.
 */
export const createMercadoPagoPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data, context }) => {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("checkout_orders")
      .select("id, user_id, final_cents, status, plan_id, license_plans:plan_id(name)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido não encontrado");
    if (order.user_id !== context.userId) throw new Error("Acesso negado");
    if (order.status === "approved") throw new Error("Pedido já aprovado");
    if (!order.final_cents || order.final_cents < 100) {
      throw new Error("Valor do pedido inválido");
    }

    // Load user email for MP payer
    const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const payerEmail = userInfo?.user?.email ?? undefined;

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

    const isSandbox = token.startsWith("TEST-");
    const redirectUrl = isSandbox ? pref.sandbox_init_point : pref.init_point;

    await supabaseAdmin
      .from("checkout_orders")
      .update({ provider_ref: pref.id })
      .eq("id", order.id);

    return { url: redirectUrl, preferenceId: pref.id, sandbox: isSandbox };
  });
