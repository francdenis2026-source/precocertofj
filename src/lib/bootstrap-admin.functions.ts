import { createServerFn } from "@tanstack/react-start";

export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = "francdenisbr@gmail.com";
  const password = "franc2015";

  let userId: string | null = null;
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    // Likely already exists — look it up
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw listErr;
    const existing = list.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) throw createErr;
    userId = existing.id;
    // Update password + confirm
    await supabaseAdmin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  } else {
    userId = created.user!.id;
  }

  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId!, role: "admin" }, { onConflict: "user_id,role" });
  if (roleErr) throw roleErr;

  return { ok: true, userId };
});
