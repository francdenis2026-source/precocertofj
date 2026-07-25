import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Mail,
  Receipt,
  Camera,
  Send,
  CheckCircle2,
  Gift,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  KeyRound,
  Copy,
  Loader2,
  LogIn,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/brand/AppShell";
import { SocialProofStrip } from "@/components/collab/SocialProofStrip";
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
          "Envie suas notas fiscais e ganhe até 30 dias grátis por mês. Programa exclusivo para usuários cadastrados no PreçoCerto Feijó.",
      },
      { property: "og:title", content: "Programa Colaborador · PreçoCerto" },
      {
        property: "og:description",
        content:
          "Ganhe 7 dias grátis por nota aprovada, até 30 dias/mês. Programa exclusivo para colaboradores cadastrados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollaboratePage,
});

function CollaboratePage() {
  const { user, loading } = useSession();
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:px-6">
        <Header />
        <div className="mt-6">
          <SocialProofStrip />
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : user ? (
          <CollaboratorPanel />
        ) : (
          <VisitorCTA />
        )}

        <HowItWorks />
        <Eligibility />
      </main>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */

function Header() {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/8 via-card to-background p-6 md:p-9">
      <span
        aria-hidden
        className="absolute left-8 top-0 h-1 w-20 rounded-b-full bg-primary"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
      />
      <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
        <Sparkles className="h-3 w-3" strokeWidth={2.6} />
        Programa exclusivo
      </p>
      <h1 className="mt-3 font-display text-[30px] leading-[1.05] tracking-tight text-foreground md:text-[38px]">
        Colabore com o PreçoCerto.{" "}
        <span className="text-primary">Ganhe até 30 dias grátis por mês.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
        Um programa para usuários cadastrados: você envia notas fiscais dos mercados de Feijó,
        a equipe valida, e você ganha <strong className="text-foreground">7 dias grátis por nota aprovada</strong>,
        até o teto de <strong className="text-foreground">30 dias por mês</strong>.
      </p>
    </header>
  );
}

/* -------------------------------------------------------------------------- */

function VisitorCTA() {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LogIn className="h-6 w-6" strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[22px] font-bold tracking-tight text-foreground">
            Programa exclusivo para membros
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            Para participar do programa colaborador é necessário ter uma conta no PreçoCerto.
            Assim conseguimos vincular suas notas à sua conta e creditar automaticamente
            os dias grátis quando aprovadas.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/cadastro"
              search={{ redirect: "/colaborar" }}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_2px_0_0_rgb(0_0_0/0.08)] transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Criar conta grátis
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </Link>
            <Link
              to="/login"
              search={{ redirect: "/colaborar" }}
              className="inline-flex h-11 items-center rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Já tenho conta · Entrar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function CollaboratorPanel() {
  const tokenFn = useServerFn(getMyCollabToken);
  const progressFn = useServerFn(getMyCollabMonthProgress);
  const submissionsFn = useServerFn(getMyCollaboratorSubmissions);

  const { data: tok } = useQuery({
    queryKey: ["collab-my-token"],
    queryFn: () => tokenFn(),
    staleTime: 60 * 60_000,
  });
  const { data: prog } = useQuery({
    queryKey: ["collab-my-progress"],
    queryFn: () => progressFn(),
    staleTime: 60_000,
  });
  const { data: subs } = useQuery({
    queryKey: ["collab-my-subs"],
    queryFn: () => submissionsFn(),
    staleTime: 30_000,
  });

  const token = tok?.token ?? "";
  const cap = prog?.monthly_cap ?? 30;
  const awarded = prog?.days_awarded ?? 0;
  const remaining = prog?.days_remaining ?? cap;
  const pct = cap > 0 ? Math.min(100, Math.round((awarded / cap) * 100)) : 0;
  const capReached = remaining <= 0;

  return (
    <section className="mt-6 space-y-4">
      {/* Card do token + envio */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/8 via-card to-background p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              <KeyRound className="h-3 w-3" strokeWidth={2.6} />
              Seu token de colaborador
            </p>
            <TokenDisplay token={token} />
            <p className="mt-2 max-w-md text-[12px] leading-relaxed text-muted-foreground">
              Envie o e-mail sempre com este token no assunto. Ele vincula automaticamente
              a nota fiscal à sua conta.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <a
              href={token && !capReached ? collabMailtoHref(token) : undefined}
              aria-disabled={!token || capReached}
              className={
                "inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_2px_0_0_rgb(0_0_0/0.08)] transition hover:-translate-y-0.5 hover:bg-primary/90 " +
                (!token || capReached ? "pointer-events-none opacity-50" : "")
              }
            >
              <Send className="h-4 w-4" strokeWidth={2.4} />
              Enviar nota por e-mail
            </a>
            <div className="text-[11px] text-muted-foreground">
              destinatário: <span className="font-mono text-foreground">{COLLAB_EMAIL}</span>
            </div>
          </div>
        </div>

        {/* Progresso mensal */}
        <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-display text-[15px] font-bold text-foreground">
              Progresso do mês
            </div>
            <div className="text-[12px] text-muted-foreground">
              {awarded} de {cap} dias creditados · restam <strong className="text-foreground">{remaining}</strong>
            </div>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={"h-full rounded-full transition-[width] " + (capReached ? "bg-emerald-600" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            +7 dias por nota aprovada. Envie até <strong>5 notas por mês</strong> para bater o teto.
          </p>
        </div>

        {/* Aviso de bloqueio ao atingir o teto */}
        {capReached && (
          <div
            role="status"
            className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4"
          >
            <CheckCircle2
              className="mt-0.5 h-5 w-5 flex-none text-emerald-600 dark:text-emerald-400"
              strokeWidth={2.4}
            />
            <div className="min-w-0">
              <p className="font-display text-[14.5px] font-bold text-emerald-800 dark:text-emerald-200">
                Você já ganhou os 30 dias grátis deste mês 🎉
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">
                O teto mensal por conta foi atingido. Novos envios só voltam a gerar
                crédito no <strong>próximo mês</strong>. Você pode acompanhar seus dias
                em <Link to="/perfil" className="underline">Meu Perfil</Link>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload direto pelo app (só quando ainda há dias no mês) */}
      {!capReached && <CollaboratorUploadForm />}


      {/* Histórico */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" strokeWidth={2.4} />
          <h2 className="font-display text-[18px] font-bold tracking-tight text-foreground">
            Meus envios
          </h2>
        </div>
        {!subs ? (
          <div className="mt-4 flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : subs.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Você ainda não enviou nenhuma nota. Clique em <strong>Enviar nota por e-mail</strong> acima
            e anexe a foto da sua compra.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {subs.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-[13.5px] text-foreground">
                    {s.market_name ?? "Envio"}{" "}
                    <span className="text-muted-foreground">
                      · {formatDate(s.created_at)}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {s.city ?? "—"} · {s.receipts_count} nota(s)
                    {s.rejection_reason ? ` · Motivo: ${s.rejection_reason}` : ""}
                  </div>
                </div>
                <StatusPill status={s.status} rewardDays={s.reward_days ?? 0} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TokenDisplay({ token }: { token: string }) {
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
    <div className="mt-2 inline-flex items-center gap-2">
      <span className="select-all rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[16px] font-bold tracking-widest text-primary">
        {token || "————————"}
      </span>
      <button
        type="button"
        onClick={copy}
        disabled={!token}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11.5px] font-semibold text-foreground hover:bg-muted disabled:opacity-40"
      >
        {copied ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.4} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={2.4} />
        )}
        {copied ? "copiado" : "copiar"}
      </button>
    </div>
  );
}

function StatusPill({ status, rewardDays }: { status: string; rewardDays: number }) {
  const map: Record<string, { label: string; cls: string }> = {
    received: { label: "Recebida", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    review: { label: "Em análise", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
    approved: { label: "Aprovada", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
    rejected: { label: "Não aceita", cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" },
  };
  const s = map[status] ?? map.received;
  return (
    <div className="flex flex-col items-end gap-1">
      <span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + s.cls}>
        {s.label}
      </span>
      {status === "approved" && rewardDays > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <Gift className="h-3 w-3" strokeWidth={2.6} />+{rewardDays} dias
        </span>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "—";
  }
}

/* -------------------------------------------------------------------------- */

function HowItWorks() {
  return (
    <section aria-labelledby="steps-title" className="mt-8">
      <h2
        id="steps-title"
        className="font-display text-[22px] font-bold tracking-tight text-foreground"
      >
        Como funciona
      </h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-2">
        <Step n={1} Icon={LogIn} title="Entre na sua conta" text="O programa é exclusivo para membros cadastrados. Isso evita fraudes e garante seu crédito." />
        <Step n={2} Icon={Camera} title="Fotografe a nota" text="Frente completa, sem cortes. Nome do mercado e preços precisam estar legíveis." />
        <Step n={3} Icon={Mail} title="Envie com seu token" text="O botão acima abre o e-mail com seu token no assunto. Não altere essa linha." />
        <Step n={4} Icon={Gift} title="Receba 7 dias por nota" text="Até 30 dias por mês. O crédito entra automaticamente após a validação." />
      </ol>
    </section>
  );
}

function Eligibility() {
  return (
    <section aria-labelledby="elig-title" className="mt-8">
      <h2
        id="elig-title"
        className="flex items-center gap-2 font-display text-[22px] font-bold tracking-tight text-foreground"
      >
        <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={2.4} />
        Regras do programa
      </h2>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        <EligItem ok text="7 dias grátis por cada nota aprovada." />
        <EligItem ok text="Teto de 30 dias por mês por conta." />
        <EligItem ok text="Nota legível de mercado, farmácia ou distribuidora, com data visível." />
        <EligItem ok text="Compra feita nos últimos 60 dias." />
        <EligItem ok text="Ao menos 5 itens com preço claro por unidade ou por kg/L." />
        <EligItem warn text="Notas ilegíveis, duplicadas ou adulteradas são rejeitadas." />
      </ul>
    </section>
  );
}

function Step({
  n,
  Icon,
  title,
  text,
}: {
  n: number;
  Icon: typeof Mail;
  title: string;
  text: string;
}) {
  return (
    <li className="relative flex gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <div className="min-w-0">
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-primary">
          Passo {n}
        </span>
        <h3 className="mt-0.5 font-display text-[15.5px] font-bold text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </li>
  );
}

function EligItem({
  text,
  ok = false,
  warn = false,
}: {
  text: string;
  ok?: boolean;
  warn?: boolean;
}) {
  const Icon = warn ? AlertCircle : CheckCircle2;
  const tone = warn
    ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
    : "border-border bg-card text-foreground";
  const iconTone = warn ? "text-amber-600 dark:text-amber-400" : "text-primary";
  return (
    <li className={"flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] " + tone}>
      <Icon className={"h-4 w-4 flex-none " + iconTone} strokeWidth={2.4} />
      <span>{text}</span>
      {ok && null}
    </li>
  );
}
