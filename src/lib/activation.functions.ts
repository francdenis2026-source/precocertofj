import { createServerFn } from "@tanstack/react-start";
import { sendLovableEmail, EmailAPIError } from "@lovable.dev/email-js";
import { requireAdmin } from "@/lib/require-admin";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const seg = () =>
    Array.from({ length: 4 }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join("");
  return `PC-${seg()}-${seg()}-${seg()}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildEmailHtml(params: {
  name: string;
  code: string;
  expiresAt: string;
  planName: string;
  days: number;
  isTrial: boolean;
}): { html: string; text: string; subject: string } {
  const expires = new Date(params.expiresAt).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const subject = params.isTrial
    ? `🎁 Seu acesso gratuito ao PreçoCerto foi ativado`
    : `✅ Assinatura PreçoCerto — ${params.planName} confirmada`;

  const html = `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#0A1628;padding:24px">
  <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
    <h1 style="margin:0 0 8px;font-size:22px">Olá, ${escapeHtml(params.name)}!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">
      ${
        params.isTrial
          ? `Seu <strong>teste gratuito de ${params.days} dias</strong> foi ativado com sucesso.`
          : `Recebemos sua assinatura do plano <strong>${escapeHtml(params.planName)}</strong> (${params.days} dias) e ela já está ativa.`
      }
    </p>
    <div style="background:#0A1628;color:#fff;border-radius:10px;padding:20px;text-align:center;margin:20px 0">
      <div style="font-size:12px;opacity:.7;letter-spacing:2px">CÓDIGO DE ATIVAÇÃO</div>
      <div style="font-size:26px;font-weight:700;letter-spacing:3px;margin-top:8px;font-family:'Courier New',monospace">${escapeHtml(params.code)}</div>
    </div>
    <p style="margin:0 0 8px;font-size:14px">Válido até: <strong>${escapeHtml(expires)}</strong></p>
    <ol style="font-size:14px;line-height:1.6;padding-left:20px">
      <li>Abra o app do PreçoCerto</li>
      <li>Faça login com este e-mail</li>
      <li>Insira o código em <strong>Perfil → Assinatura</strong></li>
    </ol>
    <p style="font-size:12px;color:#6b7280;margin-top:24px">
      Se você não solicitou este código, ignore este e-mail. — Equipe PreçoCerto
    </p>
  </div>
</body></html>`;

  const text = [
    `Olá, ${params.name}!`,
    "",
    params.isTrial
      ? `Seu teste gratuito de ${params.days} dias foi ativado.`
      : `Assinatura do plano ${params.planName} (${params.days} dias) confirmada.`,
    "",
    `Código de ativação: ${params.code}`,
    `Válido até: ${expires}`,
    "",
    "Como usar:",
    "1. Abra o app do PreçoCerto",
    "2. Faça login com este e-mail",
    "3. Insira o código em Perfil → Assinatura",
    "",
    "— Equipe PreçoCerto",
  ].join("\n");

  return { html, text, subject };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}

export const issueActivationCode = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    (input: {
      email: string;
      name: string;
      planId: string;
      planName: string;
      days: number;
      isTrial?: boolean;
      subscriptionId?: string;
      fromEmail?: string;
      fromName?: string;
    }) => {
      if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        throw new Error("E-mail inválido");
      }
      if (!input.name || input.name.length < 2) throw new Error("Nome inválido");
      if (!input.planId) throw new Error("Plano obrigatório");
      if (!input.days || input.days < 1) throw new Error("Duração inválida");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const code = generateCode();
    const email = normalizeEmail(data.email);
    // Activation code itself expires in 24h (user must enter it soon).
    // The subscription runtime (days) is what admin tracks separately.
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("activation_codes")
      .insert({
        email,
        code,
        plan_id: data.planId,
        subscription_id: data.subscriptionId ?? null,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Failed to store activation code:", insertError);
      throw new Error("Falha ao registrar o código no banco");
    }

    const { html, text, subject } = buildEmailHtml({
      name: data.name,
      code,
      expiresAt,
      planName: data.planName,
      days: data.days,
      isTrial: !!data.isTrial,
    });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        code,
        sent: false,
        error: "LOVABLE_API_KEY não configurada. Código salvo mas e-mail não enviado.",
        expiresAt,
      };
    }

    const fromEmail = data.fromEmail || "no-reply@precocerto.app";
    const fromName = data.fromName || "PreçoCerto";

    try {
      const response = await sendLovableEmail(
        {
          to: email,
          from: `${fromName} <${fromEmail}>`,
          subject,
          html,
          text,
          idempotency_key: `activation-${code}`,
          label: "activation",
        },
        { apiKey },
      );

      return {
        code,
        sent: !!response.success,
        messageId: response.message_id,
        expiresAt,
      };
    } catch (err) {
      const message =
        err instanceof EmailAPIError
          ? `${err.message} (${err.code ?? err.status ?? "erro"})`
          : err instanceof Error
            ? err.message
            : "Erro desconhecido no envio";
      console.error("sendLovableEmail failed:", err);
      return {
        code,
        sent: false,
        error: message,
        expiresAt,
      };
    }
  });

export const verifyActivationCode = createServerFn({ method: "POST" })
  .validator((input: { email: string; code: string }) => {
    if (!input.email || !input.code) throw new Error("E-mail e código são obrigatórios");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = normalizeEmail(data.email);
    const code = data.code.trim().toUpperCase();

    const { data: row, error } = await supabaseAdmin
      .from("activation_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("verifyActivationCode lookup error:", error);
      return { valid: false, reason: "lookup_error" as const };
    }

    if (!row) {
      return { valid: false, reason: "not_found" as const };
    }

    if (row.used_at) {
      return { valid: false, reason: "already_used" as const, usedAt: row.used_at };
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { valid: false, reason: "expired" as const, expiresAt: row.expires_at };
    }

    const { error: updateError } = await supabaseAdmin
      .from("activation_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    if (updateError) {
      console.error("verifyActivationCode update error:", updateError);
      return { valid: false, reason: "update_error" as const };
    }

    return {
      valid: true,
      planId: row.plan_id,
      subscriptionId: row.subscription_id,
      email: row.email,
    };
  });
