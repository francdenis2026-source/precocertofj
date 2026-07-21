/**
 * Mercado Pago — server-only helpers.
 * Never import from client-reachable modules at module scope
 * unless inside a server function handler with `await import(...)`.
 */
import { sendLovableEmail, EmailAPIError } from "@lovable.dev/email-js";
import { createHmac, timingSafeEqual } from "crypto";
import { getMpCredentials } from "@/lib/mp-credentials.server";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  const seg = () =>
    Array.from({ length: 4 }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join("");
  return `PC-${seg()}-${seg()}-${seg()}`;
}

/**
 * Verify Mercado Pago webhook signature per official spec:
 *   header x-signature: "ts=1704908010,v1=abc..."
 *   manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *   HMAC-SHA256 with the webhook secret configured in MP dashboard.
 */
export function verifyMercadoPagoSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  if (!params.signatureHeader || !params.requestId || !params.dataId || !params.secret) {
    return false;
  }
  const parts = params.signatureHeader.split(",").reduce<Record<string, string>>((acc, kv) => {
    const [k, v] = kv.split("=").map((x) => x.trim());
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${params.dataId};request-id:${params.requestId};ts:${ts};`;
  const expected = createHmac("sha256", params.secret).update(manifest).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface MpPayment {
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  external_reference?: string | null;
  payer?: { email?: string; first_name?: string; last_name?: string };
  metadata?: Record<string, unknown>;
  date_approved?: string | null;
}

export async function fetchMpPayment(
  paymentId: string,
  accessToken: string,
): Promise<MpPayment> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar pagamento no Mercado Pago (${res.status})`);
  }
  return (await res.json()) as MpPayment;
}

/** Send activation email via Lovable email; never throws — returns status. */
async function sendActivationEmail(params: {
  to: string;
  name: string;
  code: string;
  planName: string;
  days: number;
  expiresAt: string;
}): Promise<{ sent: boolean; error?: string; messageId?: string }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { sent: false, error: "LOVABLE_API_KEY ausente" };

  const expires = new Date(params.expiresAt).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const subject = `✅ Assinatura PreçoCerto — ${params.planName} confirmada`;
  const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#fff;color:#0A1628;padding:24px">
  <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
    <h1 style="margin:0 0 8px;font-size:22px">Olá, ${escapeHtml(params.name)}!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">
      Pagamento confirmado. Sua assinatura <strong>${escapeHtml(params.planName)}</strong>
      (${params.days} dias) está ativa.
    </p>
    <div style="background:#0A1628;color:#fff;border-radius:10px;padding:20px;text-align:center;margin:20px 0">
      <div style="font-size:12px;opacity:.7;letter-spacing:2px">CÓDIGO DE ATIVAÇÃO</div>
      <div style="font-size:26px;font-weight:700;letter-spacing:3px;margin-top:8px;font-family:'Courier New',monospace">${escapeHtml(params.code)}</div>
    </div>
    <p style="margin:0 0 8px;font-size:14px">Válido até: <strong>${escapeHtml(expires)}</strong></p>
    <p style="font-size:12px;color:#6b7280;margin-top:24px">— Equipe PreçoCerto</p>
  </div>
</body></html>`;
  const text = `Olá, ${params.name}!\nPagamento confirmado. Plano ${params.planName} (${params.days} dias) ativo.\nCódigo: ${params.code}\nVálido até: ${expires}\n— PreçoCerto`;

  try {
    const response = await sendLovableEmail(
      {
        to: params.to,
        from: `PreçoCerto <no-reply@precocerto.app>`,
        subject,
        html,
        text,
        idempotency_key: `mp-activation-${params.code}`,
        label: "activation",
      },
      { apiKey },
    );
    return { sent: !!response.success, messageId: response.message_id };
  } catch (err) {
    const message =
      err instanceof EmailAPIError
        ? `${err.message} (${err.code ?? err.status ?? "erro"})`
        : err instanceof Error
          ? err.message
          : "Erro no envio";
    return { sent: false, error: message };
  }
}

/** Send a subscription receipt email; never throws — returns status. */
async function sendReceiptEmail(params: {
  to: string;
  name: string;
  planName: string;
  planDays: number;
  amount: number | null;
  paidAt: string;
  newPaidUntil: string;
  paymentId: string;
  receiptUrl: string;
}): Promise<{ sent: boolean; error?: string; messageId?: string }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { sent: false, error: "LOVABLE_API_KEY ausente" };

  const validUntil = new Date(params.newPaidUntil).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const paidAtFmt = new Date(params.paidAt).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const amountFmt =
    params.amount == null
      ? "—"
      : params.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const subject = `Recibo — Assinatura PreçoCerto (${params.planName})`;
  const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#fff;color:#0A1628;padding:24px">
  <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
    <p style="font-size:11px;letter-spacing:2px;color:#6b7280;margin:0 0 4px">PREÇOCERTO · RECIBO</p>
    <h1 style="margin:0 0 8px;font-size:22px">Pagamento confirmado</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">
      Olá, ${escapeHtml(params.name)}! Recebemos seu pagamento e ativamos sua assinatura.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <tr><td style="padding:6px 0;color:#6b7280">Plano</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(params.planName)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Duração</td><td style="padding:6px 0;text-align:right">${params.planDays} dias</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Valor pago</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(amountFmt)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Data do pagamento</td><td style="padding:6px 0;text-align:right">${escapeHtml(paidAtFmt)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Válido até</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(validUntil)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">ID do pagamento</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px">${escapeHtml(params.paymentId)}</td></tr>
    </table>
    <div style="text-align:center;margin:22px 0 8px">
      <a href="${escapeHtml(params.receiptUrl)}" style="display:inline-block;background:#0A1628;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px">Ver comprovante completo</a>
    </div>
    <p style="font-size:12px;color:#6b7280;margin-top:24px;line-height:1.6">
      Não há renovação automática. Ao fim do período, seu acesso volta para o modo gratuito,
      preservando histórico e cestas salvas.
    </p>
    <p style="font-size:12px;color:#6b7280;margin-top:8px">— Equipe PreçoCerto</p>
  </div>
</body></html>`;
  const text = `Pagamento confirmado.\nPlano: ${params.planName} (${params.planDays} dias)\nValor: ${amountFmt}\nData: ${paidAtFmt}\nVálido até: ${validUntil}\nID: ${params.paymentId}\nComprovante: ${params.receiptUrl}\n— PreçoCerto`;

  try {
    const response = await sendLovableEmail(
      {
        to: params.to,
        from: `PreçoCerto <no-reply@precocerto.app>`,
        subject,
        html,
        text,
        idempotency_key: `mp-receipt-${params.paymentId}`,
        label: "receipt",
      },
      { apiKey },
    );
    return { sent: !!response.success, messageId: response.message_id };
  } catch (err) {
    const message =
      err instanceof EmailAPIError
        ? `${err.message} (${err.code ?? err.status ?? "erro"})`
        : err instanceof Error
          ? err.message
          : "Erro no envio";
    return { sent: false, error: message };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

/**
 * Process a Mercado Pago payment: fetch it, upsert subscriber,
 * generate activation code, send email, and return a summary.
 * Idempotent by payment_id.
 */
export async function processMercadoPagoPayment(paymentId: string): Promise<{
  status: "processed" | "skipped" | "failed";
  subscriberId?: string;
  reason?: string;
}> {
  const creds = await getMpCredentials();
  const accessToken = creds.accessToken;
  if (!accessToken) {
    return { status: "failed", reason: "MP_ACCESS_TOKEN ausente" };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let payment: MpPayment;
  try {
    payment = await fetchMpPayment(paymentId, accessToken);
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : "fetch_error" };
  }

  if (payment.status !== "approved") {
    return { status: "skipped", reason: `status=${payment.status}` };
  }

  // -------------------------------------------------------------------------
  // License purchase flow: external_reference = "license:<uuid>"
  // Marca license_codes como paid, aplica ao paid_until do comprador.
  // -------------------------------------------------------------------------
  const extRef = payment.external_reference ?? "";
  if (extRef.startsWith("license:")) {
    const licenseId = extRef.slice("license:".length);
    const { data: applied, error: aErr } = await supabaseAdmin
      .rpc("apply_paid_license", { _license_id: licenseId, _mp_payment_id: String(payment.id) });
    if (aErr) return { status: "failed", reason: aErr.message };
    const row = Array.isArray(applied) ? applied[0] : applied;
    if (!row?.success) return { status: "failed", reason: "não foi possível aplicar licença" };
    return { status: "processed", subscriberId: licenseId };
  }

  // -------------------------------------------------------------------------
  // Legacy subscription flow: external_reference = "profile:<uuid>"
  // -------------------------------------------------------------------------
  if (extRef.startsWith("profile:")) {
    const profileId = extRef.slice("profile:".length);
    const { data: prof } = await supabaseAdmin
      .from("profiles" as never)
      .select("id, paid_until")
      .eq("id", profileId)
      .maybeSingle();
    if (!prof) {
      return { status: "failed", reason: "profile não encontrado" };
    }
    const { computeNewPaidUntil } = await import("@/lib/subscription-billing");
    const meta = (payment.metadata ?? {}) as Record<string, unknown>;
    const { newPaidUntilIso: newPaidUntil } = computeNewPaidUntil({
      currentPaidUntil: (prof as { paid_until: string | null }).paid_until,
      planDays: meta["plan_days"],
    });
    const table = supabaseAdmin.from("profiles" as never) as unknown as {
      update: (v: { paid_until: string }) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error: upErr } = await table
      .update({ paid_until: newPaidUntil })
      .eq("id", profileId);
    if (upErr) return { status: "failed", reason: upErr.message };

    // Persist a receipt for the user to download from /assinatura.
    try {
      const planIdMeta = (meta["plan_id"] as string | undefined) ?? null;
      let planName: string | null = null;
      if (planIdMeta) {
        const { data: plan } = await supabaseAdmin
          .from("plans")
          .select("name")
          .eq("id", planIdMeta)
          .maybeSingle();
        planName = (plan?.name as string | undefined) ?? null;
      }
      const planDaysNum = Math.max(1, Number(meta["plan_days"] ?? 30) || 30);
      const payerName = [payment.payer?.first_name, payment.payer?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || null;
      await supabaseAdmin
        .from("payment_receipts" as never)
        .upsert(
          {
            profile_id: profileId,
            payment_id: String(payment.id),
            external_ref: payment.external_reference ?? null,
            plan_id: planIdMeta,
            plan_name: planName,
            plan_days: planDaysNum,
            amount: payment.transaction_amount ?? null,
            currency: "BRL",
            status: "approved",
            paid_at: payment.date_approved ?? new Date().toISOString(),
            new_paid_until: newPaidUntil,
            payer_email: payment.payer?.email ?? null,
            payer_name: payerName,
          } as never,
          { onConflict: "payment_id" } as never,
        );

      // Best-effort receipt email. Never fail the webhook on email errors.
      try {
        const { data: profRow } = await supabaseAdmin
          .from("profiles")
          .select("full_name, phone")
          .eq("id", profileId)
          .maybeSingle();
        const to = payment.payer?.email ?? null;
        const displayName =
          ((profRow?.full_name as string | undefined)?.trim() ||
            payerName ||
            "Assinante") as string;
        const receiptRow = (await supabaseAdmin
          .from("payment_receipts" as never)
          .select("id")
          .eq("payment_id", String(payment.id))
          .maybeSingle()) as { data: { id: string } | null };
        const baseUrl =
          process.env.PUBLIC_APP_URL ??
          process.env.APP_URL ??
          "https://precocerto-fj.lovable.app";
        const receiptUrl = receiptRow.data?.id
          ? `${baseUrl}/comprovante/${receiptRow.data.id}`
          : `${baseUrl}/assinatura`;
        if (to) {
          const emailRes = await sendReceiptEmail({
            to,
            name: displayName,
            planName: planName ?? "Assinatura PreçoCerto",
            planDays: planDaysNum,
            amount: payment.transaction_amount ?? null,
            paidAt: payment.date_approved ?? new Date().toISOString(),
            newPaidUntil,
            paymentId: String(payment.id),
            receiptUrl,
          });
          if (!emailRes.sent) {
            console.warn("[mp] receipt email not sent:", emailRes.error);
          }
        }
      } catch (e) {
        console.error("[mp] receipt email failed", e);
      }
    } catch (e) {
      console.error("[mp] receipt upsert failed", e);
    }

    return { status: "processed" };
  }

  const meta = (payment.metadata ?? {}) as Record<string, unknown>;
  const planId =
    (meta["plan_id"] as string | undefined) ||
    (payment.external_reference?.startsWith("plan:")
      ? payment.external_reference.slice(5)
      : payment.external_reference || undefined);
  const email = (meta["email"] as string | undefined) || payment.payer?.email;
  const name =
    (meta["name"] as string | undefined) ||
    [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(" ").trim() ||
    email ||
    "Assinante";

  if (!email || !planId) {
    return { status: "failed", reason: "email/plan_id ausentes no pagamento" };
  }

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("id,name,days")
    .eq("id", planId)
    .maybeSingle();

  const days = plan?.days ?? 30;
  const planName = plan?.name ?? planId;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const code = generateCode();

  // Upsert subscriber by payment_id (idempotent)
  const { data: existing } = await supabaseAdmin
    .from("subscribers")
    .select("id,email_sent,status")
    .eq("payment_id", String(payment.id))
    .maybeSingle();

  let subscriberId: string;
  if (existing) {
    subscriberId = existing.id;
    const { error } = await supabaseAdmin
      .from("subscribers")
      .update({
        status: "active",
        expires_at: expiresAt,
        plan_id: planId,
        name,
        email: email.toLowerCase(),
      })
      .eq("id", subscriberId);
    if (error) return { status: "failed", reason: error.message };

    if (existing.status === "active") {
      return { status: "skipped", reason: "já processado", subscriberId };
    }
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("subscribers")
      .insert({
        name,
        email: email.toLowerCase(),
        plan_id: planId,
        status: "active",
        activation_code: code,
        started_at: now.toISOString(),
        expires_at: expiresAt,
        email_sent: false,
        payment_id: String(payment.id),
        external_ref: payment.external_reference ?? null,
      })
      .select("id")
      .single();
    if (error || !inserted) return { status: "failed", reason: error?.message ?? "insert" };
    subscriberId = inserted.id;
  }

  // Register activation code
  await supabaseAdmin.from("activation_codes").insert({
    email: email.toLowerCase(),
    code,
    plan_id: planId,
    subscription_id: subscriberId,
    expires_at: expiresAt,
  });

  // Send email
  const mail = await sendActivationEmail({
    to: email,
    name,
    code,
    planName,
    days,
    expiresAt,
  });

  await supabaseAdmin
    .from("subscribers")
    .update({ email_sent: mail.sent, activation_code: code })
    .eq("id", subscriberId);

  if (!mail.sent) {
    return { status: "failed", reason: mail.error ?? "email não enviado", subscriberId };
  }
  return { status: "processed", subscriberId };
}
