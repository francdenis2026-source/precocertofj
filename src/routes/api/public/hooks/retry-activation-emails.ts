import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron endpoint: processes public.email_send_queue with exponential backoff.
 *
 * Backoff schedule (seconds): 60, 300, 900, 3600, 21600
 * When attempts reach max_attempts, status = 'failed' (permanent).
 *
 * pg_cron chama this endpoint every minute; each call processes up to 25
 * itens due (`next_attempt_at <= now()` AND status='pending').
 */
const BACKOFF_SECONDS = [60, 300, 900, 3600, 21600];

export const Route = createFileRoute("/api/public/hooks/retry-activation-emails")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const header = request.headers.get("x-cron-secret") ?? request.headers.get("x-collab-secret");
        const token = header || url.searchParams.get("token");
        const secret = process.env.CRON_SECRET ?? process.env.COLLAB_INBOUND_SECRET;
        if (!secret) return new Response("not configured", { status: 500 });
        if (!token || token !== secret) return new Response("unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendActivationEmail } = await import("@/lib/mercadopago.server");



        const { data: due, error } = await supabaseAdmin
          .from("email_send_queue")
          .select(
            "id, order_id, license_code_id, webhook_event_id, to_email, payload, attempts, max_attempts",
          )
          .eq("status", "pending")
          .lte("next_attempt_at", new Date().toISOString())
          .order("next_attempt_at", { ascending: true })
          .limit(25);

        if (error) {
          console.error("[retry-emails] fetch error:", error.message);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        let sent = 0;
        let failed = 0;
        let dead = 0;

        for (const job of due ?? []) {
          const attemptsNext = (job.attempts ?? 0) + 1;
          const payload = (job.payload ?? {}) as Record<string, unknown>;
          const nowIso = new Date().toISOString();

          const result = await sendActivationEmail({
            to: job.to_email,
            name: String(payload.name ?? "Assinante"),
            code: String(payload.code ?? ""),
            planName: String(payload.planName ?? "PreçoCerto"),
            days: Number(payload.days ?? 30),
            expiresAt: String(payload.expiresAt ?? new Date(Date.now() + 90 * 86400_000).toISOString()),
          });

          if (result.sent) {
            sent++;
            await supabaseAdmin
              .from("email_send_queue")
              .update({
                status: "sent",
                attempts: attemptsNext,
                last_attempt_at: nowIso,
                sent_at: nowIso,
                message_id: result.messageId ?? null,
                last_error: null,
              })
              .eq("id", job.id);

            if (job.webhook_event_id) {
              await supabaseAdmin
                .from("webhook_events")
                .update({ error: null, status: "processed" })
                .eq("id", job.webhook_event_id);
            }
          } else {
            const isDead = attemptsNext >= (job.max_attempts ?? 5);
            if (isDead) dead++;
            else failed++;
            const backoffIdx = Math.min(attemptsNext - 1, BACKOFF_SECONDS.length - 1);
            const nextAt = new Date(Date.now() + BACKOFF_SECONDS[backoffIdx] * 1000).toISOString();

            await supabaseAdmin
              .from("email_send_queue")
              .update({
                status: isDead ? "failed" : "pending",
                attempts: attemptsNext,
                last_attempt_at: nowIso,
                next_attempt_at: nextAt,
                last_error: result.error ?? "erro desconhecido",
              })
              .eq("id", job.id);
          }
        }

        return Response.json({ ok: true, processed: due?.length ?? 0, sent, failed, dead });
      },
    },
  },
});
