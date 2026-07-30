import { createFileRoute } from "@tanstack/react-router";
import {
  verifyMercadoPagoSignature,
  processMercadoPagoPayment,
} from "@/lib/mercadopago.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-signature, x-request-id",
};

export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        const raw = await request.text();
        let payload: Record<string, unknown> = {};
        try {
          payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          // keep empty; will log as invalid
        }

        const signatureHeader = request.headers.get("x-signature");
        const requestId = request.headers.get("x-request-id");
        const url = new URL(request.url);

        // data.id may come in body or as ?data.id=...
        const data = (payload["data"] ?? {}) as Record<string, unknown>;
        const dataId =
          (typeof data["id"] === "string" || typeof data["id"] === "number"
            ? String(data["id"])
            : null) || url.searchParams.get("data.id");
        const eventType =
          (payload["type"] as string | undefined) ||
          (payload["action"] as string | undefined) ||
          url.searchParams.get("type") ||
          "unknown";

        const { getMpCredentials } = await import("@/lib/mp-credentials.server");
        const creds = await getMpCredentials();
        const secret = creds.webhookSecret ?? "";
        const signatureValid = verifyMercadoPagoSignature({
          signatureHeader,
          requestId,
          dataId,
          secret,
        });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Log the event first (always) so the admin can audit
        const { data: logRow } = await supabaseAdmin
          .from("webhook_events")
          .insert({
            provider: "mercadopago",
            event_type: eventType,
            external_id: dataId,
            payload: payload as never,
            headers: {
              "x-signature": signatureHeader,
              "x-request-id": requestId,
            } as never,
            signature_valid: signatureValid,
            status: "received",
            attempts: 0,
          })
          .select("id")
          .single();

        // Falha fechada: sem secret configurado OU assinatura inválida => não processa.
        if (!secret || !signatureValid) {
          if (logRow) {
            await supabaseAdmin
              .from("webhook_events")
              .update({
                status: "failed",
                error: secret ? "assinatura inválida" : "MP_WEBHOOK_SECRET não configurado",
              })
              .eq("id", logRow.id);
          }
          return new Response("Invalid signature", { status: 401, headers: CORS });
        }


        // Only payment events carry a payment id we can process
        const isPayment =
          eventType.includes("payment") ||
          payload["type"] === "payment" ||
          !!dataId;

        if (!isPayment || !dataId) {
          if (logRow) {
            await supabaseAdmin
              .from("webhook_events")
              .update({ status: "skipped", error: "sem data.id ou não é pagamento" })
              .eq("id", logRow.id);
          }
          return new Response("OK", { status: 200, headers: CORS });
        }

        const result = await processMercadoPagoPayment(dataId);

        if (logRow) {
          await supabaseAdmin
            .from("webhook_events")
            .update({
              status: result.status,
              error: result.reason ?? null,
              subscriber_id: result.subscriberId ?? null,
              attempts: 1,
              last_processed_at: new Date().toISOString(),
            })
            .eq("id", logRow.id);
        }

        // Always 200 to acknowledge and avoid MP retries for our internal errors
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS },
        });
      },
    },
  },
});
