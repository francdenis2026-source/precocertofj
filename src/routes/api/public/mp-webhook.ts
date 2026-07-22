import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const MP_API = "https://api.mercadopago.com";

/**
 * Mercado Pago Webhook (IPN v2)
 *
 * MP posts events like { type: "payment", data: { id: "1234" } }.
 * We fetch the payment, and if status=approved, call approve_checkout_order
 * using the external_reference (our checkout_orders.id).
 *
 * Signature: MP sends `x-signature` and `x-request-id`. Header format:
 *   ts=1704908010,v1=<hmacsha256hex>
 * The signed string is: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * HMAC key = MP_WEBHOOK_SECRET (configured in the MP dashboard).
 */
export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let body: any;
        try {
          body = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const type = body?.type ?? body?.action ?? "";
        const dataId = String(body?.data?.id ?? "");
        if (!dataId) {
          return new Response("Missing data.id", { status: 400 });
        }

        // Only payment events are relevant for order approval.
        // (merchant_order events are ignored — we settle on the payment record.)
        if (!String(type).includes("payment")) {
          return new Response("ignored", { status: 200 });
        }

        // Verify signature when secret is configured
        const secret = process.env.MP_WEBHOOK_SECRET;
        const sigHeader = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";
        if (secret) {
          const parts = Object.fromEntries(
            sigHeader.split(",").map((p) => {
              const [k, ...rest] = p.trim().split("=");
              return [k, rest.join("=")];
            }),
          );
          const ts = parts["ts"];
          const v1 = parts["v1"];
          if (!ts || !v1) {
            console.warn("[mp-webhook] missing ts/v1 in x-signature");
            return new Response("Invalid signature", { status: 401 });
          }
          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
          const expected = createHmac("sha256", secret).update(manifest).digest("hex");
          const a = Buffer.from(v1, "hex");
          const b = Buffer.from(expected, "hex");
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            console.warn("[mp-webhook] signature mismatch");
            return new Response("Invalid signature", { status: 401 });
          }
        }

        const token = process.env.MP_ACCESS_TOKEN;
        if (!token) {
          console.error("[mp-webhook] MP_ACCESS_TOKEN not configured");
          return new Response("Server misconfigured", { status: 500 });
        }

        // Fetch payment from MP to confirm status and grab external_reference
        const payResp = await fetch(`${MP_API}/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!payResp.ok) {
          const errBody = await payResp.text();
          console.error(`[mp-webhook] payment fetch failed [${payResp.status}]: ${errBody}`);
          // Return 200 to prevent MP retries on 4xx from our side; 5xx will retry.
          if (payResp.status >= 500) return new Response("upstream error", { status: 502 });
          return new Response("payment not found", { status: 200 });
        }
        const payment: any = await payResp.json();
        const status = String(payment?.status ?? "");
        const externalRef = String(payment?.external_reference ?? "");

        if (!externalRef) {
          console.warn(`[mp-webhook] payment ${dataId} without external_reference`);
          return new Response("no external_reference", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Log the webhook (best-effort; ignore errors)
        await supabaseAdmin
          .from("checkout_orders")
          .update({ provider_ref: String(dataId) })
          .eq("id", externalRef);

        if (status === "approved") {
          const { data, error } = await supabaseAdmin.rpc("approve_checkout_order", {
            _order_id: externalRef,
            _provider_ref: String(dataId),
          });
          if (error) {
            // If already approved, RPC may error — treat as idempotent success
            if (String(error.message).toLowerCase().includes("already")) {
              return new Response("already approved", { status: 200 });
            }
            console.error(`[mp-webhook] approve rpc failed: ${error.message}`);
            return new Response("approve failed", { status: 500 });
          }
          const row = Array.isArray(data) ? data[0] : data;
          console.log(
            `[mp-webhook] order ${externalRef} approved, license ${row?.license_code ?? "?"}`,
          );
          return new Response("ok", { status: 200 });
        }

        if (status === "rejected" || status === "cancelled") {
          await supabaseAdmin
            .from("checkout_orders")
            .update({ status: status === "cancelled" ? "cancelled" : "failed" })
            .eq("id", externalRef)
            .eq("status", "pending");
        }

        return new Response("ok", { status: 200 });
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
