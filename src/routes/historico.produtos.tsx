import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { listMyProductsPage, type MyProduct } from "@/lib/product-detail.functions";
import { PageHeader, SectionCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/nav/MobileNav";
import { ExportMenu } from "@/components/data/ExportMenu";
import type { ExportColumn } from "@/lib/export";
import { TableSkeleton, EmptyState, InlineError, Spinner } from "@/components/feedback";
import { History, Package } from "lucide-react";

export const Route = createFileRoute("/historico/produtos")({
  head: () => ({
    meta: [
      { title: "Meus produtos — PreçoCerto" },
      { name: "description", content: "Produtos que você cadastrou na plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductsHistoryPage,
});

const PAGE_SIZE = 30;

function ProductsHistoryPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const fetchProducts = useServerFn(listMyProductsPage);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: "/historico/produtos" } as never });
    }
  }, [user, loading, navigate]);

  const query = useInfiniteQuery({
    queryKey: ["historico-produtos", user?.id ?? "anon"],
    enabled: !!user,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchProducts({ data: { offset: pageParam as number, limit: PAGE_SIZE } }),
    getNextPageParam: (last) => last.nextOffset,
    staleTime: 30_000,
  });

  const items: MyProduct[] = useMemo(
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

  const columns: ExportColumn<MyProduct>[] = [
    { key: "name", header: "Produto", accessor: (r) => r.name },
    { key: "category", header: "Categoria", accessor: (r) => r.category },
    { key: "unit", header: "Unidade", accessor: (r) => r.unit },
    { key: "ean", header: "EAN", accessor: (r) => r.ean },
    {
      key: "price",
      header: "Preço atual",
      align: "right",
      accessor: (r) => r.currentPrice.toFixed(2).replace(".", ","),
    },
    {
      key: "created",
      header: "Criado em",
      accessor: (r) => new Date(r.createdAt).toLocaleDateString("pt-BR"),
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Histórico", to: "/historico/scans" }, { label: "Produtos" }]}
          title="Meus produtos"
          description="Produtos que você cadastrou no catálogo."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ExportMenu<MyProduct>
                context="meus-produtos"
                columns={columns}
                getRows={() => items}
                meta={{
                  title: "Meus produtos",
                  subtitle: `${items.length} de ${total} registros`,
                  filters: [`Usuário: ${user?.email ?? "—"}`],
                }}
                disabled={items.length === 0}
              />
              <Button asChild variant="outline" size="sm" className="press-sm">
                <Link to="/historico/scans">
                  <History className="mr-2 h-4 w-4 icon-nudge" />
                  Meus scans
                </Link>
              </Button>
            </div>
          }
        />

        <SectionCard
          title="Lista completa"
          description="Rolagem infinita — carregamos mais conforme você desce."
          bodyClassName="p-0"
        >
          <div className="p-3 md:p-4">
            {query.isPending && <TableSkeleton rows={6} columns={4} />}
            {query.isError && (
              <InlineError
                message={
                  query.error instanceof Error ? query.error.message : "Falha ao carregar produtos."
                }
              />
            )}
            {!query.isPending && !query.isError && items.length === 0 && (
              <EmptyState
                icon={Package}
                title="Nenhum produto cadastrado"
                description="Cadastre seu primeiro produto para vê-lo aqui."
                action={
                  <Button asChild variant="default" size="sm">
                    <Link to="/">Cadastrar produto</Link>
                  </Button>
                }
              />
            )}
            {items.length > 0 && (
              <ul className="stagger-children divide-y divide-border" role="list">
                {items.map((r) => (
                  <li key={r.id} className="reveal">
                    <Link
                      to="/produto/$id"
                      params={{ id: r.id }}
                      className="interactive-row flex items-center gap-3 rounded-lg px-2 py-3 focus-ring"
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-capture/10">
                        <Package className="h-5 w-5 text-capture" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-fluid-base font-semibold text-foreground">
                          {r.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {r.category && <span>{r.category}</span>}
                          {r.unit && <span>{r.unit}</span>}
                          {r.ean && (
                            <span className="font-mono text-[11px]">EAN {r.ean}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-fluid-lg font-bold tabular-nums text-capture">
                          R$ {r.currentPrice.toFixed(2).replace(".", ",")}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString("pt-BR")}
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
                    <Package className="mr-2 h-4 w-4 icon-nudge" />
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
