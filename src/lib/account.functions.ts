/**
 * Cadastro e leitura de conta via CPF+senha.
 * O CPF é traduzido em "email oculto" para o Supabase Auth
 * (`cpf-<11 dígitos>@precocerto.local`). O cliente nunca vê esse email.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cpfToEmail, isValidCpf, stripCpf } from "@/lib/cpf";
import { getAccessStatus, type AccessStatus } from "@/lib/paywall";

export type SignUpInput = {
  cpf: string;
  password: string;
  fullName: string;
  phone: string;
  address: {
    zip?: string;
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
  };
};

export type AccountView = {
  id: string;
  cpf: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  address: {
    street: string | null;
    number: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  trialEndsAt: string | null;
  paidUntil: string | null;
  status: AccessStatus;
};

type ProfileInsert = {
  id: string;
  cpf: string;
  full_name: string;
  phone: string;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
};

/** Aceita senha numérica de 6 dígitos (novo padrão) OU 8+ caracteres (usuários antigos). */
function isValidPassword(pw: string): boolean {
  if (!pw) return false;
  if (/^\d{6}$/.test(pw)) return true;
  return pw.length >= 8;
}

/**
 * Cadastra um novo cliente. Retorna as credenciais internas (email oculto)
 * para que o client rode `signInWithPassword` e obtenha a sessão.
 */
export const signUpWithCpf = createServerFn({ method: "POST" })
  .inputValidator((input: SignUpInput) => {
    if (!input) throw new Error("Dados obrigatórios");
    const cpf = stripCpf(input.cpf);
    if (!isValidCpf(cpf)) throw new Error("CPF inválido");
    if (!isValidPassword(input.password)) {
      throw new Error("Senha precisa ter 6 dígitos numéricos");
    }
    const fullName = (input.fullName ?? "").trim();
    if (fullName.length < 3) throw new Error("Informe seu nome completo");
    const phone = (input.phone ?? "").replace(/\D/g, "");
    if (phone.length < 10) throw new Error("Celular inválido");
    return { ...input, cpf, fullName, phone };
  })
  .handler(async ({ data }): Promise<{ hiddenEmail: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rejeita CPF já cadastrado com mensagem clara
    const { data: existing } = await supabaseAdmin
      .from("profiles" as never)
      .select("id")
      .eq("cpf", data.cpf)
      .maybeSingle();
    if (existing) throw new Error("CPF já cadastrado. Faça login.");

    const email = cpfToEmail(data.cpf);
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName, cpf: data.cpf },
      });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Falha ao criar usuário");
    }

    const row: ProfileInsert = {
      id: created.user.id,
      cpf: data.cpf,
      full_name: data.fullName,
      phone: data.phone,
      address_zip: (data.address.zip ?? "").replace(/\D/g, "") || null,
      address_street: data.address.street?.trim() || null,
      address_number: data.address.number?.trim() || null,
      address_district: data.address.district?.trim() || null,
      address_city: data.address.city?.trim() || null,
      address_state: data.address.state?.trim().toUpperCase().slice(0, 2) || null,
    };
    const table = supabaseAdmin.from("profiles" as never) as unknown as {
      insert: (v: ProfileInsert) => Promise<{ error: { message: string } | null }>;
    };
    const { error: insErr } = await table.insert(row);
    if (insErr) {
      // Rollback do usuário para não deixar órfão
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
      throw new Error(insErr.message);
    }

    return { hiddenEmail: email };
  });

/**
 * Retorna o "email oculto" a partir de um CPF válido — usado pelo client
 * antes de chamar `supabase.auth.signInWithPassword`.
 */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { cpf: string }) => {
    const cpf = stripCpf(input.cpf);
    if (!isValidCpf(cpf)) throw new Error("CPF inválido");
    return { cpf };
  })
  .handler(async ({ data }): Promise<{ hiddenEmail: string }> => {
    return { hiddenEmail: cpfToEmail(data.cpf) };
  });

/**
 * Retorna o perfil + status de acesso do usuário autenticado.
 */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountView | null> => {
    const { data, error } = await context.supabase
      .from("profiles" as never)
      .select(
        "id, cpf, full_name, phone, avatar_url, address_street, address_number, address_district, address_city, address_state, address_zip, trial_ends_at, paid_until",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as unknown as {
      id: string;
      cpf: string;
      full_name: string;
      phone: string;
      avatar_url: string | null;
      address_street: string | null;
      address_number: string | null;
      address_district: string | null;
      address_city: string | null;
      address_state: string | null;
      address_zip: string | null;
      trial_ends_at: string | null;
      paid_until: string | null;
    };

    return {
      id: row.id,
      cpf: row.cpf,
      fullName: row.full_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      address: {
        street: row.address_street,
        number: row.address_number,
        district: row.address_district,
        city: row.address_city,
        state: row.address_state,
        zip: row.address_zip,
      },
      trialEndsAt: row.trial_ends_at,
      paidUntil: row.paid_until,
      status: getAccessStatus({
        trial_ends_at: row.trial_ends_at,
        paid_until: row.paid_until,
      }),
    };
  });

/**
 * Atualiza o CPF do usuário autenticado. Valida dígito verificador,
 * rejeita duplicidade e sincroniza o "email oculto" no Supabase Auth.
 */
export const updateMyCpf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cpf: string }) => {
    const cpf = stripCpf(input?.cpf ?? "");
    if (!isValidCpf(cpf)) throw new Error("CPF inválido");
    return { cpf };
  })
  .handler(async ({ data, context }): Promise<{ cpf: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("profiles" as never)
      .select("id")
      .eq("cpf", data.cpf)
      .maybeSingle();
    if (existing && (existing as { id: string }).id !== context.userId) {
      throw new Error("CPF já cadastrado em outra conta.");
    }

    const email = cpfToEmail(data.cpf);
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      context.userId,
      { email, email_confirm: true, user_metadata: { cpf: data.cpf } },
    );
    if (authErr) throw new Error(authErr.message);

    const table = supabaseAdmin.from("profiles" as never) as unknown as {
      update: (v: { cpf: string }) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error: upErr } = await table.update({ cpf: data.cpf }).eq("id", context.userId);
    if (upErr) throw new Error(upErr.message);

    return { cpf: data.cpf };
  });

export type ProfileUpdateInput = {
  fullName: string;
  phone: string;
  address: {
    zip?: string;
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
  };
};

/**
 * Atualiza nome, telefone e endereço do usuário autenticado.
 * Valida no servidor mesmo se o cliente burlar.
 */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProfileUpdateInput) => {
    const fullName = (input?.fullName ?? "").trim();
    if (fullName.length < 3) throw new Error("Informe seu nome completo");
    const phone = (input?.phone ?? "").replace(/\D/g, "");
    if (phone.length < 10) throw new Error("Celular inválido");
    const zip = (input?.address?.zip ?? "").replace(/\D/g, "");
    if (zip && zip.length !== 8) throw new Error("CEP inválido");
    const state = (input?.address?.state ?? "").trim().toUpperCase().slice(0, 2);
    if (state && state.length !== 2) throw new Error("UF inválida");
    return {
      fullName,
      phone,
      address: {
        zip: zip || null,
        street: input?.address?.street?.trim() || null,
        number: input?.address?.number?.trim() || null,
        district: input?.address?.district?.trim() || null,
        city: input?.address?.city?.trim() || null,
        state: state || null,
      },
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const patch = {
      full_name: data.fullName,
      phone: data.phone,
      address_zip: data.address.zip,
      address_street: data.address.street,
      address_number: data.address.number,
      address_district: data.address.district,
      address_city: data.address.city,
      address_state: data.address.state,
    };
    const table = context.supabase.from("profiles" as never) as unknown as {
      update: (v: typeof patch) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await table.update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Atualiza a URL da foto de perfil (armazenada no bucket `avatars`).
 * O upload em si é feito pelo client via Supabase Storage; aqui apenas
 * persistimos o caminho relativo (ex.: `<userId>/avatar.jpg`).
 */
export const updateMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string | null }) => {
    const path = (input?.path ?? "").trim();
    if (path && path.length > 512) throw new Error("Caminho inválido");
    return { path: path || null };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const table = context.supabase.from("profiles" as never) as unknown as {
      update: (v: { avatar_url: string | null }) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await table
      .update({ avatar_url: data.path })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
