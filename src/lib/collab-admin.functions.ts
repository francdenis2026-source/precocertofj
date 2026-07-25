import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { sendLovableEmail, EmailAPIError } from "@lovable.dev/email-js";

export type AdminSubmission = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  market_name: string | null;
  city: string | null;
  purchase_date: string | null;
  receipts_count: number;
  status: "received" | "review" | "approved" | "rejected";
  admin_notes: string | null;
  rejection_reason: string | null;
  reward_days: number | null;
  reward_granted: boolean;
  source: string;
  external_ref: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  attachment_paths: string[];
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

export const listCollaboratorSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: z.enum(["received", "review", "approved", "rejected", "all"]).default("all"),
        search: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdminSubmission[]> => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("collaborator_submissions" as never)
      .select(
        "id, user_id, email, full_name, market_name, city, purchase_date, receipts_count, status, admin_notes, rejection_reason, reward_days, reward_granted, source, external_ref, reviewed_at, created_at, updated_at, attachment_paths",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.search && data.search.trim()) {
      const s = `%${data.search.trim()}%`;
      q = q.or(`email.ilike.${s},full_name.ilike.${s},market_name.ilike.${s}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as AdminSubmission[];
  });

export const reviewCollaboratorSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["received", "review", "approved", "rejected"]),
        rejection_reason: z.string().max(500).optional(),
        admin_notes: z.string().max(1000).optional(),
        reward_days: z.number().int().min(0).max(3650).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    // Snapshot BEFORE for audit trail
    const { data: beforeRow } = await context.supabase
      .from("collaborator_submissions" as never)
      .select("id, status, reward_days, reward_granted, admin_notes, rejection_reason, user_id, email")
      .eq("id", data.id)
      .maybeSingle();

    const rpcArgs: Record<string, unknown> = {
      _id: data.id,
      _status: data.status,
    };
    if (data.rejection_reason !== undefined) rpcArgs._rejection_reason = data.rejection_reason;
    if (data.admin_notes !== undefined) rpcArgs._admin_notes = data.admin_notes;
    if (data.reward_days !== undefined) rpcArgs._reward_days = data.reward_days;
    const { data: updated, error } = await context.supabase.rpc(
      "admin_review_collab_submission" as never,
      rpcArgs as never,
    );
    if (error) throw new Error(error.message);

    const sub = updated as AdminSubmission | null;

    // Persist audit trail (best-effort; never blocks the review)
    try {
      await context.supabase.rpc("admin_log_action" as never, {
        _action: `collab_review_${data.status}`,
        _target_type: "collab_submission",
        _target_id: data.id,
        _before: (beforeRow ?? null) as never,
        _after: (sub ?? null) as never,
        _notes: data.admin_notes ?? data.rejection_reason ?? null,
      } as never);
    } catch (err) {
      console.warn("[collab-audit] log failed:", err instanceof Error ? err.message : err);
    }

    // Send email notification for approved/rejected outcomes.
    if (sub && (data.status === "approved" || data.status === "rejected")) {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (apiKey && sub.email) {
        const isApproved = data.status === "approved";
        const subject = isApproved
          ? "Seu comprovante foi aprovado 🎉"
          : "Seu comprovante não pôde ser aceito";
        const bodyLines = isApproved
          ? [
              `Olá ${sub.full_name ?? "colaborador"},`,
              "",
              "Recebemos e validamos seu envio de notas fiscais. Muito obrigado por colaborar com a rede PreçoCerto!",
              data.reward_days
                ? `Como reconhecimento, adicionamos ${data.reward_days} dia(s) de acesso gratuito à sua conta.`
                : "Seu envio foi aprovado com sucesso.",
              "",
              "Acesse: https://precocerto-fj.lovable.app/perfil",
            ]
          : [
              `Olá ${sub.full_name ?? "colaborador"},`,
              "",
              "Analisamos seu envio, mas ele não pôde ser aceito desta vez.",
              data.rejection_reason ? `Motivo: ${data.rejection_reason}` : "",
              "",
              "Você pode enviar novas notas para economizafeijo@gmail.com quando quiser.",
            ];
        const text = bodyLines.filter(Boolean).join("\n");
        const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">${bodyLines
          .filter(Boolean)
          .map((l) => `<p style="margin:0 0 8px">${l}</p>`)
          .join("")}</div>`;
        try {
          const res = await sendLovableEmail(
            {
              to: sub.email,
              from: "PreçoCerto <no-reply@precocerto.app>",
              subject,
              text,
              html,
              idempotency_key: `collab-${sub.id}-${data.status}`,
              label: "collab-review",
            },
            { apiKey },
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tbl = (context.supabase.from as any)("collaborator_submissions");
          await tbl.update({ notified_at: new Date().toISOString() }).eq("id", sub.id);
          return { ok: true, emailSent: !!res.success };


        } catch (err) {
          const msg =
            err instanceof EmailAPIError
              ? `${err.message} (${err.code ?? err.status ?? "erro"})`
              : err instanceof Error
                ? err.message
                : "erro";
          console.error("collab review email failed:", msg);
          return { ok: true, emailSent: false, emailError: msg };
        }
      }
    }
    return { ok: true, emailSent: false };
  });

export const collabSubmissionMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("collaborator_submissions" as never)
      .select("status");
    if (error) throw new Error(error.message);
    const counts = { received: 0, review: 0, approved: 0, rejected: 0, total: 0 } as Record<
      string,
      number
    >;
    for (const row of (data ?? []) as Array<{ status: string }>) {
      counts.total += 1;
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  });

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type CollabAuditEntry = {
  id: string;
  admin_user_id: string | null;
  admin_full_name: string | null;
  action: string;
  target_id: string | null;
  before: Json;
  after: Json;
  notes: string | null;
  created_at: string;
};

export const listCollabAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        submission_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }): Promise<CollabAuditEntry[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase.rpc(
      "list_collab_audit_log" as never,
      {
        _submission_id: data.submission_id ?? null,
        _limit: data.limit,
      } as never,
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as CollabAuditEntry[];
  });

