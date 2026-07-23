import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const MP_API = "https://api.mercadopago.com";

/**
 * Mercado Pago Webhook (IPN v2) — logs every event to public.webhook_events
 * and applies idempotency so the same payment id can never approve an order twice.
 *
 * MP posts { type: "payment", data: { id: "1234" } }.
 * Signature header format:  ts=1704908010,v1=<hmacsha256hex>
 * Signed string:            id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * HMAC key = MP_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const raw = await request.text();
        let body: any = {};
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          // keep empty; will log as invalid_json
        }

        const url = new URL(request.url);
        const type: string =
          body?.type ?? body?.action ?? url.searchParams.get("type") ?? "unknown";
        const dataId: string =
          String(body?.data?.id ?? "") || (url.searchParams.get("data.id") ?? "");
        const sigHeader = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Persist a log row up-front so admins see every hit — even malformed ones.
        const { data: logRow } = await supabaseAdmin
          .from("webhook_events")
          .insert({
            provider: "mercadopago",
            event_type: String(type),
            external_id: dataId || null,
            payload: (body ?? {}) as never,
            headers: {
              "x-signature": sigHeader || null,
              "x-request-id": requestId || null,
            } as never,
            signature_valid: false,
            status: "received",
            attempts: 0,
          })
          .select("id")
          .single();

        const finish = async (
          status: string,
          error: string | null,
          httpStatus = 200,
          extra?: Record<string, unknown>,
        ) => {
          if (logRow) {
            await supabaseAdmin
              .from("webhook_events")
              .update({
                status,
                error,
                attempts: 1,
                last_processed_at: new Date().toISOString(),
                ...(extra ?? {}),
              })
              .eq("id", logRow.id);
          }
          return new Response(error ?? "ok", { status: httpStatus });
        };

        if (!dataId) return finish("skipped", "sem data.id", 200);
        if (!String(type).includes("payment"))
          return finish("skipped", "não é evento de pagamento", 200);

        // Signature validation
        const secret = process.env.MP_WEBHOOK_SECRET;
        let signatureValid = false;
        if (secret) {
          const parts = Object.fromEntries(
            sigHeader.split(",").map((p) => {
              const [k, ...rest] = p.trim().split("=");
              return [k, rest.join("=")];
            }),
          );
          const ts = parts["ts"];
          const v1 = parts["v1"];
          if (!ts || !v1) return finish("failed", "assinatura ausente (ts/v1)", 401);
          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
          const expected = createHmac("sha256", secret).update(manifest).digest("hex");
          try {
            const a = Buffer.from(v1, "hex");
            const b = Buffer.from(expected, "hex");
            signatureValid = a.length === b.length && timingSafeEqual(a, b);
          } catch {
            signatureValid = false;
          }
          if (!signatureValid) return finish("failed", "assinatura inválida", 401);
          if (logRow) {
            await supabaseAdmin
              .from("webhook_events")
              .update({ signature_valid: true })
              .eq("id", logRow.id);
          }
        } else {
          // No secret configured: mark as insecure but continue (dev-only path).
          console.warn("[mp-webhook] MP_WEBHOOK_SECRET não configurado — validação desativada");
        }

        // Idempotency: if we already processed this payment id successfully, short-circuit.
        const { data: prior } = await supabaseAdmin
          .from("webhook_events")
          .select("id")
          .eq("provider", "mercadopago")
          .eq("external_id", dataId)
          .eq("status", "processed")
          .neq("id", logRow?.id ?? "00000000-0000-0000-0000-000000000000")
          .limit(1);
        if (prior && prior.length > 0) {
          return finish("skipped_duplicate", "pagamento já processado", 200);
        }

        const token = process.env.MP_ACCESS_TOKEN;
        if (!token) return finish("failed", "MP_ACCESS_TOKEN não configurado", 500);

        // Fetch payment from MP to confirm status and get external_reference
        const payResp = await fetch(`${MP_API}/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!payResp.ok) {
          const errBody = await payResp.text();
          console.error(`[mp-webhook] payment fetch failed [${payResp.status}]: ${errBody}`);
          if (payResp.status >= 500) return finish("failed", `upstream ${payResp.status}`, 502);
          return finish("skipped", `pagamento não encontrado (${payResp.status})`, 200);
        }
        const payment: any = await payResp.json();
        const status = String(payment?.status ?? "");
        const externalRef = String(payment?.external_reference ?? "");

        if (!externalRef) return finish("skipped", "sem external_reference", 200);

        // Idempotency guard #2: check order state — never re-approve.
        const { data: order } = await supabaseAdmin
          .from("checkout_orders")
          .select("id, status")
          .eq("id", externalRef)
          .maybeSingle();
        if (!order) return finish("failed", "pedido não encontrado", 200);

        if (order.status === "approved" && status === "approved") {
          return finish("skipped_duplicate", "pedido já aprovado", 200);
        }

        // Always keep provider_ref in sync
        await supabaseAdmin
          .from("checkout_orders")
          .update({ provider_ref: String(dataId) })
          .eq("id", externalRef);

        if (status === "approved") {
          const { data: rpcData, error } = await supabaseAdmin.rpc("approve_checkout_order", {
            _order_id: externalRef,
            _provider_ref: String(dataId),
          });
          if (error) {
            if (String(error.message).toLowerCase().includes("already")) {
              return finish("skipped_duplicate", "já aprovado (rpc)", 200);
            }
            return finish("failed", `rpc: ${error.message}`, 500);
          }
          const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
          const licenseCode = row?.license_code as string | undefined;
          console.log(
            `[mp-webhook] order ${externalRef} approved · license ${licenseCode ?? "?"}`,
          );

          // Envia código de ativação por e-mail (best-effort — nunca quebra o webhook)
          let emailStatus: Record<string, unknown> = { email_sent: false };
          try {
            const { data: orderFull } = await supabaseAdmin
              .from("checkout_orders")
              .select("delivery_email, user_id, plan_id, license_code_id")
              .eq("id", externalRef)
              .maybeSingle();

            const to = orderFull?.delivery_email ?? payment?.payer?.email ?? null;
            if (!to || !licenseCode) {
              emailStatus = { email_sent: false, email_error: "sem e-mail ou código" };
            } else {
              const [{ data: plan }, { data: license }, { data: profile }] = await Promise.all([
                supabaseAdmin
                  .from("license_plans")
                  .select("name, duration_days")
                  .eq("id", orderFull!.plan_id)
                  .maybeSingle(),
                supabaseAdmin
                  .from("license_codes")
                  .select("expires_at")
                  .eq("id", orderFull!.license_code_id!)
                  .maybeSingle(),
                supabaseAdmin
                  .from("profiles")
                  .select("full_name")
                  .eq("id", orderFull!.user_id)
                  .maybeSingle(),
              ]);

              const days = (plan?.duration_days as number | undefined) ?? 30;
              const planName = (plan?.name as string | undefined) ?? "PreçoCerto";
              const expiresAt =
                (license?.expires_at as string | undefined) ??
                new Date(Date.now() + 90 * 86400_000).toISOString();
              const displayName =
                ((profile?.full_name as string | undefined)?.trim() ||
                  [payment?.payer?.first_name, payment?.payer?.last_name]
                    .filter(Boolean)
                    .join(" ")
                    .trim() ||
                  "Assinante") as string;

              const { sendActivationEmail } = await import("@/lib/mercadopago.server");
              const mail = await sendActivationEmail({
                to,
                name: displayName,
                code: licenseCode,
                planName,
                days,
                expiresAt,
              });
              emailStatus = mail.sent
                ? { email_sent: true, email_to: to, email_message_id: mail.messageId ?? null }
                : { email_sent: false, email_to: to, email_error: mail.error ?? "erro" };
              if (!mail.sent) console.warn("[mp-webhook] activation email não enviado:", mail.error);
            }
          } catch (e) {
            console.error("[mp-webhook] falha ao enviar e-mail:", e);
            emailStatus = { email_sent: false, email_error: (e as Error).message };
          }

          return finish("processed", null, 200, emailStatus);
        }


        if (status === "rejected" || status === "cancelled") {
          await supabaseAdmin
            .from("checkout_orders")
            .update({ status: status === "cancelled" ? "cancelled" : "failed" })
            .eq("id", externalRef)
            .eq("status", "pending");
          return finish("processed", `pagamento ${status}`, 200);
        }

        return finish("processed", `status ${status}`, 200);
      },
    },
  },
});
