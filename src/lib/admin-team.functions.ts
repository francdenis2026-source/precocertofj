import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { OWNER_EMAIL } from "@/lib/roles.functions";

export type AdminAuditAction =
  | "price_update"
  | "price_create"
  | "scan_delete"
  | "price_verify"
  | "price_unverify"
  | "cache_invalidate_global"
  | "cache_invalidate_product"
  | "cache_invalidate_store"
  | "catalog_update"
  | "catalog_delete"
  | "establishment_update"
  | "establishment_delete"
  | "user_invite"
  | "user_remove"
  | "role_grant"
  | "role_revoke"
  | "admin_access";

export type AdminAuditRow = {
  id: string;
  action: AdminAuditAction;
  targetType: string;
  targetId: string | null;
  notes: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export const ADMIN_AUDIT_LABELS: Record<AdminAuditAction, string> = {
  price_update: "Preço editado",
  price_create: "Preço criado",
  scan_delete: "Preço removido",
  price_verify: "Preço verificado",
  price_unverify: "Verificação removida",
  cache_invalidate_global: "Cache global limpo",
  cache_invalidate_product: "Cache de produto limpo",
  cache_invalidate_store: "Cache de loja limpo",
  catalog_update: "Catálogo alterado",
  catalog_delete: "Item do catálogo removido",
  establishment_update: "Estabelecimento alterado",
  establishment_delete: "Estabelecimento removido",
  user_invite: "Usuário convidado",
  user_remove: "Usuário removido",
  role_grant: "Função concedida",
  role_revoke: "Função removida",
  admin_access: "Acesso ao painel",
};

/* ------------------------------------------------------------------ */
/* Leitura do log                                                      */
/* ------------------------------------------------------------------ */

export const listAdminAuditLog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input?: { action?: string; days?: number; limit?: number }) => ({
    action: input?.action && input.action !== "all" ? String(input.action) : null,
    days: input?.days != null && Number.isFinite(Number(input.days)) ? Number(input.days) : null,
    limit: Math.min(Math.max(Number(input?.limit ?? 300), 1), 1000),
  }))
  .handler(async ({ data }): Promise<AdminAuditRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("admin_audit_log")
      .select("id, action, target_type, target_id, notes, admin_user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.action) q = q.eq("action", data.action);
    if (data.days != null) {
      q = q.gte("created_at", new Date(Date.now() - data.days * 86400000).toISOString());
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as unknown as Array<{
      id: string;
      action: AdminAuditAction;
      target_type: string;
      target_id: string | null;
      notes: string | null;
      admin_user_id: string | null;
      created_at: string;
    }>;

    const emailById = new Map<string, string | null>();
    try {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      for (const u of users?.users ?? []) emailById.set(u.id, u.email ?? null);
    } catch {
      /* lista de e-mails é opcional */
    }

    return list.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      notes: r.notes,
      actorEmail: r.admin_user_id ? (emailById.get(r.admin_user_id) ?? null) : null,
      createdAt: r.created_at,
    }));
  });

/* ------------------------------------------------------------------ */
/* Registro de acesso ao painel                                        */
/* ------------------------------------------------------------------ */

export const logAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input?: { area?: string }) => ({
    area: String(input?.area ?? "console").slice(0, 80),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "admin_access",
      target_type: "admin_panel",
      target_id: data.area,
      notes: `Acesso ao painel (${data.area})`,
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Gestão de usuários do admin                                         */
/* ------------------------------------------------------------------ */

export type AdminMember = {
  id: string;
  email: string | null;
  roles: string[];
  createdAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
  invited: boolean;
  isOwner: boolean;
};

export const listAdminMembers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AdminMember[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 500,
    });
    if (error) throw new Error(error.message);

    const { data: rolesData } = await supabaseAdmin
      .from("user_roles" as never)
      .select("user_id, role");
    const rolesByUser = new Map<string, string[]>();
    for (const r of (rolesData ?? []) as Array<{ user_id: string; role: string }>) {
      rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role]);
    }

    return usersData.users
      .map((u) => ({
        id: u.id,
        email: u.email ?? null,
        roles: rolesByUser.get(u.id) ?? [],
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        confirmed: Boolean(u.email_confirmed_at),
        invited: Boolean(u.invited_at) && !u.last_sign_in_at,
        isOwner: (u.email ?? "").toLowerCase() === OWNER_EMAIL.toLowerCase(),
      }))
      .filter((u) => u.roles.some((r) => r === "admin" || r === "moderator") || u.invited)
      .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
  });

export const inviteAdminMember = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { email: string; role: "admin" | "moderator" }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("E-mail inválido");
    const role = input?.role === "moderator" ? "moderator" : "admin";
    return { email, role } as const;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Já existe conta com esse e-mail?
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
    let userId = existing?.users.find((u) => (u.email ?? "").toLowerCase() === data.email)?.id;
    let invited = false;

    if (!userId) {
      const { data: inv, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.email,
      );
      if (invErr) throw new Error(invErr.message);
      userId = inv?.user?.id;
      invited = true;
    }
    if (!userId) throw new Error("Não foi possível criar o convite");

    const { error: roleErr } = await (
      supabaseAdmin.from("user_roles" as never) as unknown as {
        insert: (r: { user_id: string; role: string }) => Promise<{ error: { message: string } | null }>;
      }
    ).insert({ user_id: userId, role: data.role });
    if (roleErr && !/duplicate|unique/i.test(roleErr.message)) throw new Error(roleErr.message);

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "user_invite",
      target_type: "user",
      target_id: userId,
      notes: `${invited ? "Convite enviado" : "Função atribuída"} para ${data.email} (${data.role})`,
    });

    return { ok: true, invited, userId };
  });

export const removeAdminMember = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string; deleteAccount?: boolean }) => {
    if (!input?.userId) throw new Error("userId obrigatório");
    return { userId: String(input.userId), deleteAccount: Boolean(input.deleteAccount) };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.userId === context.userId) {
      throw new Error("Você não pode remover o próprio acesso");
    }

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const email = target?.user?.email ?? null;
    if ((email ?? "").toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      throw new Error("O dono do sistema não pode ser removido");
    }

    const { data: admins } = await supabaseAdmin
      .from("user_roles" as never)
      .select("user_id")
      .eq("role", "admin");
    const adminRows = (admins ?? []) as Array<{ user_id: string }>;
    if (adminRows.length <= 1 && adminRows[0]?.user_id === data.userId) {
      throw new Error("Não é possível remover o último admin do sistema");
    }

    const del = supabaseAdmin.from("user_roles" as never) as unknown as {
      delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    };
    const { error: delErr } = await del.delete().eq("user_id", data.userId);
    if (delErr) throw new Error(delErr.message);

    if (data.deleteAccount) {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
      if (authErr) throw new Error(authErr.message);
    }

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "user_remove",
      target_type: "user",
      target_id: data.userId,
      notes: `${data.deleteAccount ? "Conta excluída" : "Acesso revogado"}: ${email ?? data.userId}`,
    });

    return { ok: true };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string; role: "admin" | "moderator"; enabled: boolean }) => {
    if (!input?.userId) throw new Error("userId obrigatório");
    return {
      userId: String(input.userId),
      role: input.role === "moderator" ? ("moderator" as const) : ("admin" as const),
      enabled: Boolean(input.enabled),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const email = target?.user?.email ?? null;

    if (!data.enabled && data.role === "admin") {
      if (data.userId === context.userId) throw new Error("Você não pode remover seu próprio admin");
      if ((email ?? "").toLowerCase() === OWNER_EMAIL.toLowerCase())
        throw new Error("O dono do sistema não pode perder o papel de admin");
      const { data: admins } = await supabaseAdmin
        .from("user_roles" as never)
        .select("user_id")
        .eq("role", "admin");
      if (((admins ?? []) as unknown[]).length <= 1)
        throw new Error("Não é possível remover o último admin do sistema");
    }

    const table = supabaseAdmin.from("user_roles" as never) as unknown as {
      insert: (r: { user_id: string; role: string }) => Promise<{ error: { message: string } | null }>;
      delete: () => {
        eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
      };
    };

    if (data.enabled) {
      const { error } = await table.insert({ user_id: data.userId, role: data.role });
      if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    } else {
      const { error } = await table.delete().eq("user_id", data.userId).eq("role", data.role);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: data.enabled ? "role_grant" : "role_revoke",
      target_type: "user",
      target_id: data.userId,
      notes: `${data.enabled ? "Concedido" : "Removido"} ${data.role} — ${email ?? data.userId}`,
    });

    return { ok: true };
  });
