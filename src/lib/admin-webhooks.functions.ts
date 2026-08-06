import { createServerFn } from "@tanstack/react-start";
import { processMercadoPagoPayment } from "@/lib/mercadopago.server";
import { requireAdmin } from "@/lib/require-admin";

export const listSubscribers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("subscribers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listWebhookEvents = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const reprocessWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { id: string }) => {
    if (!input?.id) throw new Error("id obrigatório");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("webhook_events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Evento não encontrado");
    if (!row.external_id) {
      await supabaseAdmin
        .from("webhook_events")
        .update({ status: "failed", error: "sem external_id" })
        .eq("id", row.id);
      return { status: "failed" as const, reason: "sem external_id" };
    }

    const result = await processMercadoPagoPayment(row.external_id);
    await supabaseAdmin
      .from("webhook_events")
      .update({
        status: result.status,
        error: result.reason ?? null,
        subscriber_id: result.subscriberId ?? null,
        attempts: (row.attempts ?? 0) + 1,
        last_processed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return result;
  });

export const getIntegrationsStatus = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    return {
      mercadoPago: {
        accessTokenConfigured: !!process.env.MP_ACCESS_TOKEN,
        webhookSecretConfigured: !!process.env.MP_WEBHOOK_SECRET,
      },
      email: {
        lovableApiKey: !!process.env.LOVABLE_API_KEY,
      },
    };
  });
