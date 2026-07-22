import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listEstablishmentsByNeighborhood } from "@/lib/scans-history.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { ArrowLeft, MapPin, Store, Loader2, Package } from "lucide-react";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mercados por bairro — PreçoCerto" },
      {
        name: "description",
        content: "Veja os mercados cadastrados organizados por bairro na sua cidade.",
      },
      { property: "og:title", content: "Mercados por bairro — PreçoCerto" },
      {
        property: "og:description",
        content: "Encontre os mercados mais próximos organizados por bairro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NeighborhoodsPage,
});

function NeighborhoodsPage() {
  const fetchNeighborhoods = useServerFn(listEstablishmentsByNeighborhood);
  const { data, isLoading, error } = useQuery({
    queryKey: ["neighborhoods"],
    queryFn: () => fetchNeighborhoods({}),
    staleTime: 60_000,
  });

  const totalMarkets = data?.reduce((n, g) => n + g.establishments.length, 0) ?? 0;

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
        <header className="mb-4 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Voltar"
            className="rounded-full border border-border p-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <h1 className="text-base font-semibold text-foreground">Mercados por bairro</h1>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Encontre os mercados cadastrados na sua região
            </p>
          </div>
        </header>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando bairros...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Não foi possível carregar os bairros: {(error as Error).message}
          </div>
        )}

        {data && data.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhum bairro cadastrado ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Assim que houver mercados cadastrados, eles aparecerão aqui.
            </p>
          </div>
        )}

        {data && data.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="flex-1">
                <p className="text-lg font-bold text-foreground">{data.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Bairros
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex-1">
                <p className="text-lg font-bold text-foreground">{totalMarkets}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Mercados
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {data.map((group) => (
                <section
                  key={group.neighborhood}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <header className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <h2 className="text-sm font-semibold text-foreground">
                          {group.neighborhood}
                        </h2>
                        {group.city && (
                          <p className="text-[10px] text-muted-foreground">{group.city}</p>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {group.establishments.length}{" "}
                      {group.establishments.length === 1 ? "mercado" : "mercados"}
                    </span>
                  </header>

                  <ul className="divide-y divide-border">
                    {group.establishments.map((est) => (
                      <li key={est.id} className="flex items-center gap-3 px-4 py-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
                          style={{
                            backgroundColor: est.brandColor ?? undefined,
                          }}
                        >
                          {est.logoUrl ? (
                            <img
                              src={est.logoUrl}
                              alt={est.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Store className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {est.name}
                          </p>
                          {est.address && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {est.address}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          <Package className="h-3 w-3" />
                          {est.productsCount}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
