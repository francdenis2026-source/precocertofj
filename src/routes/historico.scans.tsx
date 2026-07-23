import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/useSession";
import { listMyScans, type MyScan } from "@/lib/scans-history.functions";
import { PageHeader, SectionCard, StatGrid, type Stat } from "@/components/layout";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/nav/MobileNav";
import { ProductImage } from "@/components/product/ProductImage";
import { verdictLabel } from "@/lib/scan-utils";
import { History, ImageOff, Package, CheckCircle2, Sparkles, Camera } from "lucide-react";

export const Route = createFileRoute("/historico/scans")({
  head: () => ({
    meta: [
      { title: "Meus scans — PreçoCerto" },
      { name: "description", content: "Histórico completo de scans capturados, revisados e salvos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ScansHistoryPage,
});

const STATUS_STYLE: Record<string, string> = {
  capturado: "bg-warning/15 text-warning border-warning/30",
  revisado: "bg-primary/15 text-primary border-primary/30",
  salvo: "bg-neon/15 text-neon border-neon/30",
};

function ScansHistoryPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const fetchScans = useServerFn(listMyScans);
  const [scans, setScans] = useState<MyScan[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/historico/scans" } as never });
      return;
    }
    fetchScans({})
      .then(setScans)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, [user, loading, navigate, fetchScans]);

  const columns: DataTableColumn<MyScan>[] = [
    {
      key: "product",
      header: "Produto",
      accessor: (r) => r.productName ?? "",
      cell: (r) => (
        <Link
          to="/historico/$id"
          params={{ id: r.id }}
          className="flex items-center gap-3 hover:text-primary"
        >
          <ProductImage
            src={r.imageUrl}
            alt={r.productName ?? "scan"}
            width={40}
            height={40}
            fallbackIcon={ImageOff}
            fallbackLabel={r.productName ?? undefined}
            className="h-10 w-10 shrink-0 rounded-md bg-background"
          />
          <span className="truncate text-sm text-foreground">
            {r.productName ?? "Sem nome"}
          </span>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => r.status,
      cell: (r) => (
        <span
          className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${STATUS_STYLE[r.status] ?? ""}`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "price",
      header: "Preço",
      align: "right",
      sortable: true,
      accessor: (r) => r.priceCaptured ?? 0,
      cell: (r) =>
        r.priceCaptured
          ? `R$ ${r.priceCaptured.toFixed(2).replace(".", ",")}`
          : "—",
    },
    {
      key: "verdict",
      header: "Veredito",
      sortable: true,
      accessor: (r) => r.verdict ?? "",
      cell: (r) => (
        <span
          className={`font-mono text-[10px] font-bold uppercase ${
            r.verdict === "barato"
              ? "text-neon"
              : r.verdict === "caro"
                ? "text-destructive"
                : r.verdict === "justo"
                  ? "text-primary"
                  : "text-muted-foreground"
          }`}
        >
          {verdictLabel[r.verdict as "barato" | "justo" | "caro" | "unknown"] ?? r.verdict ?? "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Data",
      align: "right",
      sortable: true,
      accessor: (r) => new Date(r.createdAt).getTime(),
      cell: (r) =>
        new Date(r.createdAt).toLocaleDateString("pt-BR"),
    },
  ];

  const total = scans?.length ?? 0;
  const salvos = scans?.filter((s) => s.status === "salvo").length ?? 0;
  const revisados = scans?.filter((s) => s.status === "revisado").length ?? 0;
  const capturados = scans?.filter((s) => s.status === "capturado").length ?? 0;

  const stats: Stat[] = [
    { label: "Total", value: total, icon: History, tone: "primary" },
    { label: "Salvos", value: salvos, icon: CheckCircle2, tone: "success" },
    { label: "Revisados", value: revisados, icon: Sparkles },
    { label: "Capturados", value: capturados, icon: Camera, tone: "warning" },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Histórico", to: "/historico/scans" }, { label: "Scans" }]}
          title="Meus scans"
          description="Todos os scans capturados, revisados e salvos."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/historico/produtos">
                <Package className="mr-2 h-4 w-4" />
                Meus produtos
              </Link>
            </Button>
          }
        />

        {scans && total > 0 && <StatGrid stats={stats} className="mb-6" />}

        <SectionCard
          title="Lista completa"
          description="Ordene, filtre e pagine seus registros."
          bodyClassName="p-0"
        >
          <div className="p-3 md:p-4">
            <DataTable
              data={scans ?? undefined}
              columns={columns}
              rowKey={(r) => r.id}
              loading={!scans && !err}
              error={err}
              pageSize={20}
              pageSizeOptions={[10, 20, 50, 100]}
              defaultSort={{ key: "date", dir: "desc" }}
              persistKey={`historico.scans:${user?.id ?? "anon"}`}
              emptyTitle="Nenhum scan ainda"
              emptyDescription="Faça seu primeiro scan para vê-lo aqui."
              emptyIcon={<History className="h-6 w-6" />}
              emptyAction={
                <Button asChild variant="default" size="sm">
                  <Link to="/">Fazer scan</Link>
                </Button>
              }
            />
          </div>
        </SectionCard>
      </div>
      <MobileNav />
    </div>
  );
}
