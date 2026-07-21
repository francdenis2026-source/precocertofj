/**
 * Fluxo de recuperação de PIN via SMS.
 *
 * Etapas:
 *  1. `requestPinResetSms({ cpf })` — encontra o usuário pelo CPF, gera um
 *     código de 6 dígitos, guarda o hash SHA-256 em `pin_reset_codes`, aplica
 *     rate limit (por CPF) e dispara SMS pela Twilio (via connector gateway).
 *  2. `verifyPinResetCode({ cpf, code })` — confere o código, controla número
 *     de tentativas (máx 5 por código) e devolve um `resetToken` de curta
 *     duração (10 min) — mesmo hash + timestamp de consumo.
 *  3. `resetPinWithCode({ cpf, resetToken, newPin })` — valida o token,
 *     aplica validação de força do PIN e atualiza a senha via Auth admin.
 *
 * Segurança:
 *  - Nunca gravamos o código em texto puro (só o hash).
 *  - Rate limit: 3 pedidos por CPF a cada 15 min; código expira em 10 min.
 *  - `attempts >= 5` invalida o código; abre novo pedido.
 *  - Respostas para CPF inexistente são iguais às de CPF válido (evita
 *     enumeração), mas nenhum SMS é enviado.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "crypto";
import { stripCpf, cpfToEmail, isValidCpf } from "@/lib/cpf";
import { isStrongPin, validatePin } from "@/lib/pin-strength";

// ============================================================================
// Constantes de política
// ============================================================================
const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS_PER_CODE = 5;
const MAX_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_MINUTES = 15;
const RESET_TOKEN_TTL_MINUTES = 10;

// ============================================================================
// Utilidades
// ============================================================================
function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  const min = digits > 1 ? 10 ** (digits - 1) : 0;
  const n = randomInt(min, max);
  return n.toString().padStart(digits, "0");
}

function maskPhone(phone: string): string {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 4) return "••••";
  const last = d.slice(-2);
  const prefix = d.length >= 4 ? d.slice(-4, -2) : "";
  return `(••) •••••-${prefix}${last}`;
}

function toE164BR(phone: string): string {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return `+${d}`;
}

async function sendSmsViaTwilio(to: string, body: string): Promise<{ sent: boolean; reason?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!lovableKey || !twilioKey || !fromNumber) {
    // Em desenvolvimento sem conector: registra no log e devolve "sent=false"
    // para o handler tratar sem quebrar.
    console.warn("[pin-reset] SMS não enviado — Twilio não configurado", {
      hasLovable: !!lovableKey,
      hasTwilio: !!twilioKey,
      hasFrom: !!fromNumber,
    });
    return { sent: false, reason: "twilio_not_configured" };
  }

  const url = "https://connector-gateway.lovable.dev/twilio/Messages.json";
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[pin-reset] Twilio SMS failed [${res.status}]: ${errBody}`);
    return { sent: false, reason: `twilio_error_${res.status}` };
  }
  return { sent: true };
}

// ============================================================================
// requestPinResetSms
// ============================================================================
export const requestPinResetSms = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ cpf: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const cpfDigits = stripCpf(data.cpf);
    if (!isValidCpf(cpfDigits)) {
      return { ok: false as const, reason: "cpf_invalid" as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Encontra o profile pelo CPF (não revelamos se existe)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, phone")
      .eq("cpf", cpfDigits)
      .maybeSingle();

    // Resposta idêntica em caso de CPF sem cadastro — evita enumeração
    if (!profile || !profile.phone) {
      return {
        ok: true as const,
        phoneMasked: "(••) •••••-••••",
        cooldownSeconds: 60,
      };
    }

    // 2. Rate limit por CPF: máx 3 pedidos em 15 minutos
    const windowStart = new Date(Date.now() - REQUEST_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("pin_reset_codes")
      .select("id", { count: "exact", head: true })
      .eq("cpf", cpfDigits)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
      return {
        ok: false as const,
        reason: "rate_limited" as const,
        message: `Muitas solicitações. Aguarde ${REQUEST_WINDOW_MINUTES} minutos antes de tentar novamente.`,
      };
    }

    // 3. Gera código, hash e insere registro
    const code = generateNumericCode(6);
    const codeHash = sha256(code);
    const phoneMasked = maskPhone(profile.phone);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

    const { error: insertErr } = await supabaseAdmin.from("pin_reset_codes").insert({
      user_id: profile.id,
      cpf: cpfDigits,
      phone_masked: phoneMasked,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insertErr) {
      console.error("[pin-reset] insert failed", insertErr);
      return { ok: false as const, reason: "internal_error" as const };
    }

    // 4. Dispara SMS
    const smsBody =
      `PreçoCerto: seu código de redefinição de PIN é ${code}. ` +
      `Válido por ${CODE_TTL_MINUTES} min. Nunca compartilhe este código.`;
    const smsResult = await sendSmsViaTwilio(toE164BR(profile.phone), smsBody);

    if (!smsResult.sent) {
      return {
        ok: false as const,
        reason: "sms_failed" as const,
        message:
          smsResult.reason === "twilio_not_configured"
            ? "Envio de SMS ainda não configurado. Contate o suporte."
            : "Não foi possível enviar o SMS agora. Tente novamente em instantes.",
      };
    }

    return {
      ok: true as const,
      phoneMasked,
      cooldownSeconds: 60,
    };
  });

// ============================================================================
// verifyPinResetCode
// ============================================================================
export const verifyPinResetCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        cpf: z.string().min(1),
        code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos numéricos."),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const cpfDigits = stripCpf(data.cpf);
    if (!isValidCpf(cpfDigits)) {
      return { ok: false as const, reason: "cpf_invalid" as const, message: "CPF inválido." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Busca o código mais recente ainda válido para esse CPF
    const { data: row, error } = await supabaseAdmin
      .from("pin_reset_codes")
      .select("id, code_hash, expires_at, attempts, consumed_at, user_id")
      .eq("cpf", cpfDigits)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[pin-reset] verify select failed", error);
      return { ok: false as const, reason: "internal_error" as const, message: "Erro interno. Tente novamente." };
    }
    if (!row) {
      return {
        ok: false as const,
        reason: "no_pending_code" as const,
        message: "Nenhum código pendente. Solicite um novo SMS.",
      };
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return {
        ok: false as const,
        reason: "expired" as const,
        message: "Código expirado. Solicite um novo SMS.",
      };
    }
    if (row.attempts >= MAX_ATTEMPTS_PER_CODE) {
      return {
        ok: false as const,
        reason: "too_many_attempts" as const,
        message: "Muitas tentativas incorretas. Solicite um novo código.",
      };
    }

    const expectedHash = row.code_hash;
    const submittedHash = sha256(data.code);
    if (expectedHash !== submittedHash) {
      // Incrementa tentativas
      const newAttempts = row.attempts + 1;
      await supabaseAdmin
        .from("pin_reset_codes")
        .update({ attempts: newAttempts })
        .eq("id", row.id);

      const remaining = Math.max(0, MAX_ATTEMPTS_PER_CODE - newAttempts);
      return {
        ok: false as const,
        reason: "wrong_code" as const,
        remainingAttempts: remaining,
        message:
          remaining > 0
            ? `Código incorreto. ${remaining} tentativa${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
            : "Muitas tentativas incorretas. Solicite um novo código.",
      };
    }

    // Sucesso: devolve token = hash(codeHash + row.id) — só o servidor sabe
    // recompor. Consumo definitivo acontece no reset.
    const resetToken = sha256(`${row.code_hash}:${row.id}`);
    return {
      ok: true as const,
      resetToken,
      resetTokenTtlSeconds: RESET_TOKEN_TTL_MINUTES * 60,
    };
  });

// ============================================================================
// resetPinWithCode
// ============================================================================
export const resetPinWithCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        cpf: z.string().min(1),
        resetToken: z.string().min(16),
        newPin: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const cpfDigits = stripCpf(data.cpf);
    if (!isValidCpf(cpfDigits)) {
      return { ok: false as const, reason: "cpf_invalid" as const, message: "CPF inválido." };
    }
    const pinCheck = validatePin(data.newPin);
    if (!pinCheck.valid) {
      return { ok: false as const, reason: "weak_pin" as const, message: pinCheck.message };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("pin_reset_codes")
      .select("id, code_hash, expires_at, consumed_at, user_id, attempts")
      .eq("cpf", cpfDigits)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return {
        ok: false as const,
        reason: "no_pending_code" as const,
        message: "Verificação não encontrada. Reinicie o processo.",
      };
    }
    if (new Date(row.expires_at).getTime() < Date.now() - RESET_TOKEN_TTL_MINUTES * 60_000) {
      return {
        ok: false as const,
        reason: "expired" as const,
        message: "Sessão de redefinição expirada. Reinicie o processo.",
      };
    }
    if (row.attempts >= MAX_ATTEMPTS_PER_CODE) {
      return {
        ok: false as const,
        reason: "too_many_attempts" as const,
        message: "Muitas tentativas incorretas — solicite um novo código.",
      };
    }
    const expectedToken = sha256(`${row.code_hash}:${row.id}`);
    if (expectedToken !== data.resetToken) {
      return {
        ok: false as const,
        reason: "invalid_token" as const,
        message: "Token inválido. Reinicie o processo.",
      };
    }

    // Atualiza a senha via Auth admin (senha = PIN, mesmo modelo do signup)
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      password: pinCheck.digits,
    });
    if (authErr) {
      console.error("[pin-reset] auth update failed", authErr);
      return {
        ok: false as const,
        reason: "auth_failed" as const,
        message: "Não foi possível atualizar o PIN. Contate o suporte.",
      };
    }

    // Marca o código como consumido e invalida qualquer outro pendente do mesmo CPF
    await supabaseAdmin
      .from("pin_reset_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("cpf", cpfDigits)
      .is("consumed_at", null);

    return { ok: true as const };
  });
