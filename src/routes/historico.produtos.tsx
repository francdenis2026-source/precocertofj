import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/useSession";
import { listMyProducts, type MyProduct } from "@/lib/product-detail.functions";
import { PageHeader, SectionCard } from "@/components/layout";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/nav/MobileNav";
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

function ProductsHistoryPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const fetchProducts = useServerFn(listMyProducts);
  const [products, setProducts] = useState<MyProduct[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/historico/produtos" } as never });
      return;
    }
    fetchProducts({})
      .then(setProducts)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, [user, loading, navigate, fetchProducts]);

  const columns: DataTableColumn<MyProduct>[] = [
    {
      key: "name",
      header: "Produto",
      sortable: true,
      accessor: (r) => r.name,
      cell: (r) => (
        <Link
          to="/produto/$id"
          params={{ id: r.id }}
          className="flex items-center gap-3 hover:text-primary"
        >
          <div className="grid h-10 w-10 place-items-center rounded-md bg-capture/10">
            <Package className="h-4 w-4 text-capture" strokeWidth={1.5} />
          </div>
          <span className="truncate text-sm text-foreground">{r.name}</span>
        </Link>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      sortable: true,
      accessor: (r) => r.category,
    },
    {
      key: "unit",
      header: "Unidade",
      sortable: true,
      accessor: (r) => r.unit,
    },
    {
      key: "ean",
      header: "EAN",
      accessor: (r) => r.ean,
      cell: (r) => <span className="font-mono text-[11px]">{r.ean}</span>,
    },
    {
      key: "price",
      header: "Preço atual",
      align: "right",
      sortable: true,
      accessor: (r) => r.currentPrice,
      cell: (r) => (
        <span className="font-mono font-bold text-capture">
          R$ {r.currentPrice.toFixed(2).replace(".", ",")}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[
            { label: "Histórico", to: "/historico/scans" },
            { label: "Produtos" },
          ]}
          title="Meus produtos"
          description="Produtos que você cadastrou no catálogo."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/historico/scans">
                <History className="mr-2 h-4 w-4" />
                Meus scans
              </Link>
            </Button>
          }
        />

        <SectionCard
          title="Lista completa"
          description="Ordene, filtre e pagine seus produtos."
          bodyClassName="p-0"
        >
          <div className="p-3 md:p-4">
            <DataTable
              data={products ?? undefined}
              columns={columns}
              rowKey={(r) => r.id}
              loading={!products && !err}
              error={err}
              pageSize={20}
              pageSizeOptions={[10, 20, 50, 100]}
              defaultSort={{ key: "name", dir: "asc" }}
              persistKey={`historico.produtos:${user?.id ?? "anon"}`}
              emptyTitle="Nenhum produto cadastrado"
              emptyDescription="Cadastre seu primeiro produto para vê-lo aqui."
              emptyIcon={<Package className="h-6 w-6" />}
              emptyAction={
                <Button asChild variant="default" size="sm">
                  <Link to="/">Cadastrar produto</Link>
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
