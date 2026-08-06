import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { Price } from "@/components/ds/Price";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  ArrowLeft,
  ExternalLink,
  Filter,
  Loader2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useMyRoles } from "@/hooks/useMyRoles";
import {
  cleanupExpiredEvidence,
  getReportEvidenceSignedUrl,
  listAdminPriceReports,
  reviewPriceReport,
  type AdminPriceReport,
} from "@/lib/stores-public.functions";
import { purgeUnreferencedScanFiles } from "@/lib/storage-cleanup.functions";
import { AppShell } from "@/components/brand/AppShell";

export const Route = createFileRoute("/admin_/reports")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Reportes de preço — Admin" },
      { name: "description", content: "Revisão de reportes de preço enviados pelos usuários." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Navigate to="/admin/metricas" search={{ tab: "relatorios" } as never} replace />,
});

export function AdminReportsGate() {
  const { user, loading, isAdmin } = useMyRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <h1 className="font-display text-lg font-bold text-foreground">Acesso restrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Somente administradores podem acessar esta página.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
          Voltar ao início
        </Link>
      </div>
    );
  }

  return <AdminReportsPage />;
}

const REASON_LABEL: Record<string, string> = {
  outdated: "Desatualizado",
  incorrect: "Valor incorreto",
  wrong_product: "Produto errado",
  other: "Outro",
};

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "pending", label: "Pendentes" },
  { key: "reviewed", label: "Em revisão" },
  { key: "resolved", label: "Resolvidos" },
  { key: "rejected", label: "Rejeitados" },
  { key: "all", label: "Todos" },
];

const STATUS_META: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendente", classes: "bg-muted text-muted-foreground" },
  reviewed: { label: "Em revisão", classes: "bg-primary/15 text-primary" },
  resolved: { label: "Resolvido", classes: "bg-savings/15 text-savings" },
  rejected: { label: "Rejeitado", classes: "bg-destructive/10 text-destructive" },
};

function AdminReportsPage() {
  const [filter, setFilter] = useState<string>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-price-reports", filter],
    queryFn: () =>
      listAdminPriceReports({ data: { status: filter === "all" ? null : filter } }),
    staleTime: 10_000,
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, reviewed: 0, resolved: 0, rejected: 0 };
    for (const r of data ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin
          </Link>
          <h1 className="ml-1 font-display text-lg font-bold text-foreground">
            Reportes de preço
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <ScansPurgeButton />
            <EvidenceCleanupButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors " +
                (filter === t.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-primary/40")
              }
            >
              {t.label}
              {t.key !== "all" && counts[t.key] > 0 && (
                <span className="ml-1.5 opacity-70">({counts[t.key]})</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhum reporte {filter !== "all" ? `com status "${filter}"` : ""}.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.map((r) => (
              <AdminReportCard key={r.id} report={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AdminReportCard({ report }: { report: AdminPriceReport }) {
  const qc = useQueryClient();
  const review = useServerFn(reviewPriceReport);
  const getUrl = useServerFn(getReportEvidenceSignedUrl);
  const [status, setStatus] = useState<AdminPriceReport["status"]>(report.status);
  const [action, setAction] = useState<string>(report.actionTaken ?? "");
  const [adminNotes, setAdminNotes] = useState<string>(report.adminNotes ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      review({
        data: {
          id: report.id,
          status: status as "pending" | "reviewed" | "resolved" | "rejected",
          actionTaken: (action || null) as
            | "updated_price"
            | "marked_correct"
            | "no_action"
            | "duplicate"
            | null,
          adminNotes: adminNotes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Reporte atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-price-reports"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha"),
  });

  const openEvidence = async () => {
    if (!report.evidenceUrl) return;
    try {
      const { url } = await getUrl({ data: { path: report.evidenceUrl } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir evidência");
    }
  };

  const meta = STATUS_META[report.status] ?? STATUS_META.pending;

  return (
    <li className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-foreground">
            {report.productName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {report.establishmentName ?? "—"} ·{" "}
            {new Date(report.createdAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Reportado por {report.userEmail ?? "usuário anônimo"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[12.5px] font-bold uppercase tracking-wider ${meta.classes}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-2.5 text-[13px] text-foreground">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            Motivo
          </p>
          <p className="font-semibold">
            {REASON_LABEL[report.reason] ?? report.reason}
          </p>
        </div>
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            Preço na base
          </p>
          <Price as="p" value={report.reportedPrice ?? null} size="md" />
        </div>
        {report.correctPrice != null && (
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-widest text-muted-foreground">
              Preço sugerido
            </p>
            <Price as="p" value={report.correctPrice} size="md" tone="best" />
          </div>
        )}
        {report.productSlug && (
          <div className="col-span-2">
            <Link
              to="/loja/$id/produto/$slug"
              params={{ id: report.establishmentId, slug: report.productSlug }}
              search={{ q: "", from: "" }}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
            >
              Ver produto <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {report.notes && (
        <p className="mt-2 rounded-lg bg-background px-3 py-2 text-[13px] italic text-muted-foreground">
          "{report.notes}"
        </p>
      )}

      {report.evidenceUrl && (
        <button
          type="button"
          onClick={openEvidence}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-semibold text-foreground hover:border-primary hover:text-primary"
        >
          <ExternalLink className="h-3 w-3" />
          Ver evidência
        </button>
      )}

      <div className="mt-4 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[12.5px] text-foreground focus:border-primary focus:outline-none"
          >
            <option value="pending">Pendente</option>
            <option value="reviewed">Em revisão</option>
            <option value="resolved">Resolvido</option>
            <option value="rejected">Rejeitado</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            Ação tomada
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[12.5px] text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">— nenhuma —</option>
            <option value="updated_price">Preço atualizado</option>
            <option value="marked_correct">Preço estava correto</option>
            <option value="no_action">Sem ação</option>
            <option value="duplicate">Duplicado</option>
          </select>
        </div>
      </div>

      <label className="mt-3 mb-1 block text-[12.5px] font-semibold uppercase tracking-widest text-muted-foreground">
        Notas do admin
      </label>
      <textarea
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.target.value)}
        rows={2}
        placeholder="Registro interno da revisão…"
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12.5px] text-foreground focus:border-primary focus:outline-none"
      />

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {mutation.isPending ? "Salvando…" : "Salvar revisão"}
        </button>
      </div>

      {report.resolvedAt && (
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          Última resolução em{" "}
          {new Date(report.resolvedAt).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </li>
  );
}

function EvidenceCleanupButton() {
  const cleanup = useServerFn(cleanupExpiredEvidence);
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    const ok = await confirm({
      title: "Limpar evidências antigas?",
      description:
        "Excluir evidências de reportes resolvidos ou rejeitados há mais de 30 dias.",
      confirmLabel: "Limpar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await cleanup({ data: { olderThanDays: 30 } });
      toast.success(
        `Limpeza concluída: ${res.filesDeleted} arquivo(s) removido(s), ${res.rowsUpdated} reporte(s) atualizado(s).`,
      );
      qc.invalidateQueries({ queryKey: ["admin-price-reports"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na limpeza");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
      title="Excluir evidências antigas (>30 dias) de reportes já finalizados"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Limpar evidências antigas
    </button>
  );
}

function ScansPurgeButton() {
  const purge = useServerFn(purgeUnreferencedScanFiles);
  const { confirm } = useConfirm();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    const ok = await confirm({
      title: "Purgar arquivos não referenciados?",
      description:
        "Todos os arquivos do storage 'scans' sem referência (notas fiscais antigas) serão removidos. Esta ação não pode ser desfeita.",
      confirmLabel: "Purgar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await purge();
      const mb = (res.freedBytes / (1024 * 1024)).toFixed(2);
      toast.success(
        `Purga concluída: ${res.deleted} arquivo(s) removido(s) de ${res.scanned} escaneado(s). ${mb} MB liberados.`,
      );
      if (res.errors.length > 0) toast.warning(`${res.errors.length} erro(s) durante a purga.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na purga");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
      title="Deletar fisicamente arquivos do bucket scans que não são referenciados em nenhum registro"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Purgar scans órfãos
    </button>
  );
}
