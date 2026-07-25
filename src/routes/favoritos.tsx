import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Search, Store, ShoppingBag, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EmptyState } from "@/components/layout/EmptyState";
import { useSession } from "@/hooks/useSession";
import {
  listFavoriteMarkets,
  listFavoriteItems,
} from "@/lib/favorites.functions";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Meus favoritos — PreçoCerto" },
      { name: "description", content: "Seus mercados e produtos favoritos em um só lugar." },
      { property: "og:title", content: "Meus favoritos — PreçoCerto" },
      { property: "og:description", content: "Acompanhe seus mercados e produtos favoritos." },
    ],
  }),
  component: FavoritosPage,
});

function FavoritosPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const listMarkets = useServerFn(listFavoriteMarkets);
  const listItems = useServerFn(listFavoriteItems);

  const { data: markets, isLoading: mLoading } = useQuery({
    queryKey: ["favorite-markets"],
    queryFn: () => listMarkets(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const { data: items, isLoading: iLoading } = useQuery({
    queryKey: ["favorite-items"],
    queryFn: () => listItems(),
    enabled: !!user,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 pt-4 pb-24 sm:pt-8 md:pb-12">
        <header className="mb-4 flex items-center gap-3 sm:mb-6">
          <span
            aria-hidden
            className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/12 text-brand border border-brand/30"
          >
            <Heart className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight sm:text-[26px]">Meus favoritos</h1>
            <p className="text-[13px] text-muted-foreground">
              Mercados e produtos que você acompanha.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted/40" aria-hidden />
        ) : !user ? (
          <EmptyState
            icon={<Heart className="h-6 w-6" />}
            title="Entre para ver seus favoritos"
            description="Salve mercados e produtos para acessar rapidamente aqui."
            action={
              <Link
                to="/login"
                className="inline-flex h-11 items-center rounded-lg bg-brand px-5 text-[14px] font-bold text-brand-foreground shadow-elev-2 outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Fazer login
              </Link>
            }
          />
        ) : (
          <div className="space-y-8">
            {/* Mercados favoritos */}
            <section aria-labelledby="fav-markets-title">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="fav-markets-title" className="flex items-center gap-2 text-[15px] font-bold">
                  <Store className="h-4 w-4 text-brand" aria-hidden /> Mercados
                </h2>
                <Link
                  to="/estabelecimentos"
                  className="text-[12.5px] font-semibold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand/60 rounded"
                >
                  Ver todos
                </Link>
              </div>

              {mLoading ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" aria-hidden />
                  ))}
                </div>
              ) : markets && markets.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {markets.map((m) => (
                    <li key={m.marketName}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate({ to: "/buscar", search: { q: m.marketName } as never })
                        }
                        aria-label={`Buscar preços em ${m.marketName}`}
                        className="group flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-px hover:border-brand/60 hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99]"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand border border-brand/30" aria-hidden>
                          <Store className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">
                            {m.marketName}
                          </span>
                          <span className="block text-[11.5px] text-muted-foreground">
                            Toque para ver preços
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-brand opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<Store className="h-5 w-5" />}
                  title="Nenhum mercado salvo"
                  description="Favorite um mercado tocando na ⭐ dentro da página do estabelecimento."
                  compact
                />
              )}
            </section>

            {/* Produtos favoritos */}
            <section aria-labelledby="fav-items-title">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="fav-items-title" className="flex items-center gap-2 text-[15px] font-bold">
                  <ShoppingBag className="h-4 w-4 text-brand" aria-hidden /> Produtos
                </h2>
                <Link
                  to="/buscar"
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand/60 rounded"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden /> Buscar mais
                </Link>
              </div>

              {iLoading ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" aria-hidden />
                  ))}
                </div>
              ) : items && items.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {items.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate({ to: "/buscar", search: { q: it.name } as never })
                        }
                        aria-label={`Ver preços de ${it.name}`}
                        className="group flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-px hover:border-brand/60 hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99]"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand border border-brand/30" aria-hidden>
                          <ShoppingBag className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">
                            {it.name}
                          </span>
                          {it.best ? (
                            <span className="block text-[11.5px] text-muted-foreground">
                              Melhor: R$ {it.best.price.toFixed(2)} · {it.best.marketName}
                            </span>
                          ) : (
                            <span className="block text-[11.5px] text-muted-foreground">
                              Toque para comparar preços
                            </span>
                          )}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-brand opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<ShoppingBag className="h-5 w-5" />}
                  title="Nenhum produto salvo"
                  description="Favorite um produto na busca para acompanhar variações de preço."
                  compact
                />
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
