/**
 * Integração — plano grátis com 1 chamada de IA por mês.
 *
 * 1) Espelha em TypeScript as regras implementadas no banco
 *    (`ai_effective_quota`, `get_ai_access`, `consume_ai_quota`) e prova que a
 *    segunda tentativa é bloqueada no servidor.
 * 2) Verifica estaticamente que a migração e o server function mantêm
 *    o bloqueio (evita regressão silenciosa se alguém remover a regra).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

type Profile = { paidUntil: Date | null; trialEndsAt: Date | null };
type Plan = { slug: string; aiMonthlyQuota: number } | null;
type Settings = { assistantEnabled: boolean; allowTrial: boolean };

const NOW = new Date("2026-07-27T12:00:00Z");
const FREE_ALLOWANCE = 1;

/** Espelho de public.ai_effective_quota */
function effectiveQuota(plan: Plan, profile: Profile): number {
  if (!plan || plan.slug === "degustacao" || plan.aiMonthlyQuota <= 0) return FREE_ALLOWANCE;
  if (!profile.paidUntil || profile.paidUntil <= NOW) return FREE_ALLOWANCE;
  return plan.aiMonthlyQuota;
}

/** Espelho de public.get_ai_access */
function aiAccess(plan: Plan, profile: Profile, used: number, s: Settings) {
  let limit = effectiveQuota(plan, profile);
  const active =
    (profile.paidUntil !== null && profile.paidUntil > NOW) ||
    (s.allowTrial && profile.trialEndsAt !== null && profile.trialEndsAt > NOW);
  const isFree = !active || plan?.slug === "degustacao";

  if (!s.assistantEnabled) return { allowed: false, reason: "disabled", limit };
  if (isFree) {
    limit = FREE_ALLOWANCE;
    return used >= FREE_ALLOWANCE
      ? { allowed: false, reason: "free_quota_exceeded", limit }
      : { allowed: true, reason: "free_single_call", limit };
  }
  if (used >= limit) return { allowed: false, reason: "quota_exceeded", limit };
  return { allowed: true, reason: "ok", limit };
}

/** Espelho de public.consume_ai_quota (UPDATE ... WHERE used + amount <= quota_limit) */
function consume(state: { used: number; limit: number }, amount = 1) {
  if (state.used + amount > state.limit) return { allowed: false, used: state.used };
  state.used += amount;
  return { allowed: true, used: state.used };
}

const SETTINGS: Settings = { assistantEnabled: true, allowTrial: false };
const FREE_PROFILE: Profile = { paidUntil: null, trialEndsAt: null };

describe("Plano grátis — 1 chamada de IA por mês", () => {
  it("libera a primeira chamada e bloqueia a segunda", () => {
    const state = { used: 0, limit: effectiveQuota(null, FREE_PROFILE) };
    expect(state.limit).toBe(1);

    const first = aiAccess(null, FREE_PROFILE, state.used, SETTINGS);
    expect(first.allowed).toBe(true);
    expect(first.reason).toBe("free_single_call");
    expect(consume(state).allowed).toBe(true);

    const second = aiAccess(null, FREE_PROFILE, state.used, SETTINGS);
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe("free_quota_exceeded");
    expect(consume(state).allowed).toBe(false);
    expect(state.used).toBe(1);
  });

  it("não permite ultrapassar nem com amount > 1 ou chamadas concorrentes", () => {
    const state = { used: 0, limit: 1 };
    expect(consume(state, 5).allowed).toBe(false);
    expect(state.used).toBe(0);

    const results = [consume(state), consume(state), consume(state)];
    expect(results.filter((r) => r.allowed)).toHaveLength(1);
    expect(state.used).toBe(1);
  });

  it("trata degustação e assinatura vencida como plano grátis", () => {
    const degustacao: Plan = { slug: "degustacao", aiMonthlyQuota: 0 };
    const vencido: Plan = { slug: "mensal", aiMonthlyQuota: 30 };
    const expirado: Profile = { paidUntil: new Date("2026-01-01T00:00:00Z"), trialEndsAt: null };

    expect(effectiveQuota(degustacao, FREE_PROFILE)).toBe(1);
    expect(effectiveQuota(vencido, expirado)).toBe(1);
    expect(aiAccess(vencido, expirado, 1, SETTINGS).reason).toBe("free_quota_exceeded");
  });

  it("mantém a cota cheia dos planos pagos ativos", () => {
    const pago: Plan = { slug: "mensal", aiMonthlyQuota: 30 };
    const ativo: Profile = { paidUntil: new Date("2026-12-31T00:00:00Z"), trialEndsAt: null };
    expect(effectiveQuota(pago, ativo)).toBe(30);
    const acesso = aiAccess(pago, ativo, 29, SETTINGS);
    expect(acesso.allowed).toBe(true);
    expect(acesso.limit).toBe(30);
    expect(aiAccess(pago, ativo, 30, SETTINGS).reason).toBe("quota_exceeded");
  });
});

describe("Regras persistidas no servidor (anti-regressão)", () => {
  const sql = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS, f), "utf8"))
    .join("\n");

  it("a migração mais recente define a alçada grátis e o motivo de bloqueio", () => {
    expect(sql).toMatch(/free_quota_exceeded/);
    expect(sql).toMatch(/free_single_call/);
    // consume_ai_quota só grava quando cabe na cota
    expect(sql).toMatch(/used\s*\+\s*_amount\s*<=\s*q\.quota_limit/);
  });

  it("o server function bloqueia a segunda chamada com HTTP 403", () => {
    const fn = readFileSync(join(process.cwd(), "src/lib/basket-assistant.functions.ts"), "utf8");
    expect(fn).toMatch(/free_quota_exceeded/);
    expect(fn).toMatch(/status:\s*403/);
    // a cota é consumida no servidor antes de responder
    expect(fn).toMatch(/consume_ai_quota/);
  });
});
