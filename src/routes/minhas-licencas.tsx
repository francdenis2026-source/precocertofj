import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PriceCents, formatCentsText } from "@/components/ds/PriceCents";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Send, Ticket, ArrowRight, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { listMyLicenses, requestMyLicenseResend } from "@/lib/licenses.functions";

export const Route = createFileRoute("/minhas-licencas")({
  head: () => ({
    meta: [
      { title: "Minhas licenças — PreçoCerto" },
      { name: "description", content: "Veja e gerencie seus códigos de licença ativos, expirações e planos contratados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MinhasLicencas,
});

type LicenseRow = Awaited<ReturnType<typeof listMyLicenses>>[number];

/** Texto puro em BRL — usar só em exportações/aria-labels (a UI usa <PriceCents />). */
const brl = formatCentsText;

function statusMeta(s: string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    paid: { label: "Disponível", variant: "default" },
    redeemed: { label: "Ativa", variant: "default" },
    pending: { label: "Aguardando", variant: "secondary" },
    revoked: { label: "Revogada", variant: "destructive" },
    expired: { label: "Expirada", variant: "outline" },
  };
  return map[s] ?? { label: s, variant: "secondary" };
}

function MinhasLicencas() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listMyLicenses);
  const resendFn = useServerFn(requestMyLicenseResend);
  const qc = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
  });
  const hasSession = !!sessionQuery.data;
  const userId = sessionQuery.data?.user.id;

  useEffect(() => {
    if (sessionQuery.isPending) return;
    if (!hasSession) navigate({ to: "/login", search: { redirect: "/minhas-licencas" } as never });
  }, [sessionQuery.isPending, hasSession, navigate]);

  const { data: list, isLoading, error, refetch } = useQuery({
    queryKey: ["my-licenses"],
    queryFn: () => fetchList(),
    enabled: hasSession,
  });

  const resend = useMutation({
    mutationFn: async (licenseId: string) => resendFn({ data: { licenseId } }),
    onSuccess: (r) => {
      toast.success(`Código enviado: ${r.code}`, { duration: 15000 });
      qc.invalidateQueries({ queryKey: ["my-licenses"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao solicitar"),
  });

  const columns: DataTableColumn<LicenseRow>[] = [
    {
      key: "code",
      header: "Código",
      sortable: true,
      accessor: (r) => r.code,
      cell: (r) => (
        <span className="font-mono text-[12.5px] font-semibold tracking-tight text-foreground">
          {r.code}
        </span>
      ),
    },
    {
      key: "plan",
      header: "Plano",
      sortable: true,
      accessor: (r) => r.plan_name ?? "",
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-foreground">
            {r.plan_name ?? "—"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {r.plan_days ? `${r.plan_days} dias` : "—"} ·{" "}
            <PriceCents cents={r.price_cents} size="xs" tone="muted" zeroWhenEmpty />
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => r.status,
      cell: (r) => {
        const m = statusMeta(r.status);
        return <Badge variant={m.variant}>{m.label}</Badge>;
      },
    },
    {
      key: "expires",
      header: "Validade",
      align: "right",
      sortable: true,
      accessor: (r) => new Date(r.expires_at),
      cell: (r) => {
        const d = new Date(r.expires_at);
        const active = r.status === "redeemed" && d.getTime() > Date.now();
        return (
          <div className="text-right">
            <div className="font-mono text-[12.5px] text-foreground">
              {d.toLocaleDateString("pt-BR")}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {active ? "válida" : "expira"}
              {r.redeemed_at && ` · resg. ${new Date(r.redeemed_at).toLocaleDateString("pt-BR")}`}
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "160px",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost-navy"
            onClick={() => {
              navigator.clipboard.writeText(r.code);
              toast.success("Código copiado");
            }}
            aria-label="Copiar código"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost-navy"
            disabled={resend.isPending}
            onClick={() => resend.mutate(r.id)}
            aria-label="Reenviar código por e-mail"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Conta · Licenças"
        title="Minhas licenças"
        description="Códigos que você comprou ou resgatou, plano contratado e validade."
        breadcrumbs={[{ label: "Minhas licenças" }]}
        icon={<KeyRound className="h-4 w-4" />}
        goldRule
        actions={
          <Button asChild variant="executive" size="sm">
            <Link to="/resgatar">
              <Ticket className="mr-1.5 h-4 w-4" /> Resgatar código
            </Link>
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <DataTable<LicenseRow>
          data={list}
          columns={columns}
          rowKey={(r) => r.id}
          loading={isLoading}
          error={error as Error | null}
          onRetry={() => refetch()}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          defaultSort={{ key: "expires", dir: "desc" }}
          persistKey={`my-licenses:${userId ?? "anon"}`}
          density="regular"
          emptyIcon={<Ticket className="h-5 w-5" />}
          emptyTitle="Você ainda não tem licenças"
          emptyDescription="Ao comprar ou resgatar um plano, seu histórico aparece aqui."
          emptyAction={
            <Button asChild variant="executive" size="sm">
              <Link to="/resgatar">
                Tenho um código <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        />
      </div>
    </AppShell>
  );
}
