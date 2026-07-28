import { useSyncExternalStore } from "react";

/* ============================================================
 * PreçoCerto — Admin Store (frontend-only, localStorage)
 * Preparado para migração futura ao Supabase sem retrabalho.
 * ============================================================ */

const KEY = "precocerto.admin.v1";

export type BillingCycle = "trial" | "monthly" | "semester" | "yearly";

export interface Plan {
  id: string;
  name: string;
  cycle: BillingCycle;
  days: number;
  price: number;
  originalPrice?: number;
  description: string;
  features: string[];
  active: boolean;
  highlight?: boolean;
}

export interface Integrations {
  mercadoPago: {
    publicKey: string;
    accessToken: string;
    webhookSecret: string;
    enabled: boolean;
    env: "sandbox" | "production";
  };
  gemini: {
    apiKey: string;
    model: string;
    enabled: boolean;
  };
  openai: {
    apiKey: string;
    model: string;
    enabled: boolean;
    freeMode: boolean;
  };
  email: {
    fromName: string;
    fromEmail: string;
    provider: "lovable" | "resend" | "smtp";
    enabled: boolean;
  };
}

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  planId: string;
  status: "trial" | "active" | "expired" | "canceled";
  activationCode: string;
  startedAt: string;
  expiresAt: string;
  emailSent: boolean;
  paymentId?: string;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "sent" | "queued" | "failed";
  type: "activation" | "renewal" | "trial";
}

export interface AdminState {
  plans: Plan[];
  integrations: Integrations;
  subscribers: Subscriber[];
  emails: EmailLog[];
}

const defaultPlans: Plan[] = [
  {
    id: "trial-30",
    name: "Teste Grátis",
    cycle: "trial",
    days: 30,
    price: 0,
    description: "Experimente todos os recursos por 30 dias, sem cartão.",
    features: ["Acesso completo", "Comparador ilimitado", "Alertas de preço", "Suporte por e-mail"],
    active: true,
  },
  {
    id: "monthly-30",
    name: "Mensal",
    cycle: "monthly",
    days: 30,
    price: 19.9,
    description: "Ideal para quem quer economizar todo mês.",
    features: ["Tudo do Teste Grátis", "Histórico de preços", "Exportar listas", "Sem anúncios"],
    active: true,
  },
  {
    id: "semester-180",
    name: "Semestral",
    cycle: "semester",
    days: 180,
    price: 99.9,
    originalPrice: 119.4,
    description: "Economize 16% pagando 6 meses.",
    features: ["Tudo do Mensal", "Prioridade nos alertas", "Relatórios mensais", "2 meses grátis"],
    active: true,
    highlight: true,
  },
  {
    id: "yearly-365",
    name: "Anual",
    cycle: "yearly",
    days: 365,
    price: 179.9,
    originalPrice: 238.8,
    description: "Economize 24% pagando o ano inteiro.",
    features: ["Tudo do Semestral", "Beta de novos recursos", "Suporte VIP"],
    active: true,
  },
];

const defaultState: AdminState = {
  plans: defaultPlans,
  integrations: {
    mercadoPago: { publicKey: "", accessToken: "", webhookSecret: "", enabled: false, env: "sandbox" },
    gemini: { apiKey: "", model: "gemini-2.0-flash", enabled: false },
    openai: { apiKey: "", model: "gpt-4o-mini", enabled: false, freeMode: true },
    email: { fromName: "PreçoCerto", fromEmail: "no-reply@precocerto.app", provider: "lovable", enabled: true },
  },
  subscribers: [],
  emails: [],
};

// ---------- Store primitives ----------

const listeners = new Set<() => void>();

function read(): AdminState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AdminState>;
    return {
      plans: parsed.plans ?? defaultState.plans,
      integrations: { ...defaultState.integrations, ...parsed.integrations },
      subscribers: parsed.subscribers ?? [],
      emails: parsed.emails ?? [],
    };
  } catch {
    return defaultState;
  }
}

function write(state: AdminState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAdmin(): AdminState {
  return useSyncExternalStore(subscribe, read, () => defaultState);
}

// ---------- Actions ----------

function makeCode(): string {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const g = () =>
    Array.from({ length: 4 }, () => s[Math.floor(Math.random() * s.length)]).join("");
  return `PC-${g()}-${g()}-${g()}`;
}

function makeEmail(to: string, name: string, plan: Plan, code: string, expiresAt: string): EmailLog {
  const isTrial = plan.cycle === "trial";
  const subject = isTrial
    ? `🎁 Seu acesso gratuito ao PreçoCerto foi ativado`
    : `✅ Assinatura PreçoCerto — ${plan.name} confirmada`;
  const body = [
    `Olá, ${name}!`,
    ``,
    isTrial
      ? `Seu teste gratuito de ${plan.days} dias foi ativado com sucesso.`
      : `Recebemos sua assinatura do plano ${plan.name} e ela já está ativa.`,
    ``,
    `Código de ativação:  ${code}`,
    `Válido até:          ${new Date(expiresAt).toLocaleDateString("pt-BR")}`,
    ``,
    `Como usar:`,
    `1. Abra o app do PreçoCerto`,
    `2. Faça login com este e-mail`,
    `3. Insira o código de ativação em Perfil → Assinatura`,
    ``,
    `Se precisar de ajuda, responda este e-mail.`,
    `— Equipe PreçoCerto`,
  ].join("\n");
  return {
    id: crypto.randomUUID(),
    to,
    subject,
    body,
    sentAt: new Date().toISOString(),
    status: "sent",
    type: isTrial ? "trial" : "activation",
  };
}

export const admin = {
  // Plans
  savePlan(plan: Plan) {
    const state = read();
    const idx = state.plans.findIndex((p) => p.id === plan.id);
    const plans = idx >= 0 ? state.plans.map((p) => (p.id === plan.id ? plan : p)) : [...state.plans, plan];
    write({ ...state, plans });
  },
  removePlan(id: string) {
    const state = read();
    write({ ...state, plans: state.plans.filter((p) => p.id !== id) });
  },
  togglePlan(id: string) {
    const state = read();
    write({
      ...state,
      plans: state.plans.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    });
  },
  // Integrations
  updateIntegrations(patch: Partial<Integrations>) {
    const state = read();
    write({ ...state, integrations: { ...state.integrations, ...patch } });
  },
  // Subscribers (com envio de código por e-mail simulado)
  createSubscription(input: { name: string; email: string; planId: string; paymentId?: string }): Subscriber {
    const state = read();
    const plan = state.plans.find((p) => p.id === input.planId);
    if (!plan) throw new Error("Plano não encontrado");
    const now = new Date();
    const expires = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);
    const sub: Subscriber = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      planId: plan.id,
      status: plan.cycle === "trial" ? "trial" : "active",
      activationCode: makeCode(),
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      emailSent: true,
      paymentId: input.paymentId,
    };
    const email = makeEmail(sub.email, sub.name, plan, sub.activationCode, sub.expiresAt);
    write({
      ...state,
      subscribers: [sub, ...state.subscribers],
      emails: [email, ...state.emails],
    });
    return sub;
  },
  resendCode(subscriberId: string) {
    const state = read();
    const sub = state.subscribers.find((s) => s.id === subscriberId);
    if (!sub) return;
    const plan = state.plans.find((p) => p.id === sub.planId);
    if (!plan) return;
    const email = makeEmail(sub.email, sub.name, plan, sub.activationCode, sub.expiresAt);
    write({ ...state, emails: [email, ...state.emails] });
  },
  cancelSubscription(id: string) {
    const state = read();
    write({
      ...state,
      subscribers: state.subscribers.map((s) => (s.id === id ? { ...s, status: "canceled" } : s)),
    });
  },
  resetAll() {
    write(defaultState);
  },
};
