import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicEstablishments, humanizeCategory } from "@/lib/establishments-public.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { ArrowLeft, MapPin, Package, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/estabelecimentos")({
  head: () => ({
    meta: [
      { title: "Estabelecimentos com preços atualizados — PreçoCerto" },
      {
        name: "description",
        content:
          "Veja quantos produtos cada mercado tem cadastrado, quais são as categorias mais comuns e onde encontrar os melhores preços em Feijó/AC.",
      },
      { property: "og:title", content: "Mercados parceiros — PreçoCerto" },
      {
        property: "og:description",
        content: "Rede de mercados com preços monitorados e categorias mais populares.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstablishmentsPage,
});

function EstablishmentsPage() {
  const fetchList = useServerFn(listPublicEstablishments);
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-establishments"],
    queryFn: () => fetchList({}),
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-foreground">Estabelecimentos</h1>
            <p className="text-[11px] text-muted-foreground">Cobertura de produtos e categorias</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {isLoading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando estatísticas...
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Erro: {(error as Error).message}
          </div>
        )}

        {data && (
          <>
            {/* Overview cards */}
            <section className="grid gap-3 sm:grid-cols-3">
              <StatCard icon={MapPin} label="Mercados ativos" value={data.totalEstablishments.toString()} />
              <StatCard icon={Package} label="Produtos monitorados" value={data.totalProducts.toString()} />
              <StatCard icon={Sparkles} label="Categorias mapeadas" value={data.totalCategories.toString()} />
            </section>

            {/* Top categories global */}
            {data.topGlobalCategories.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Categorias mais populares</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.topGlobalCategories.map((c) => (
                    <span
                      key={c.category}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {humanizeCategory(c.category)}
                      <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold">
                        {c.count}
                      </span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Establishment list */}
            <section className="grid gap-4 md:grid-cols-2">
              {data.items.map((e) => (
                <article
                  key={e.id}
                  className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl border border-border bg-muted"
                      style={e.brandColor ? { borderColor: e.brandColor } : undefined}
                    >
                      {e.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.logoUrl} alt={e.name} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {e.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-foreground">{e.name}</h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {[e.neighborhood, e.city, e.state].filter(Boolean).join(" · ") || "Localização não informada"}
                      </p>
                      <p className="mt-2 text-[13px] font-medium text-foreground">
                        <span className="text-primary">{e.productsCount}</span>{" "}
                        <span className="text-muted-foreground">produtos cadastrados</span>
                      </p>
                    </div>
                  </div>
                  {e.topCategories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                      {e.topCategories.map((c) => (
                        <span
                          key={c.category}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-foreground"
                        >
                          {humanizeCategory(c.category)}
                          <span className="text-muted-foreground">({c.count})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </section>

            {data.items.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Ainda não há estabelecimentos cadastrados.
              </div>
            )}
          </>
        )}
      </main>

      <MobileNav />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
