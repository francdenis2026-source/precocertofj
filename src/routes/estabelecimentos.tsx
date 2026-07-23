import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPublicEstablishments,
  humanizeCategory,
} from "@/lib/establishments-public.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MapPin, Package, Sparkles, TrendingUp } from "lucide-react";
import { ds, dsx } from "@/lib/ds";

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
        content:
          "Rede de mercados com preços monitorados e categorias mais populares.",
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
    <div className="min-h-dvh bg-background pb-24 md:pb-8">
      <SiteHeader variant="solid" />

      <main className={dsx(ds.container, ds.sectionY.md, ds.stack.lg)}>
        <header>
          <p className={ds.type.overline}>Rede local</p>
          <h1 className={dsx(ds.type.h1, "mt-2")}>
            Mercados de Feijó cadastrados
          </h1>
          <p className={dsx(ds.type.subtitle, "mt-3 max-w-2xl")}>
            Cobertura de produtos, categorias mais comuns e comparativo entre
            estabelecimentos monitorados pela comunidade.
          </p>
        </header>

        {isLoading && (
          <div className={dsx(ds.card.padded, "text-center text-sm text-muted-foreground")}>
            Carregando estatísticas…
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Erro: {(error as Error).message}
          </div>
        )}

        {data && (
          <>
            <section className={ds.grid.cols3} aria-label="Visão geral">
              <StatCard icon={MapPin} label="Mercados ativos" value={data.totalEstablishments.toString()} />
              <StatCard icon={Package} label="Produtos monitorados" value={data.totalProducts.toString()} />
              <StatCard icon={Sparkles} label="Categorias mapeadas" value={data.totalCategories.toString()} />
            </section>

            {data.topGlobalCategories.length > 0 && (
              <section className={ds.card.padded} aria-labelledby="cats-title">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
                  <h2 id="cats-title" className={ds.type.h3}>
                    Categorias mais populares
                  </h2>
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

            <section
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
              aria-label="Lista de estabelecimentos"
            >
              {data.items.map((e) => (
                <article key={e.id} className={ds.card.paddedHover}>
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl border border-border bg-muted"
                      style={e.brandColor ? { borderColor: e.brandColor } : undefined}
                    >
                      {e.logoUrl ? (
                        <img
                          src={e.logoUrl}
                          alt={`Logo ${e.name}`}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span aria-hidden className="text-lg font-bold text-muted-foreground">
                          {e.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={dsx(ds.type.title, "truncate")}>{e.name}</h3>
                      <p className={dsx(ds.type.caption, "mt-0.5")}>
                        {[e.neighborhood, e.city, e.state]
                          .filter(Boolean)
                          .join(" · ") || "Localização não informada"}
                      </p>
                      <p className="mt-2 text-[13px] font-medium text-foreground">
                        <span className="text-primary">{e.productsCount}</span>{" "}
                        <span className="text-muted-foreground">
                          produtos cadastrados
                        </span>
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
                          <span className="text-muted-foreground">
                            ({c.count})
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </section>

            {data.items.length === 0 && (
              <div className={dsx(ds.card.padded, "text-center text-sm text-muted-foreground")}>
                Ainda não há estabelecimentos cadastrados.
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
      <MobileNav />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className={ds.card.padded}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />
        <span className={ds.type.overline}>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
