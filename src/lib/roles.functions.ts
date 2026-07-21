import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";

export const OWNER_EMAIL = "francdenisbr@gmail.com";

type UserRolesTable = {
  insert: (row: { user_id: string; role: string }) => Promise<{ error: { message: string } | null }>;
  delete: () => {
    eq: (col: string, val: string) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

type AuditInsertRow = {
  actor_id: string | null;
  actor_email: string | null;
  target_user_id: string;
  target_email: string | null;
  role: string;
  action: "grant" | "revoke";
};

type AuditTable = {
  insert: (row: AuditInsertRow) => Promise<{ error: { message: string } | null }>;
};

async function writeAudit(
  supabaseAdmin: { from: (t: string) => unknown },
  row: AuditInsertRow,
) {
  const table = supabaseAdmin.from("role_audit_log") as unknown as AuditTable;
  await table.insert(row);
}

/**
 * Bootstrap: grants admin to the caller if:
 *  - caller email matches OWNER_EMAIL, OR
 *  - no admin exists yet in the system (first-run safety).
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const callerEmail = (context.claims.email as string | undefined)?.toLowerCase();
    const isOwner = callerEmail === OWNER_EMAIL.toLowerCase();

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles" as never)
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);

    if (!isOwner && (count ?? 0) > 0) {
      return { granted: false, reason: "admin_already_exists" as const };
    }

    const table = supabaseAdmin.from("user_roles" as never) as unknown as UserRolesTable;
    const { error: insertErr } = await table.insert({
      user_id: context.userId,
      role: "admin",
    });
    // Ignore unique-violation (already admin)
    if (insertErr && !/duplicate|unique/i.test(insertErr.message)) {
      throw new Error(insertErr.message);
    }
    return { granted: true as const, isOwner };
  });

// ---- Admin-only user management ----------------------------------------

export type UserWithRoles = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  roles: Array<"admin" | "moderator" | "user">;
};

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<UserWithRoles[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersData, error: usersErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (usersErr) throw new Error(usersErr.message);

    const { data: rolesData, error: rolesErr } = await supabaseAdmin
      .from("user_roles" as never)
      .select("user_id, role");
    if (rolesErr) throw new Error(rolesErr.message);

    const rolesByUser = new Map<string, Array<"admin" | "moderator" | "user">>();
    for (const r of (rolesData ?? []) as Array<{ user_id: string; role: "admin" | "moderator" | "user" }>) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    return usersData.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      roles: rolesByUser.get(u.id) ?? [],
    }));
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string; role: "admin" | "moderator" | "user" }) => {
    if (!input.userId) throw new Error("userId obrigatório");
    if (!["admin", "moderator", "user"].includes(input.role))
      throw new Error("Papel inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = supabaseAdmin.from("user_roles" as never) as unknown as UserRolesTable;
    const { error } = await table.insert({ user_id: data.userId, role: data.role });
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
    const { data: targetLookup } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    await writeAudit(supabaseAdmin, {
      actor_id: context.userId,
      actor_email: (context.claims.email as string | undefined) ?? null,
      target_user_id: data.userId,
      target_email: targetLookup?.user?.email ?? null,
      role: data.role,
      action: "grant",
    });
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { userId: string; role: "admin" | "moderator" | "user" }) => {
    if (!input.userId) throw new Error("userId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.role === "admin") {
      const { data: adminRows, error: cntErr } = await supabaseAdmin
        .from("user_roles" as never)
        .select("user_id")
        .eq("role", "admin");
      if (cntErr) throw new Error(cntErr.message);
      const admins = (adminRows ?? []) as Array<{ user_id: string }>;
      if (admins.length <= 1) {
        throw new Error("Não é possível remover o último admin do sistema");
      }
      if (data.userId === context.userId) {
        throw new Error("Você não pode remover seu próprio papel de admin");
      }
      const { data: ownerLookup } = await supabaseAdmin.auth.admin.getUserById(data.userId);
      if (ownerLookup?.user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        throw new Error("O papel de admin do dono do sistema não pode ser removido");
      }
    }

    const table = supabaseAdmin.from("user_roles" as never) as unknown as UserRolesTable;
    const { error } = await table.delete().eq("user_id", data.userId).eq("role", data.role);
    if (error) throw new Error(error.message);

    const { data: targetLookup } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    await writeAudit(supabaseAdmin, {
      actor_id: context.userId,
      actor_email: (context.claims.email as string | undefined) ?? null,
      target_user_id: data.userId,
      target_email: targetLookup?.user?.email ?? null,
      role: data.role,
      action: "revoke",
    });
    return { ok: true };
  });

export type RoleAuditEntry = {
  id: string;
  actorEmail: string | null;
  targetEmail: string | null;
  targetUserId: string;
  role: "admin" | "moderator" | "user";
  action: "grant" | "revoke";
  createdAt: string;
};

export const listRoleAuditLog = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<RoleAuditEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("role_audit_log" as never)
      .select("id, actor_email, target_user_id, target_email, role, action, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      id: string;
      actor_email: string | null;
      target_user_id: string;
      target_email: string | null;
      role: "admin" | "moderator" | "user";
      action: "grant" | "revoke";
      created_at: string;
    }>;
    return rows.map((r) => ({
      id: r.id,
      actorEmail: r.actor_email,
      targetEmail: r.target_email,
      targetUserId: r.target_user_id,
      role: r.role,
      action: r.action,
      createdAt: r.created_at,
    }));
  });

