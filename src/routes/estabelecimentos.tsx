import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  listPublicEstablishments,
  humanizeCategory,
} from "@/lib/establishments-public.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  PageHeader,
  SectionCard,
  StatGrid,
  EmptyState,
  LoadingSkeleton,
  CardSkeleton,
} from "@/components/layout";
import { MapPin, Package, Sparkles, Store, TrendingUp } from "lucide-react";

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

      <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Início", to: "/" }, { label: "Mercados" }]}
          title="Mercados de Feijó cadastrados"
          description="Cobertura de produtos, categorias mais comuns e comparativo entre estabelecimentos monitorados pela comunidade."
        />

        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-[14px] text-destructive">
            Erro: {(error as Error).message}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <StatGrid
              stats={[
                { label: "Mercados ativos", value: data.totalEstablishments, icon: MapPin, tone: "primary" },
                { label: "Produtos monitorados", value: data.totalProducts, icon: Package, tone: "success" },
                { label: "Categorias mapeadas", value: data.totalCategories, icon: Sparkles },
              ]}
              className="lg:grid-cols-3"
            />

            {data.topGlobalCategories.length > 0 && (
              <SectionCard
                title={
                  <span className="inline-flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
                    Categorias mais populares
                  </span>
                }
                description="Distribuição por número de produtos cadastrados na rede."
              >
                <div className="flex flex-wrap gap-2">
                  {data.topGlobalCategories.map((c) => (
                    <span
                      key={c.category}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[13px] font-medium text-primary"
                    >
                      {humanizeCategory(c.category)}
                      <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[13px] font-bold">
                        {c.count}
                      </span>
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {data.items.length === 0 ? (
              <EmptyState
                icon={Store}
                title="Ainda não há estabelecimentos cadastrados"
                description="Assim que houver mercados na sua região, eles aparecerão aqui."
              />
            ) : (
              <SectionCard
                title="Rede de mercados"
                description={`${data.items.length} ${data.items.length === 1 ? "estabelecimento" : "estabelecimentos"} monitorados.`}
                bodyClassName="p-0"
              >
                <ul
                  className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 md:p-5"
                  aria-label="Lista de estabelecimentos"
                >
                  {data.items.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted"
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
                            <span aria-hidden className="text-[16px] font-bold text-muted-foreground">
                              {e.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[15px] font-semibold text-foreground">{e.name}</h3>
                          <p className="mt-0.5 text-[13px] text-muted-foreground">
                            {[e.neighborhood, e.city, e.state].filter(Boolean).join(" · ") ||
                              "Localização não informada"}
                          </p>
                          <p className="mt-2 text-[13.5px] font-medium text-foreground">
                            <span className="text-primary">{e.productsCount}</span>{" "}
                            <span className="text-muted-foreground">produtos cadastrados</span>
                          </p>
                        </div>
                      </div>
                      {e.topCategories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                          {e.topCategories.map((c) => (
                            <span
                              key={c.category}
                              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[13px] text-foreground"
                            >
                              {humanizeCategory(c.category)}
                              <span className="text-muted-foreground">({c.count})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
      <MobileNav />
      {/* silence unused import */}
      <LoadingSkeleton className="hidden" rows={0} />
    </div>
  );
}
