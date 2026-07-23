import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { listMyScansPage, type MyScan } from "@/lib/scans-history.functions";
import { PageHeader, SectionCard, StatGrid, type Stat } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/nav/MobileNav";
import { ProductImage } from "@/components/product/ProductImage";
import { ExportMenu } from "@/components/data/ExportMenu";
import type { ExportColumn } from "@/lib/export";
import { verdictLabel } from "@/lib/scan-utils";
import { TableSkeleton, EmptyState, InlineError, Spinner } from "@/components/feedback";
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

const PAGE_SIZE = 30;

function ScansHistoryPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const fetchScans = useServerFn(listMyScansPage);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: "/historico/scans" } as never });
    }
  }, [user, loading, navigate]);

  const query = useInfiniteQuery({
    queryKey: ["historico-scans", user?.id ?? "anon"],
    enabled: !!user,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchScans({ data: { offset: pageParam as number, limit: PAGE_SIZE } }),
    getNextPageParam: (last) => last.nextOffset,
    staleTime: 30_000,
  });

  const items: MyScan[] = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? items.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !query.hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [query]);

  const salvos = items.filter((s) => s.status === "salvo").length;
  const revisados = items.filter((s) => s.status === "revisado").length;
  const capturados = items.filter((s) => s.status === "capturado").length;

  const stats: Stat[] = [
    { label: "Total", value: total, icon: History, tone: "primary" },
    { label: "Salvos", value: salvos, icon: CheckCircle2, tone: "success" },
    { label: "Revisados", value: revisados, icon: Sparkles },
    { label: "Capturados", value: capturados, icon: Camera, tone: "warning" },
  ];

  const columns: ExportColumn<MyScan>[] = [
    { key: "productName", header: "Produto", accessor: (r) => r.productName ?? "" },
    { key: "market", header: "Estabelecimento", accessor: (r) => r.marketName ?? "" },
    {
      key: "price",
      header: "Preço",
      align: "right",
      accessor: (r) =>
        r.priceCaptured != null ? r.priceCaptured.toFixed(2).replace(".", ",") : "",
    },
    { key: "status", header: "Status", accessor: (r) => r.status },
    { key: "verdict", header: "Veredito", accessor: (r) => r.verdict ?? "" },
    {
      key: "date",
      header: "Data",
      accessor: (r) => new Date(r.createdAt).toLocaleString("pt-BR"),
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Histórico", to: "/historico/scans" }, { label: "Scans" }]}
          title="Meus scans"
          description="Todos os scans capturados, revisados e salvos."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ExportMenu<MyScan>
                context="meus-scans"
                columns={columns}
                getRows={() => items}
                meta={{
                  title: "Meus scans",
                  subtitle: `${items.length} de ${total} registros`,
                  filters: [`Usuário: ${user?.email ?? "—"}`],
                }}
                disabled={items.length === 0}
              />
              <Button asChild variant="outline" size="sm" className="press-sm">
                <Link to="/historico/produtos">
                  <Package className="mr-2 h-4 w-4 icon-nudge" />
                  Meus produtos
                </Link>
              </Button>
            </div>
          }
        />

        {items.length > 0 && <StatGrid stats={stats} className="mb-6" />}

        <SectionCard
          title="Lista completa"
          description="Rolagem infinita — carregamos mais conforme você desce."
          bodyClassName="p-0"
        >
          <div className="p-3 md:p-4">
            {query.isPending && <TableSkeleton rows={6} columns={5} />}
            {query.isError && (
              <InlineError
                message={
                  query.error instanceof Error ? query.error.message : "Falha ao carregar scans."
                }
              />
            )}
            {!query.isPending && !query.isError && items.length === 0 && (
              <EmptyState
                icon={History}
                title="Nenhum scan ainda"
                message="Faça seu primeiro scan para vê-lo aqui."
                action={
                  <Button asChild variant="default" size="sm">
                    <Link to="/">Fazer scan</Link>
                  </Button>
                }
              />
            )}
            {items.length > 0 && (
              <ul className="stagger-children divide-y divide-border" role="list">
                {items.map((r) => (
                  <li key={r.id} className="reveal">
                    <Link
                      to="/historico/$id"
                      params={{ id: r.id }}
                      className="interactive-row flex items-center gap-3 rounded-lg px-2 py-3 focus-ring"
                    >
                      <ProductImage
                        src={r.imageUrl}
                        alt={r.productName ?? "scan"}
                        width={44}
                        height={44}
                        fallbackIcon={ImageOff}
                        fallbackLabel={r.productName ?? undefined}
                        className="h-11 w-11 shrink-0 rounded-md bg-background"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-fluid-base font-semibold text-foreground">
                          {r.productName ?? "Sem nome"}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${STATUS_STYLE[r.status] ?? ""}`}
                          >
                            {r.status}
                          </span>
                          {r.marketName && <span className="truncate">{r.marketName}</span>}
                          <span>{new Date(r.createdAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-fluid-lg font-bold tabular-nums text-foreground">
                          {r.priceCaptured != null
                            ? `R$ ${r.priceCaptured.toFixed(2).replace(".", ",")}`
                            : "—"}
                        </div>
                        <div
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
                          {verdictLabel[
                            r.verdict as "barato" | "justo" | "caro" | "unknown"
                          ] ?? r.verdict ?? "—"}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div ref={sentinelRef} aria-hidden="true" className="h-1" />

            {query.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="press-sm"
                  onClick={() => void query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage ? (
                    <Spinner className="mr-2" />
                  ) : (
                    <History className="mr-2 h-4 w-4 icon-nudge" />
                  )}
                  Carregar mais
                </Button>
              </div>
            )}
            {!query.hasNextPage && items.length > 0 && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Fim da lista • {items.length} de {total}
              </p>
            )}
          </div>
        </SectionCard>
      </div>
      <MobileNav />
    </div>
  );
}
