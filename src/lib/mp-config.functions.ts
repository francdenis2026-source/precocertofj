/**
 * Mercado Pago — configuração armazenada em `integrations` (id='mercadopago').
 * Editável somente por admin. Os valores sensíveis (access_token, webhook_secret)
 * são nunca retornados ao cliente em texto claro — retornamos apenas máscara.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const INTEGRATION_ID = "mercadopago";

export type MpConfigPublic = {
  hasAccessToken: boolean;
  accessTokenMasked: string | null;
  hasWebhookSecret: boolean;
  webhookSecretMasked: string | null;
  publicKey: string | null;
  environment: "sandbox" | "production";
  pixEnabled: boolean;
  pixOnly: boolean;
  updatedAt: string | null;
};

function mask(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Acesso negado", { status: 403 });
}

export const getMpConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MpConfigPublic> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("integrations")
      .select("config, updated_at")
      .eq("id", INTEGRATION_ID)
      .maybeSingle();

    const cfg = (data?.config ?? {}) as Record<string, unknown>;
    const accessToken = (cfg.access_token as string | undefined) ?? "";
    const webhookSecret = (cfg.webhook_secret as string | undefined) ?? "";
    return {
      hasAccessToken: !!accessToken,
      accessTokenMasked: mask(accessToken),
      hasWebhookSecret: !!webhookSecret,
      webhookSecretMasked: mask(webhookSecret),
      publicKey: (cfg.public_key as string | undefined) ?? null,
      environment: (cfg.environment as "sandbox" | "production" | undefined) ?? "production",
      pixEnabled: cfg.pix_enabled !== false,
      pixOnly: cfg.pix_only === true,
      updatedAt: data?.updated_at ?? null,
    };
  });

export const saveMpConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      accessToken?: string;
      webhookSecret?: string;
      publicKey?: string;
      environment?: "sandbox" | "production";
      pixEnabled?: boolean;
      pixOnly?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("id", INTEGRATION_ID)
      .maybeSingle();

    const cfg = { ...((current?.config ?? {}) as Record<string, unknown>) };

    // Empty string means "no change" for secrets so the admin can toggle
    // flags without re-typing the token. Explicit "-" clears the value.
    if (data.accessToken !== undefined) {
      const v = data.accessToken.trim();
      if (v === "-") delete cfg.access_token;
      else if (v.length > 0) cfg.access_token = v;
    }
    if (data.webhookSecret !== undefined) {
      const v = data.webhookSecret.trim();
      if (v === "-") delete cfg.webhook_secret;
      else if (v.length > 0) cfg.webhook_secret = v;
    }
    if (data.publicKey !== undefined) cfg.public_key = data.publicKey.trim() || null;
    if (data.environment) cfg.environment = data.environment;
    if (data.pixEnabled !== undefined) cfg.pix_enabled = data.pixEnabled;
    if (data.pixOnly !== undefined) cfg.pix_only = data.pixOnly;

    const { error } = await supabaseAdmin
      .from("integrations")
      .upsert({
        id: INTEGRATION_ID,
        config: cfg as never,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testMpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; account?: string; error?: string }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("integrations").select("config").eq("id", INTEGRATION_ID).maybeSingle();
    const token =
      ((data?.config ?? {}) as Record<string, unknown>).access_token as string | undefined;
    const accessToken = token || process.env.MP_ACCESS_TOKEN;
    if (!accessToken) return { ok: false, error: "Token não configurado" };

    try {
      const res = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const info = (await res.json()) as { nickname?: string; email?: string; id?: number };
      return { ok: true, account: info.nickname || info.email || `#${info.id ?? "?"}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "erro" };
    }
  });
