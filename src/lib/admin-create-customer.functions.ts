/**
 * Cadastro manual de cliente pelo admin.
 *
 * Fluxo:
 *  1. Cria usuário no Auth (email_confirm=true, senha aleatória).
 *  2. Cria o registro em `profiles` com CPF, nome e telefone.
 *  3. Gera um código de definição de PIN (6 dígitos, TTL 15 min) e um
 *     link para o cliente definir o PIN em /resgatar.
 *  4. Registra em admin_audit_log.
 *
 * Retorna o link + código para o admin repassar ao cliente. Um e-mail de
 * definição de PIN também é disparado automaticamente pelos gatilhos
 * padrão do Supabase Auth (evento SIGNUP) quando o domínio de e-mails
 * está configurado.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import crypto from "crypto";

const InputSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(255),
  fullName: z.string().trim().min(2, "Nome obrigatório").max(120),
  cpf: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D+/g, ""))
    .refine((v) => v.length === 11, "CPF deve ter 11 dígitos"),
  phone: z.string().trim().max(20).default(""),
  city: z.string().trim().max(80).optional().nullable(),
  neighborhood: z.string().trim().max(80).optional().nullable(),
  sendInvite: z.boolean().default(true),
});

export type AdminCreateCustomerInput = z.infer<typeof InputSchema>;

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function genPin() {
  let s = "";
  for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

export const adminCreateCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Verifica se CPF já existe
    const { data: cpfDup } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("cpf", data.cpf)
      .maybeSingle();
    if (cpfDup) throw new Error("Já existe um cliente com este CPF");

    // 2) Cria usuário no Auth (senha aleatória, e-mail confirmado)
    const tempPassword = crypto.randomBytes(24).toString("base64url");
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, created_by_admin: true },
    });
    if (authErr || !created.user) {
      throw new Error(authErr?.message ?? "Falha ao criar usuário no Auth");
    }
    const userId = created.user.id;

    // 3) Cria profile
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { error: profErr } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      cpf: data.cpf,
      full_name: data.fullName,
      phone: data.phone || "",
      city: data.city ?? null,
      neighborhood: data.neighborhood ?? null,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
    });
    if (profErr) {
      // rollback do auth em caso de falha no profile
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw new Error(`Falha ao criar perfil: ${profErr.message}`);
    }

    // 4) Papel base
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "user" })
      .then(() => undefined, () => undefined);

    // 5) Código de definição de PIN
    const pinCode = genPin();
    const pinExpiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    await supabaseAdmin.from("pin_reset_codes").insert({
      user_id: userId,
      cpf: data.cpf,
      phone_masked: data.phone ? `••••${data.phone.replace(/\D+/g, "").slice(-4)}` : "admin",
      code_hash: sha256(pinCode),
      expires_at: pinExpiresAt,
    });

    // 6) Se pediu envio de invite, gera magic link (Supabase envia e-mail)
    let inviteSent = false;
    if (data.sendInvite) {
      const { error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
      });
      inviteSent = !linkErr;
    }

    // 7) Auditoria
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "customer.manual_create",
      target_type: "profile",
      target_id: userId,
      after: { email: data.email, cpf_masked: `***${data.cpf.slice(-2)}`, invite_sent: inviteSent },
    });

    return {
      userId,
      email: data.email,
      pinCode,
      pinExpiresAt,
      inviteSent,
      resgatarPath: `/resgatar?cpf=${data.cpf}`,
    };
  });
