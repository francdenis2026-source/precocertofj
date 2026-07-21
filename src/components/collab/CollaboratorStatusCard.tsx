import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Gift,
  Clock,
  CheckCircle2,
  XCircle,
  MailOpen,
  ArrowRight,
  Receipt,
} from "lucide-react";
import {
  getMyCollaboratorSubmissions,
  type MySubmission,
} from "@/lib/collaborator.functions";
import { collabMailtoHref } from "@/lib/collab-mailto";

type StatusInfo = {
  label: string;
  tone: string;
  Icon: typeof Clock;
  description: string;
};

const STATUS_MAP: Record<MySubmission["status"], StatusInfo> = {
  received: {
    label: "Recebido",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    Icon: MailOpen,
    description: "Sua nota chegou e está na fila de conferência.",
  },
  review: {
    label: "Em análise",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    Icon: Clock,
    description: "Nossa equipe está validando os preços e o mercado.",
  },
  approved: {
    label: "Aprovado",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    Icon: CheckCircle2,
    description: "Brinde liberado! Obrigado por colaborar.",
  },
  rejected: {
    label: "Não aceito",
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    Icon: XCircle,
    description: "Ver observações ao lado. Você pode enviar novamente.",
  },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Card no /perfil que mostra o status dos envios de nota fiscal
 * pelo próprio usuário: recebido, em análise, aprovado ou não aceito.
 */
export function CollaboratorStatusCard() {
  const fetchMine = useServerFn(getMyCollaboratorSubmissions);
  const { data, isLoading } = useQuery({
    queryKey: ["my-collab-submissions"],
    queryFn: () => fetchMine(),
    staleTime: 60_000,
  });

  const rows = data ?? [];
  const approvedCount = rows.filter((r) => r.status === "approved").length;
  const rewardGranted = rows.some((r) => r.reward_granted);

  return (
    <section
      aria-labelledby="collab-status-title"
      className="rounded-2xl border border-border bg-card"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Gift className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <h2
              id="collab-status-title"
              className="font-display text-[17px] font-bold tracking-tight text-foreground"
            >
              Meus 30 dias colaborador
            </h2>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Acompanhe o status das notas fiscais que você enviou por e-mail.
          </p>
        </div>
        {rewardGranted && (
          <span className="inline-flex flex-none items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.6} />
            Brinde liberado
          </span>
        )}
      </header>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-14 animate-pulse rounded-xl bg-muted" />
            <div className="h-14 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <SummaryTile label="Envios" value={rows.length} />
              <SummaryTile label="Aprovados" value={approvedCount} />
              <SummaryTile
                label="Brinde"
                value={rewardGranted ? "Sim" : "—"}
                accent={rewardGranted}
              />
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {rows.map((r) => {
                const info = STATUS_MAP[r.status];
                const Icon = info.Icon;
                return (
                  <li key={r.id} className="flex items-start gap-3 p-3">
                    <span
                      className={
                        "mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg border " +
                        info.tone
                      }
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.4} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate text-[13.5px] font-semibold text-foreground">
                          {r.market_name || "Mercado não informado"}
                        </span>
                        <span
                          className={
                            "inline-flex flex-none items-center rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide " +
                            info.tone
                          }
                        >
                          {info.label}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-muted-foreground">
                        <span>{r.city ?? "cidade não informada"}</span>
                        <span>•</span>
                        <span>Compra: {fmtDate(r.purchase_date)}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Receipt className="h-3 w-3" strokeWidth={2.4} />
                          {r.receipts_count} nota{r.receipts_count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {r.admin_notes?.trim() || info.description}
                      </p>
                      {r.status === "rejected" && r.rejection_reason && (
                        <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-2 text-[12px] leading-relaxed text-rose-800 dark:text-rose-200">
                          <strong className="font-bold">Motivo: </strong>
                          {r.rejection_reason}
                        </div>
                      )}
                      {r.status === "approved" && r.reward_days ? (
                        <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-[12px] font-semibold text-emerald-800 dark:text-emerald-200">
                          +{r.reward_days} dia(s) de acesso gratuito adicionados
                        </div>
                      ) : null}
                    </div>

                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href={collabMailtoHref()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[13px] font-bold text-primary-foreground shadow-[0_2px_0_0_rgb(0_0_0/0.08)] transition hover:-translate-y-0.5 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Enviar nova nota fiscal
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </a>
          <Link
            to="/colaborar"
            className="inline-flex h-10 items-center gap-1 rounded-full border border-border bg-background px-4 text-[13px] font-semibold text-foreground hover:bg-muted"
          >
            Como funciona
          </Link>
        </div>
      </div>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-2 " +
        (accent
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-background")
      }
    >
      <div className="font-display text-[20px] font-bold leading-none tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background p-4 text-center">
      <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Receipt className="h-5 w-5" strokeWidth={2.4} />
      </div>
      <h3 className="mt-2 font-display text-[15px] font-bold text-foreground">
        Você ainda não enviou notas fiscais
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
        Envie o comprovante da sua compra para{" "}
        <span className="font-mono font-semibold text-foreground">economizafeijo@gmail.com</span> e
        receba 30 dias de acesso completo após conferência da equipe.
      </p>
    </div>
  );
}
