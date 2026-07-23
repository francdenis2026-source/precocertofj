/**
 * Server functions administrativas para gestão de clientes.
 *
 * Todas exigem role admin (requireAdmin).
 *
 * - adminListCustomers: lista paginada de perfis com busca por nome/CPF/cidade
 * - adminGetCustomer: detalhe completo (perfil, papéis, licenças, acessos recentes, e-mail auth)
 * - adminUpdateCustomer: edita campos do profile
 * - adminResetCustomerPin: gera código de reset de PIN e retorna em texto plano
 *   (admin repassa ao cliente por qualquer canal)
 * - adminListLoginEvents: histórico de logins de um cliente ou geral
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import crypto from "crypto";

const RESET_CODE_TTL_MIN = 15;

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function generateNumericCode(len = 6) {
  let out = "";
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}
function stripCpf(s: string) {
  return (s || "").replace(/\D+/g, "");
}
function maskCpf(cpf: string | null | undefined) {
  const d = stripCpf(cpf || "");
  if (d.length !== 11) return cpf || "";
  return `${d.slice(0, 3)}.***.***-${d.slice(-2)}`;
}

// ============================================================================
// adminListCustomers
// ============================================================================
export const adminListCustomers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        search: z.string().trim().optional().default(""),
        limit: z.number().int().min(1).max(200).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
        sort: z
          .enum(["recent", "logins", "name", "last_seen"])
          .optional()
          .default("recent"),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, cpf, phone, city, neighborhood, created_at, last_seen_at, total_logins, trial_ends_at, paid_until",
        { count: "exact" },
      );

    const search = data.search?.trim();
    if (search) {
      const cpfDigits = stripCpf(search);
      const orParts = [
        `full_name.ilike.%${search}%`,
        `city.ilike.%${search}%`,
        `neighborhood.ilike.%${search}%`,
      ];
      if (cpfDigits) orParts.push(`cpf.ilike.%${cpfDigits}%`);
      q = q.or(orParts.join(","));
    }

    switch (data.sort) {
      case "logins":
        q = q.order("total_logins", { ascending: false, nullsFirst: false });
        break;
      case "name":
        q = q.order("full_name", { ascending: true, nullsFirst: false });
        break;
      case "last_seen":
        q = q.order("last_seen_at", { ascending: false, nullsFirst: false });
        break;
      default:
        q = q.order("created_at", { ascending: false });
    }

    const { data: rows, count, error } = await q.range(
      data.offset,
      data.offset + data.limit - 1,
    );
    if (error) throw new Error(error.message);

    // KPIs globais (cheap counts)
    const now = new Date();
    const in7 = new Date(now.getTime() - 7 * 86400_000).toISOString();
    const in30 = new Date(now.getTime() - 30 * 86400_000).toISOString();

    const [{ count: total }, { count: newLast7 }, { count: activeLast30 }, { count: paidActive }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", in7),
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", in30),
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("paid_until", now.toISOString()),
      ]);

    return {
      rows: (rows ?? []).map((r) => ({
        ...r,
        cpf_masked: maskCpf(r.cpf),
      })),
      pageTotal: count ?? 0,
      kpis: {
        total: total ?? 0,
        newLast7: newLast7 ?? 0,
        activeLast30: activeLast30 ?? 0,
        paidActive: paidActive ?? 0,
      },
    };
  });

// ============================================================================
// adminGetCustomer
// ============================================================================
export const adminGetCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Cliente não encontrado");

    const [rolesRes, licensesRes, loginsRes, authRes] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role, created_at").eq("user_id", data.userId),
      supabaseAdmin
        .from("license_codes")
        .select("id, code, status, plan_id, redeemed_at, expires_at, created_at")
        .or(`redeemed_by.eq.${data.userId},buyer_user_id.eq.${data.userId}`)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("login_events")
        .select("id, created_at, success, reason, ip_address, user_agent")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin.auth.admin.getUserById(data.userId),
    ]);

    const authUser = (authRes as { data?: { user?: { email?: string | null; email_confirmed_at?: string | null; last_sign_in_at?: string | null } } }).data?.user ?? null;

    return {
      profile: { ...profile, cpf_masked: maskCpf(profile.cpf) },
      roles: rolesRes.data ?? [],
      licenses: licensesRes.data ?? [],
      logins: loginsRes.data ?? [],
      email: authUser?.email ?? null,
      emailConfirmedAt: authUser?.email_confirmed_at ?? null,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
    };

  });

// ============================================================================
// adminUpdateCustomer
// ============================================================================
export const adminUpdateCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        patch: z.object({
          full_name: z.string().trim().max(120).optional(),
          phone: z.string().trim().max(30).optional(),
          city: z.string().trim().max(80).optional(),
          neighborhood: z.string().trim().max(80).optional(),
          address_street: z.string().trim().max(160).optional(),
          address_number: z.string().trim().max(20).optional(),
          address_district: z.string().trim().max(80).optional(),
          address_city: z.string().trim().max(80).optional(),
          address_state: z.string().trim().max(4).optional(),
          address_zip: z.string().trim().max(12).optional(),
        }),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = { ...data.patch, updated_at: new Date().toISOString() };
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "customer.update",
      target_type: "profile",
      target_id: data.userId,
      after: { fields: Object.keys(data.patch) },
    });

    return { ok: true };
  });

// ============================================================================
// adminResetCustomerPin
//   Gera código de 6 dígitos, grava hash em pin_reset_codes (TTL 15 min)
//   e devolve o código em texto plano ao admin para que ele repasse ao cliente.
// ============================================================================
export const adminResetCustomerPin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, cpf, phone")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) throw new Error("Cliente não encontrado");

    const code = generateNumericCode(6);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MIN * 60_000).toISOString();

    const { error: insErr } = await supabaseAdmin.from("pin_reset_codes").insert({
      user_id: profile.id,
      cpf: profile.cpf ?? "",
      phone_masked: profile.phone ? `••••${profile.phone.slice(-4)}` : "manual",
      code_hash: sha256(code),
      expires_at: expiresAt,
    });
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "customer.reset_pin",
      target_type: "profile",
      target_id: data.userId,
    });

    return { code, expiresAt, ttlMinutes: RESET_CODE_TTL_MIN };
  });

// ============================================================================
// adminListLoginEvents — auditoria geral (todos os clientes)
// ============================================================================
export const adminListLoginEvents = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(1000).optional().default(200),
        onlyFailures: z.boolean().optional().default(false),
        sinceDays: z.number().int().min(1).max(365).optional().default(30),
        ip: z.string().trim().optional().default(""),
        reason: z.string().trim().optional().default(""),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.sinceDays * 86400_000).toISOString();
    let q = supabaseAdmin
      .from("login_events")
      .select("id, user_id, email, cpf_masked, ip_address, user_agent, success, reason, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.onlyFailures) q = q.eq("success", false);
    if (data.ip) q = q.ilike("ip_address", `%${data.ip}%`);
    if (data.reason) q = q.ilike("reason", `%${data.reason}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================================
// adminGetLoginStats — agregados p/ gráficos (série temporal, top IPs, motivos)
// ============================================================================
export const adminGetLoginStats = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        sinceDays: z.number().int().min(1).max(90).optional().default(14),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.sinceDays * 86400_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("login_events")
      .select("created_at, success, reason, ip_address")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(10000);
    if (error) throw new Error(error.message);

    const buckets = new Map<string, { day: string; success: number; failure: number }>();
    const ipMap = new Map<string, number>();
    const reasonMap = new Map<string, number>();
    let totalSuccess = 0;
    let totalFailure = 0;

    for (const r of rows ?? []) {
      const day = (r.created_at ?? "").slice(0, 10);
      if (day) {
        const b = buckets.get(day) ?? { day, success: 0, failure: 0 };
        if (r.success) b.success++; else b.failure++;
        buckets.set(day, b);
      }
      if (r.success) totalSuccess++; else totalFailure++;
      if (!r.success) {
        const ip = r.ip_address ?? "desconhecido";
        ipMap.set(ip, (ipMap.get(ip) ?? 0) + 1);
        const reason = r.reason ?? "sem motivo";
        reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
      }
    }

    // Preenche dias faltantes p/ eixo contínuo
    const series: { day: string; success: number; failure: number }[] = [];
    for (let i = data.sinceDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      const b = buckets.get(d) ?? { day: d, success: 0, failure: 0 };
      series.push(b);
    }

    return {
      totalSuccess,
      totalFailure,
      total: totalSuccess + totalFailure,
      series,
      topIps: Array.from(ipMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([ip, count]) => ({ ip, count })),
      topReasons: Array.from(reasonMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([reason, count]) => ({ reason, count })),
    };
  });

// ============================================================================
// adminSuspendCustomer / adminReactivateCustomer
// ============================================================================
export const adminSuspendCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        reason: z.string().trim().min(3).max(300),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        suspended_at: now,
        suspended_reason: data.reason,
        updated_at: now,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    // Encerra sessões ativas do usuário no Auth (best-effort)
    try {
      await supabaseAdmin.auth.admin.signOut(data.userId);
    } catch {
      /* ignore */
    }

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "customer.suspend",
      target_type: "profile",
      target_id: data.userId,
      after: { reason: data.reason },
    });

    return { ok: true, suspendedAt: now };
  });

export const adminReactivateCustomer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        suspended_at: null,
        suspended_reason: null,
        updated_at: now,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "customer.reactivate",
      target_type: "profile",
      target_id: data.userId,
    });

    return { ok: true };
  });

// ============================================================================
// adminExportCustomers — devolve CSV completo (aplica busca/sort atuais)
// ============================================================================
export const adminExportCustomers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    z
      .object({
        search: z.string().trim().optional().default(""),
        sort: z
          .enum(["recent", "logins", "name", "last_seen"])
          .optional()
          .default("recent"),
        limit: z.number().int().min(1).max(5000).optional().default(2000),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, cpf, phone, city, neighborhood, address_street, address_number, address_district, address_city, address_state, address_zip, created_at, last_seen_at, total_logins, trial_ends_at, paid_until, suspended_at, suspended_reason",
      );

    const search = data.search?.trim();
    if (search) {
      const cpfDigits = stripCpf(search);
      const orParts = [
        `full_name.ilike.%${search}%`,
        `city.ilike.%${search}%`,
        `neighborhood.ilike.%${search}%`,
      ];
      if (cpfDigits) orParts.push(`cpf.ilike.%${cpfDigits}%`);
      q = q.or(orParts.join(","));
    }

    switch (data.sort) {
      case "logins":
        q = q.order("total_logins", { ascending: false, nullsFirst: false });
        break;
      case "name":
        q = q.order("full_name", { ascending: true, nullsFirst: false });
        break;
      case "last_seen":
        q = q.order("last_seen_at", { ascending: false, nullsFirst: false });
        break;
      default:
        q = q.order("created_at", { ascending: false });
    }

    const { data: rows, error } = await q.limit(data.limit);
    if (error) throw new Error(error.message);

    const headers = [
      "Nome",
      "CPF",
      "Telefone",
      "Cidade",
      "Bairro",
      "Endereço",
      "Cadastro",
      "Último acesso",
      "Total de acessos",
      "Trial até",
      "Pago até",
      "Suspenso em",
      "Motivo suspensão",
    ];

    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const fmt = (v: string | null | undefined) =>
      v ? new Date(v).toLocaleString("pt-BR") : "";

    const body = (rows ?? []).map((r) =>
      [
        r.full_name ?? "",
        maskCpf(r.cpf),
        r.phone ?? "",
        r.city ?? "",
        r.neighborhood ?? "",
        [r.address_street, r.address_number, r.address_district, r.address_city, r.address_state, r.address_zip]
          .filter(Boolean)
          .join(", "),
        fmt(r.created_at),
        fmt(r.last_seen_at),
        r.total_logins ?? 0,
        fmt(r.trial_ends_at),
        fmt(r.paid_until),
        fmt(r.suspended_at),
        r.suspended_reason ?? "",
      ]
        .map(esc)
        .join(","),
    );

    const csv = [headers.map(esc).join(","), ...body].join("\r\n");
    return {
      csv,
      count: rows?.length ?? 0,
      filename: `clientes-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  });
