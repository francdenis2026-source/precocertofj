import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Webhook público para receber notificações de novos e-mails de comprovantes
 * chegando em economizafeijo@gmail.com.
 *
 * Autenticação: token compartilhado via header `x-collab-secret` OU query `?token=`.
 * O token está no secret COLLAB_INBOUND_SECRET.
 *
 * Providers suportados (qualquer um funciona; sem dependência de um específico):
 *   { from_name, from_email, subject, body?, market_name?, purchase_date?,
 *     city?, receipts_count?, external_ref? }
 *
 * O webhook:
 *   - Registra a submissão em `collaborator_submissions` com status='received',
 *     source='email'.
 *   - Se já houver um profile com esse e-mail em auth.users, associa `user_id`
 *     e cria notificação in-app confirmando o recebimento.
 */

const InboundSchema = z.object({
  from_email: z.string().email(),
  from_name: z.string().max(200).optional().nullable(),
  subject: z.string().max(300).optional().nullable(),
  body: z.string().max(20000).optional().nullable(),
  market_name: z.string().max(200).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  receipts_count: z.number().int().min(1).max(50).optional().nullable(),
  external_ref: z.string().max(200).optional().nullable(),
});

const EMAIL_META_RE = /(mercado|loja|supermercado)\s*[:\-]?\s*([^\n\r]{2,80})/i;
const DATE_RE = /(\d{2}\/\d{2}\/\d{4})/;

function tryExtractField(body: string | null | undefined, re: RegExp): string | null {
  if (!body) return null;
  const m = body.match(re);
  return m ? m[m.length - 1].trim() : null;
}

function toIsoDateBR(br: string | null): string | null {
  if (!br) return null;
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export const Route = createFileRoute("/api/public/hooks/collab-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const header = request.headers.get("x-collab-secret");
        const token = header || url.searchParams.get("token");
        const secret = process.env.COLLAB_INBOUND_SECRET;
        if (!secret) return new Response("not configured", { status: 500 });
        if (!token || token !== secret) return new Response("unauthorized", { status: 401 });

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const parsed = InboundSchema.safeParse(payload);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: parsed.error.issues }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        const p = parsed.data;

        // Try to infer market and date from body if not explicit
        const inferredMarket = p.market_name ?? tryExtractField(p.body, EMAIL_META_RE);
        const inferredDate =
          toIsoDateBR(p.purchase_date ?? null) ??
          toIsoDateBR(tryExtractField(p.body, DATE_RE));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Locate a user with a matching auth email (optional).
        let matchedUserId: string | null = null;
        try {
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 200,
          });
          const match = userList?.users?.find(
            (u) => u.email && u.email.toLowerCase() === p.from_email.toLowerCase(),
          );
          if (match) matchedUserId = match.id;
        } catch (err) {
          console.warn("collab-inbound: user lookup failed", err);
        }

        const insertRow = {
          user_id: matchedUserId,
          email: p.from_email.toLowerCase(),
          full_name: p.from_name ?? null,
          market_name: inferredMarket,
          city: p.city ?? null,
          purchase_date: inferredDate,
          receipts_count: p.receipts_count ?? 1,
          status: "received",
          source: "email",
          external_ref: p.external_ref ?? null,
          admin_notes: p.subject ? `Assunto do e-mail: ${p.subject}` : null,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabaseAdmin as any;
        const { data: inserted, error } = await client
          .from("collaborator_submissions")
          .insert(insertRow)
          .select("id")
          .single();
        if (error) {
          console.error("collab-inbound insert error", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        // If we attached to a user, drop a notification confirming receipt.
        if (matchedUserId) {
          await client.from("user_notifications").insert({
            user_id: matchedUserId,
            kind: "collab_status_received",
            title: "Comprovante recebido",
            body: "Recebemos seu e-mail em economizafeijo@gmail.com. Seu envio entrou na fila para análise.",
            link: "/perfil",
            metadata: { submission_id: inserted.id },
          });
        }

        return new Response(
          JSON.stringify({ ok: true, submission_id: inserted.id, matched_user: !!matchedUserId }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
