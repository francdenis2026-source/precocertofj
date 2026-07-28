import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Receipt,
  Send,
  CheckCircle2,
  Gift,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Copy,
  Loader2,
  LogIn,
  Upload,
  Clock,
  Mail,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageShellContent } from "@/components/layout/PageShell";
import { InternalPageHeader } from "@/components/layout/InternalPageHeader";

import { useSession } from "@/hooks/useSession";
import { COLLAB_EMAIL, collabMailtoHref } from "@/lib/collab-mailto";
import {
  getMyCollabToken,
  getMyCollabMonthProgress,
} from "@/lib/collab-token.functions";
import { getMyCollaboratorSubmissions } from "@/lib/collaborator.functions";
import { CollaboratorUploadForm } from "@/components/collab/CollaboratorUploadForm";

export const Route = createFileRoute("/colaborar")({
  head: () => ({
    meta: [
      { title: "Programa Colaborador · PreçoCerto" },
      {
        name: "description",
        content:
          "Área do colaborador: envie notas fiscais dos mercados de Feijó e ganhe 7 dias grátis por nota aprovada, até 30 dias por mês.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Programa Colaborador · PreçoCerto" },
      {
        property: "og:description",
        content:
          "Envie notas fiscais, acompanhe o status de cada envio e receba dias grátis automaticamente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollaboratePage,
});

/* -------------------------------------------------------------------------- */
/*  Página                                                                    */
/* -------------------------------------------------------------------------- */

function CollaboratePage() {
  const { user, loading } = useSession();

  return (
    <PageShell fit>
      <PageShellContent fit>
        <div className="container-page flex min-h-0 flex-1 flex-col overflow-y-auto pt-2 pb-3 md:pt-3">
          <InternalPageHeader
            title="Área do colaborador"
            highlight="colaborador"
            breadcrumbs={[{ label: "Início", to: "/" }, { label: "Colaborar" }]}
            description="Envie a nota, a equipe valida e seus dias grátis entram automaticamente — 7 dias por nota, até 30 por mês."
            className="mb-2"
          />

          {loading ? (
            <div role="status" aria-busy="true" className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="sr-only">Verificando sua sessão…</span>
            </div>
          ) : user ? (
            <CollaboratorWorkspace />
          ) : (
            <AuthGate />
          )}
        </div>
      </PageShellContent>
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Gate de acesso — conteúdo só para usuários autenticados                    */
/* -------------------------------------------------------------------------- */

function AuthGate() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      void navigate({
        to: "/login",
        search: { redirect: "/colaborar" },
        replace: true,
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <section
      role="status"
      className="mx-auto max-w-md rounded-xl border border-border bg-card p-5 text-center shadow-elev-1"
    >
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-gold/12 text-brand-gold">
        <LogIn className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <h2 className="mt-3 text-[16px] font-semibold tracking-tight text-foreground">
        Acesso restrito a membros
      </h2>
      <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
        Entre na sua conta para receber seu token, enviar notas e acompanhar os
        dias creditados. Redirecionando para o login…
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/login"
          search={{ redirect: "/colaborar" }}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-gold px-4 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-brand-navy transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          Entrar
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          to="/cadastro"
          search={{ redirect: "/colaborar" }}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-[12.5px] font-semibold text-foreground transition hover:border-brand-gold hover:text-brand-gold"
        >
          Criar conta grátis
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Workspace do colaborador                                                  */
/* -------------------------------------------------------------------------- */

function CollaboratorWorkspace() {
  const tokenFn = useServerFn(getMyCollabToken);
  const progressFn = useServerFn(getMyCollabMonthProgress);
  const submissionsFn = useServerFn(getMyCollaboratorSubmissions);

  const tokenQ = useQuery({
    queryKey: ["collab-my-token"],
    queryFn: () => tokenFn(),
    staleTime: 60 * 60_000,
  });
  const progQ = useQuery({
    queryKey: ["collab-my-progress"],
    queryFn: () => progressFn(),
    staleTime: 60_000,
  });
  const subsQ = useQuery({
    queryKey: ["collab-my-subs"],
    queryFn: () => submissionsFn(),
    staleTime: 30_000,
  });

  const token = tokenQ.data?.token ?? "";
  const cap = progQ.data?.monthly_cap ?? 30;
  const awarded = progQ.data?.days_awarded ?? 0;
  const remaining = progQ.data?.days_remaining ?? cap;
  const pct = cap > 0 ? Math.min(100, Math.round((awarded / cap) * 100)) : 0;
  const capReached = remaining <= 0;

  const subs = subsQ.data ?? [];
  const pending = useMemo(
    () => subs.filter((s) => s.status === "received" || s.status === "review").length,
    [subs],
  );
  const approved = useMemo(
    () => subs.filter((s) => s.status === "approved").length,
    [subs],
  );

  

  return (
    <div className="space-y-3">
      {/* Painel de status — token + progresso do mês */}
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Token */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-elev-1">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-gold">
            <KeyRound className="h-3 w-3" strokeWidth={2.6} aria-hidden />
            Seu token
          </p>
          <TokenDisplay token={token} loading={tokenQ.isLoading} />
          <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
            Identifica você em qualquer envio. No e-mail, mantenha o token no
            assunto ({" "}
            <span className="font-mono text-foreground">{COLLAB_EMAIL}</span> ).
          </p>
        </div>

        {/* Progresso */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-elev-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-gold">
              Progresso do mês
            </p>
            <p
              className="text-[11.5px] text-muted-foreground"
              aria-live="polite"
            >
              <strong className="text-foreground">{awarded}</strong> de {cap} dias
              creditados
            </p>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={awarded}
            aria-valuemin={0}
            aria-valuemax={cap}
            aria-label="Dias grátis creditados no mês"
          >
            <div
              className={
                "h-full rounded-full transition-[width] " +
                (capReached ? "bg-emerald-600" : "bg-brand-gold")
              }
              style={{ width: `${pct}%` }}
            />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            <Metric label="Restam" value={`${remaining} dias`} />
            <Metric label="Em análise" value={String(pending)} Icon={Clock} />
            <Metric label="Aprovadas" value={String(approved)} Icon={CheckCircle2} />
          </dl>
        </div>
      </section>

      {capReached && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-600/35 bg-emerald-500/8 p-3.5"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 flex-none text-emerald-700 dark:text-emerald-400"
            strokeWidth={2.4}
            aria-hidden
          />
          <p className="text-[12.5px] leading-snug text-foreground">
            <strong>Teto do mês atingido.</strong> Você já recebeu {cap} dias
            grátis. Novos envios voltam a gerar crédito no próximo mês — acompanhe
            em{" "}
            <Link to="/perfil" className="text-brand-gold underline">
              Meu perfil
            </Link>
            .
          </p>
        </div>
      )}

      {/* Layout em 2 colunas: envio à esquerda, histórico + regras à direita */}
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Coluna 1 — Enviar nota */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-elev-1">
          <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[14.5px] font-semibold tracking-tight text-foreground">
                <Upload className="mr-1 inline h-3.5 w-3.5 text-brand-gold" aria-hidden />
                Enviar nota
              </h2>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                Anexe as fotos — a validação é feita pela equipe e o crédito entra automaticamente.
              </p>
            </div>
            <a
              href={token ? collabMailtoHref(token) : undefined}
              aria-disabled={!token}
              className={
                "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold text-foreground transition hover:border-brand-gold hover:text-brand-gold " +
                (!token ? "pointer-events-none opacity-50" : "")
              }
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              E-mail
            </a>
          </div>
          {capReached ? (
            <p className="rounded-lg border border-dashed border-border bg-background/60 p-3 text-center text-[12.5px] text-muted-foreground">
              Envios pausados até o próximo mês: o teto de {cap} dias já foi creditado.
            </p>
          ) : (
            <CollaboratorUploadForm embedded />
          )}
        </div>

        {/* Coluna 2 — Envios + regras */}
        <div className="space-y-3">
          {/* Envios recentes */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-elev-1">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold tracking-tight text-foreground">
                <Receipt className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
                Meus envios
                {subs.length > 0 && (
                  <span className="rounded-full bg-brand-gold/15 px-1.5 text-[10.5px] font-bold text-brand-gold">
                    {subs.length}
                  </span>
                )}
              </h2>
            </div>
            {subsQ.isLoading ? (
              <div role="status" aria-busy="true" className="space-y-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : subsQ.isError ? (
              <p role="alert" className="text-[12px] text-destructive">
                Não foi possível carregar. Recarregue a página.
              </p>
            ) : subs.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-muted-foreground">
                Nenhum envio ainda. Comece pelo formulário ao lado.
              </p>
            ) : (
              <ul
                className="max-h-[220px] divide-y divide-border overflow-y-auto pr-1"
                aria-live="polite"
              >
                {subs.slice(0, 8).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 py-1.5 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-foreground">
                        {s.market_name ?? "Envio"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {formatDate(s.created_at)} · {s.receipts_count} nota(s)
                        {s.rejection_reason ? ` · ${s.rejection_reason}` : ""}
                      </p>
                    </div>
                    <StatusPill status={s.status} rewardDays={s.reward_days ?? 0} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Regras compactas */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-elev-1">
            <h2 className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold tracking-tight text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
              Como funciona
            </h2>
            <ol className="mt-2 grid grid-cols-3 gap-2">
              <Step n={1} Icon={Camera} title="Fotografe" text="Nota legível." />
              <Step n={2} Icon={Upload} title="Envie" text="App ou e-mail." />
              <Step n={3} Icon={Gift} title="Receba" text="+7 dias grátis." />
            </ol>
            <ul className="mt-2.5 space-y-1">
              <Rule text="7 dias por nota · teto 30 dias/mês." />
              <Rule text="Compra dos últimos 60 dias, mín. 5 itens." />
              <Rule warn text="Notas ilegíveis ou duplicadas são rejeitadas." />
            </ul>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Mail className="h-3 w-3 text-brand-gold" aria-hidden />
              Dúvidas?{" "}
              <Link to="/fale-conosco" className="underline">
                Fale conosco
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Peças                                                                     */
/* -------------------------------------------------------------------------- */

function Metric({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon?: typeof Clock;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 px-2.5 py-1.5">
      <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" aria-hidden />}
        {label}
      </dt>
      <dd className="mt-0.5 text-[13.5px] font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function TokenDisplay({ token, loading }: { token: string; loading: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Token copiado");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="select-all rounded-lg border border-brand-gold/35 bg-brand-gold/10 px-2.5 py-1.5 font-mono text-[15px] font-bold tracking-[0.12em] text-foreground">
        {loading ? "········" : token || "————————"}
      </span>
      <button
        type="button"
        onClick={copy}
        disabled={!token}
        aria-label="Copiar token de colaborador"
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold text-foreground transition hover:border-brand-gold hover:text-brand-gold disabled:opacity-40"
      >
        {copied ? (
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        )}
        {copied ? "copiado" : "copiar"}
      </button>
    </div>
  );
}

function StatusPill({ status, rewardDays }: { status: string; rewardDays: number }) {
  const map: Record<string, { label: string; cls: string }> = {
    received: { label: "Recebida", cls: "border-border bg-muted text-muted-foreground" },
    review: { label: "Em análise", cls: "border-brand-gold/40 bg-brand-gold/10 text-brand-gold" },
    approved: {
      label: "Aprovada",
      cls: "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    rejected: {
      label: "Não aceita",
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
    },
  };
  const s = map[status] ?? map.received;
  return (
    <div className="flex flex-none flex-col items-end gap-0.5">
      <span
        className={
          "rounded-full border px-2 py-0.5 text-[11px] font-semibold " + s.cls
        }
      >
        {s.label}
      </span>
      {status === "approved" && rewardDays > 0 && (
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          +{rewardDays} dias
        </span>
      )}
    </div>
  );
}

function Step({
  n,
  Icon,
  title,
  text,
}: {
  n: number;
  Icon: typeof Camera;
  title: string;
  text: string;
}) {
  return (
    <li className="flex gap-2.5">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-brand-gold/12 text-brand-gold">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground">
          <span className="text-brand-gold">{n}.</span> {title}
        </p>
        <p className="text-[11.5px] leading-snug text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}

function Rule({ text, warn = false }: { text: string; warn?: boolean }) {
  const Icon = warn ? AlertCircle : CheckCircle2;
  return (
    <li className="flex items-start gap-1.5 text-[12.5px] leading-snug text-foreground">
      <Icon
        className={
          "mt-0.5 h-3.5 w-3.5 flex-none " +
          (warn ? "text-destructive" : "text-brand-gold")
        }
        strokeWidth={2.2}
        aria-hidden
      />
      <span>{text}</span>
    </li>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "—";
  }
}
