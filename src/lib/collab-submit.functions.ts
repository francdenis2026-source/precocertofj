import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Cria um envio (submission) do colaborador vinculado à sua conta.
 * Os arquivos já devem ter sido enviados ao bucket `collab-receipts`
 * pelo cliente (RLS obriga que o primeiro segmento do path seja o auth.uid()).
 * Aqui apenas registramos a submissão com `status='received'`.
 */
export const createCollaboratorSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({
        market_name: z.string().min(2).max(120),
        city: z.string().min(2).max(80).optional(),
        purchase_date: z.string().optional(), // yyyy-mm-dd
        notes: z.string().max(1000).optional(),
        attachment_paths: z.array(z.string().min(3)).min(1).max(10),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // Segurança: todos os paths devem começar com o próprio userId.
    const prefix = `${context.userId}/`;
    const bad = data.attachment_paths.find((p) => !p.startsWith(prefix));
    if (bad) throw new Error("Anexo inválido — pertence a outro usuário.");

    const email = context.claims?.email ?? "";
    const fullName =
      (context.claims?.user_metadata as { full_name?: string } | undefined)?.full_name ??
      (context.claims?.user_metadata as { name?: string } | undefined)?.name ??
      null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("collaborator_submissions" as any)
      .insert({
        user_id: context.userId,
        email,
        full_name: fullName,
        market_name: data.market_name,
        city: data.city ?? null,
        purchase_date: data.purchase_date ?? null,
        receipts_count: data.attachment_paths.length,
        status: "received",
        source: "app-upload",
        admin_notes: data.notes ?? null,
        attachment_paths: data.attachment_paths,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: (row as { id?: string })?.id };
  });

/**
 * Retorna URLs assinadas dos anexos de um envio.
 * Só admins podem chamar.
 */
export const signCollabAttachments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ path: string; url: string }[]> => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("forbidden");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase.from as any)(
      "collaborator_submissions",
    )
      .select("attachment_paths")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const paths = ((row?.attachment_paths ?? []) as string[]).filter(Boolean);
    if (paths.length === 0) return [];

    const out: { path: string; url: string }[] = [];
    for (const path of paths) {
      const { data: signed } = await context.supabase.storage
        .from("collab-receipts")
        .createSignedUrl(path, 60 * 30); // 30 minutos
      if (signed?.signedUrl) out.push({ path, url: signed.signedUrl });
    }
    return out;
  });
