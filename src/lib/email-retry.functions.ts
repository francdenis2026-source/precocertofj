import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin: reenvia manualmente o código de ativação para o mesmo payment_id
 * de um evento de webhook. Usa o e-mail da compra (delivery_email) e o
 * código já emitido em license_codes vinculado à ordem.
 * Atualiza o webhook_events com o novo status de envio.
 */
export const adminResendActivationForWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { webhookEventId: string }) => ({
    webhookEventId: String(data?.webhookEventId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado");
    if (!data.webhookEventId) throw new Error("webhookEventId obrigatório");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendActivationEmail } = await import("@/lib/mercadopago.server");

    const { data: evt, error: evtErr } = await supabaseAdmin
      .from("webhook_events")
      .select("id, external_id, payload")
      .eq("id", data.webhookEventId)
      .maybeSingle();
    if (evtErr || !evt) throw new Error("Evento não encontrado");

    const paymentId = evt.external_id;
    if (!paymentId) throw new Error("Evento sem payment_id");

    // Localiza a ordem pelo provider_ref (payment id do MP)
    const { data: order } = await supabaseAdmin
      .from("checkout_orders")
      .select("id, user_id, plan_id, license_code_id, delivery_email")
      .eq("provider_ref", paymentId)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado para esse pagamento");
    if (!order.license_code_id) throw new Error("Código de licença ainda não emitido");

    const [{ data: plan }, { data: license }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("license_plans")
        .select("name, days")
        .eq("id", order.plan_id)
        .maybeSingle(),
      supabaseAdmin
        .from("license_codes")
        .select("code, expires_at")
        .eq("id", order.license_code_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", order.user_id)
        .maybeSingle(),
    ]);

    const to = order.delivery_email;
    if (!to) throw new Error("Ordem sem e-mail de entrega");
    if (!license?.code) throw new Error("Código de licença ausente");

    const displayName = ((profile?.full_name as string | undefined)?.trim() || "Assinante") as string;
    const planName = (plan?.name as string | undefined) ?? "PreçoCerto";
    const days = (plan?.days as number | undefined) ?? 30;
    const expiresAt =
      (license.expires_at as string | undefined) ??
      new Date(Date.now() + 90 * 86400_000).toISOString();

    const mail = await sendActivationEmail({
      to,
      name: displayName,
      code: license.code,
      planName,
      days,
      expiresAt,
    });

    // Atualiza status no evento
    if (mail.sent) {
      await supabaseAdmin
        .from("webhook_events")
        .update({ error: null, status: "processed" })
        .eq("id", evt.id);
    }

    // Log admin
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: mail.sent ? "resend_activation_email" : "resend_activation_email_failed",
      target_type: "webhook_event",
      target_id: evt.id,
      notes: mail.sent
        ? `Reenviado para ${to} (msg=${mail.messageId ?? "?"})`
        : `Falha ao reenviar para ${to}: ${mail.error ?? "erro"}`,
    });

    // Enfileira retry se falhar
    if (!mail.sent) {
      await supabaseAdmin.from("email_send_queue").insert({
        kind: "activation",
        order_id: order.id,
        license_code_id: order.license_code_id,
        webhook_event_id: evt.id,
        to_email: to,
        payload: { name: displayName, code: license.code, planName, days, expiresAt } as never,
        attempts: 1,
        next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
        last_error: mail.error ?? "erro",
        last_attempt_at: new Date().toISOString(),
      });
    }

    return {
      sent: mail.sent,
      to,
      messageId: mail.messageId ?? null,
      error: mail.error ?? null,
    };
  });

/** Admin: lista itens da fila de reenvio de e-mails com status. */
export const adminListEmailQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("email_send_queue")
      .select(
        "id, kind, order_id, to_email, attempts, max_attempts, status, last_error, next_attempt_at, last_attempt_at, sent_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Usuário: lista suas próprias compras (checkout_orders) com status e código. */
export type MyOrder = {
  id: string;
  status: string;
  plan_name: string | null;
  plan_days: number | null;
  final_cents: number;
  delivery_email: string | null;
  license_code: string | null;
  license_expires_at: string | null;
  approved_at: string | null;
  created_at: string;
  provider_ref: string | null;
  email_delivery: "sent" | "pending" | "failed" | "unknown";
};

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyOrder[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("checkout_orders")
      .select(
        "id, status, final_cents, delivery_email, approved_at, created_at, provider_ref, license_plans:plan_id(name, days), license_codes:license_code_id(code, expires_at)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const orderIds = (data ?? []).map((o) => o.id);
    let queueMap = new Map<string, string>();
    if (orderIds.length > 0) {
      const { data: queue } = await supabaseAdmin
        .from("email_send_queue")
        .select("order_id, status")
        .in("order_id", orderIds);
      for (const q of queue ?? []) {
        if (q.order_id) queueMap.set(q.order_id, q.status);
      }
    }

    return (data ?? []).map((r: any) => {
      const qStatus = queueMap.get(r.id);
      let email_delivery: MyOrder["email_delivery"] = "unknown";
      if (r.status === "approved") {
        if (qStatus === "sent") email_delivery = "sent";
        else if (qStatus === "pending") email_delivery = "pending";
        else if (qStatus === "failed") email_delivery = "failed";
        else email_delivery = "sent"; // sem registro na fila = enviado direto no webhook
      }
      return {
        id: r.id,
        status: r.status,
        plan_name: r.license_plans?.name ?? null,
        plan_days: r.license_plans?.days ?? null,
        final_cents: r.final_cents,
        delivery_email: r.delivery_email,
        license_code: r.license_codes?.code ?? null,
        license_expires_at: r.license_codes?.expires_at ?? null,
        approved_at: r.approved_at,
        created_at: r.created_at,
        provider_ref: r.provider_ref,
        email_delivery,
      };
    });
  });
