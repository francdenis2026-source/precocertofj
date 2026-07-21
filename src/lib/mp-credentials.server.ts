/**
 * Server-only: lê as credenciais do Mercado Pago primeiro da tabela
 * `integrations` (id='mercadopago'), com fallback para variáveis de ambiente.
 * NUNCA importar de módulos client-reachable no topo — sempre dentro de handlers.
 */
export type MpCredentials = {
  accessToken: string | null;
  webhookSecret: string | null;
  publicKey: string | null;
  environment: "sandbox" | "production";
  pixEnabled: boolean;
  pixOnly: boolean;
};

export async function getMpCredentials(): Promise<MpCredentials> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("integrations")
    .select("config")
    .eq("id", "mercadopago")
    .maybeSingle();
  const cfg = (data?.config ?? {}) as Record<string, unknown>;
  const dbToken = (cfg.access_token as string | undefined) || null;
  const dbSecret = (cfg.webhook_secret as string | undefined) || null;

  return {
    accessToken: dbToken || process.env.MP_ACCESS_TOKEN || null,
    webhookSecret: dbSecret || process.env.MP_WEBHOOK_SECRET || null,
    publicKey: (cfg.public_key as string | undefined) || null,
    environment:
      (cfg.environment as "sandbox" | "production" | undefined) ?? "production",
    pixEnabled: cfg.pix_enabled !== false,
    pixOnly: cfg.pix_only === true,
  };
}
